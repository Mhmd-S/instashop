// WCAG relative-luminance + contrast helpers for theme repair.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function channel(c: number): number {
  const s = c / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const hi = Math.max(la, lb)
  const lo = Math.min(la, lb)
  return (hi + 0.05) / (lo + 0.05)
}

// Best readable foreground (near-white or near-black) for a background.
export function bestOn(bg: string): string {
  return contrastRatio('#ffffff', bg) >= contrastRatio('#111111', bg) ? '#ffffff' : '#111111'
}

// Keep fg if it already meets the ratio on bg; otherwise fall back to the best
// readable near-black/near-white.
export function fixOn(fg: string, bg: string, ratio = 4.5): string {
  return contrastRatio(fg, bg) >= ratio ? fg : bestOn(bg)
}
