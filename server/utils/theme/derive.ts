import type { DesignTokens, NeutralScale } from '~~/shared/types/theme'

// HSL helpers (pure). Hue in [0,360), s/l in [0,1].
function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const mx = Math.max(r, g, b)
  const mn = Math.min(r, g, b)
  const l = (mx + mn) / 2
  let s = 0
  let hue = 0
  if (mx !== mn) {
    const d = mx - mn
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
    if (mx === r) hue = ((g - b) / d + (g < b ? 6 : 0)) * 60
    else if (mx === g) hue = ((b - r) / d + 2) * 60
    else hue = ((r - g) / d + 4) * 60
  }
  return [hue, s, l]
}
function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(1, s))
  l = Math.max(0, Math.min(1, l))
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  const to = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// Normalize a raw extracted brand color into a usable UI tone: keep its hue (orange
// stays orange) but pull saturation/lightness into a button-friendly band.
function usableTone(hex: string, sLo: number, sHi: number, lLo: number, lHi: number): string {
  const [h, s, l] = hexToHsl(hex)
  return hslToHex(h, clamp(s, sLo, sHi), clamp(l, lLo, lHi))
}

export interface BrandSeeds {
  primary: string
  secondary?: string | null // a genuine second brand color from the logo, if any
  accent?: string | null // a genuine third brand color, if any
}

// Build an accessible, harmonious palette seeded from the logo's brand color(s).
// When the logo has a real second/third color (e.g. navy + orange), those become the
// secondary/accent verbatim (normalized to usable tones); only a single-color logo
// falls back to deriving them from the primary's hue. Produces every palette field
// except onPrimary/onSecondary/onAccent — those (and the final fg/muted contrast
// check) are computed by validateAndRepair downstream.
export function derivePaletteFromBrand(
  brand: BrandSeeds,
  opts: { bgIsTransparent?: boolean } = {},
): Partial<DesignTokens['palette']> {
  const [h, s0, lBrand] = hexToHsl(brand.primary)
  const s = clamp(s0, 0.35, 0.9) // usable saturation for a primary

  // Primary: keep the brand hue, clamp lightness into a button-friendly band.
  const primary = hslToHex(h, s, clamp(lBrand, 0.28, 0.62))

  // Secondary: prefer the logo's actual second color; otherwise a muted tint of the
  // primary hue.
  const secondary = brand.secondary
    ? usableTone(brand.secondary, 0.3, 0.9, 0.3, 0.6)
    : hslToHex(h, clamp(s * 0.55, 0.18, 0.6), clamp(lBrand - 0.06, 0.24, 0.5))

  // Accent: the logo's third color if present; else its second color as a vivid pop;
  // else the complementary hue.
  const accent = brand.accent
    ? usableTone(brand.accent, 0.45, 0.95, 0.42, 0.62)
    : brand.secondary
      ? usableTone(brand.secondary, 0.5, 0.95, 0.45, 0.6)
      : hslToHex(h + 180, clamp(Math.max(s, 0.6), 0.5, 0.95), 0.52) // complementary pop

  const bg = opts.bgIsTransparent ? '#ffffff' : hslToHex(h, 0.08, 0.985)
  const card = '#ffffff'
  const border = hslToHex(h, 0.12, 0.9)
  const fg = hslToHex(h, 0.18, 0.12) // dark hue-tinted ink (contrast-checked later)
  const muted = hslToHex(h, 0.1, 0.42)

  // Hue-tinted neutral ramp 50..950.
  const steps: Array<[keyof NeutralScale, number]> = [
    ['50', 0.985], ['100', 0.96], ['200', 0.9], ['300', 0.83], ['400', 0.64],
    ['500', 0.5], ['600', 0.42], ['700', 0.34], ['800', 0.24], ['900', 0.15], ['950', 0.08],
  ]
  const neutral = {} as NeutralScale
  for (const [k, l] of steps) neutral[k] = hslToHex(h, 0.06, l)

  return { primary, secondary, accent, bg, card, border, fg, muted, neutral }
}
