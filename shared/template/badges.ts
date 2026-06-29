import type { PromiseBadge } from '~~/shared/types/template'

// Fixed icon + label pairs for the `marquee` and `promise` sections. The seller (or
// Gemini) picks a badge id from the allowlist; the icon + wording live here, never
// in config — so no free text or arbitrary icon name reaches the DOM (H6). Icons are
// Lucide names available through the @nuxt/ui icon set.
export interface ResolvedBadge {
  icon: string
  label: string
}

export const PROMISE_BADGES: Record<PromiseBadge, ResolvedBadge> = {
  'free-shipping': { icon: 'i-lucide-truck', label: 'Free shipping' },
  'easy-returns': { icon: 'i-lucide-rotate-ccw', label: 'Easy returns' },
  'secure-checkout': { icon: 'i-lucide-shield-check', label: 'Secure checkout' },
  handmade: { icon: 'i-lucide-sparkles', label: 'Handmade' },
  'ships-worldwide': { icon: 'i-lucide-globe', label: 'Ships worldwide' },
  'small-batch': { icon: 'i-lucide-package', label: 'Small batch' },
  'sustainably-made': { icon: 'i-lucide-leaf', label: 'Sustainably made' },
  'gift-wrap': { icon: 'i-lucide-gift', label: 'Gift wrapping' },
  'five-star': { icon: 'i-lucide-star', label: 'Five-star rated' },
  'new-weekly': { icon: 'i-lucide-calendar-days', label: 'New styles weekly' },
}

export function resolveBadge(badge: PromiseBadge): ResolvedBadge {
  return PROMISE_BADGES[badge] ?? PROMISE_BADGES['free-shipping']
}
