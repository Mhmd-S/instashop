import sharp from 'sharp'

export interface BrandColors {
  primary: string // #rrggbb — the logo's dominant brand color
  secondary: string | null // a genuinely distinct second brand color, if the logo has one
  accent: string | null // a distinct third brand color, if any
  bgIsTransparent: boolean
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
}
function rgbHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}
function saturation(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b)
  if (mx === 0) return 0
  return (mx - Math.min(r, g, b)) / mx
}
function hueOf(r: number, g: number, b: number): number {
  const mx = Math.max(r, g, b)
  const d = mx - Math.min(r, g, b)
  if (d === 0) return 0
  let h: number
  if (mx === r) h = ((g - b) / d) % 6
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return (((h * 60) % 360) + 360) % 360
}
function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

const HUE_BINS = 12 // 30° each — wide enough that shades of one brand color don't split
const BIN_DEG = 360 / HUE_BINS
const MIN_SAT = 0.15 // ignore near-grey pixels when finding brand hues
const MIN_HUE_SEP = 40 // a secondary/accent must differ from earlier picks by this many degrees
const MIN_REL_WEIGHT = 0.06 // ...and carry at least this fraction of the dominant hue's weight

interface Bin {
  weight: number
  r: number
  g: number
  b: number
}

// Extract a logo's BRAND colors, deterministically, with no network. Strategy: drop
// transparent + near-white + near-black pixels, then cluster the remaining saturated
// pixels by HUE (vivid colors weighted more) — so a navy + orange logo yields BOTH
// navy (primary) and orange (secondary), instead of one color with the rest invented
// by hue math. `secondary`/`accent` are only returned when the logo genuinely has
// distinct, well-represented additional colors. Falls back to the dominant non-extreme
// tone for grayscale logos. Returns null if the image can't be read.
export async function extractBrandColor(buf: Buffer): Promise<BrandColors | null> {
  try {
    const { data, info } = await sharp(buf)
      .ensureAlpha()
      .resize(64, 64, { fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true })
    const ch = info.channels

    let transparent = 0
    let total = 0
    const bins: Bin[] = Array.from({ length: HUE_BINS }, () => ({ weight: 0, r: 0, g: 0, b: 0 }))
    const fallback = new Map<number, Bin>() // non-extreme tones, used only for grayscale logos

    for (let i = 0; i < data.length; i += ch) {
      total++
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const a = ch >= 4 ? data[i + 3]! : 255
      if (a < 128) {
        transparent++
        continue
      }
      const mx = Math.max(r, g, b)
      const mn = Math.min(r, g, b)
      if (mx > 240 && mn > 240) continue // near-white
      if (mx < 16) continue // near-black

      const fkey = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const fb = fallback.get(fkey) ?? { weight: 0, r: 0, g: 0, b: 0 }
      fb.weight++
      fb.r += r
      fb.g += g
      fb.b += b
      fallback.set(fkey, fb)

      const sat = saturation(r, g, b)
      if (sat < MIN_SAT) continue
      const w = 1 + sat * 2 // weight vivid colors more
      const bin = bins[Math.min(HUE_BINS - 1, Math.floor(hueOf(r, g, b) / BIN_DEG))]!
      bin.weight += w
      bin.r += r * w
      bin.g += g * w
      bin.b += b * w
    }

    const bgIsTransparent = total > 0 && transparent / total > 0.3

    // Rank hue clusters by weight; each cluster's representative is its (vividness-
    // weighted) centroid color.
    const ranked = bins
      .filter((bn) => bn.weight > 0)
      .map((bn) => {
        const r = bn.r / bn.weight
        const g = bn.g / bn.weight
        const b = bn.b / bn.weight
        return { weight: bn.weight, hue: hueOf(r, g, b), color: rgbHex(r, g, b) }
      })
      .sort((x, y) => y.weight - x.weight)

    if (!ranked.length) {
      // Grayscale logo: no saturated hue to cluster — use the dominant non-extreme tone.
      let best: Bin | null = null
      for (const e of fallback.values()) if (!best || e.weight > best.weight) best = e
      if (!best) return null
      return { primary: rgbHex(best.r / best.weight, best.g / best.weight, best.b / best.weight), secondary: null, accent: null, bgIsTransparent }
    }

    // Greedily pick up to 3 brand colors that are each hue-distinct and well-represented.
    const top = ranked[0]!
    const picks = [top]
    for (const cand of ranked.slice(1)) {
      if (cand.weight < top.weight * MIN_REL_WEIGHT) break // sorted desc → nothing later qualifies
      if (picks.every((p) => hueDist(p.hue, cand.hue) >= MIN_HUE_SEP)) picks.push(cand)
      if (picks.length >= 3) break
    }

    return {
      primary: top.color,
      secondary: picks[1]?.color ?? null,
      accent: picks[2]?.color ?? null,
      bgIsTransparent,
    }
  } catch (e) {
    console.error('[theme] logo color extraction failed', (e as Error)?.message)
    return null
  }
}
