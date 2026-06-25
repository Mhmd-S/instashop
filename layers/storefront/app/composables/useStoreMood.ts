import type { DesignTokens } from '~~/shared/types/theme'

// Translates the store's theme `mood` tags into concrete layout decisions, so the
// storefront's rhythm and emphasis adapt per store — loud and punchy for a `bold`
// shop, hushed and editorial for a `luxury` one — on top of the palette/font theming
// that already applies via CSS variables. Mirrors useStoreCta(): one theme dimension
// that can't be expressed as a CSS var, surfaced as ready-to-bind class bundles.
//
// The 15 allowed moods collapse into four presentation archetypes ("vibes"). We score
// every tag, then pick the dominant archetype (ties broken by the PRIORITY order).
export type StoreVibe = 'luxury' | 'bold' | 'minimal' | 'modern'

export interface StorePresentation {
  vibe: StoreVibe
  // Louder accents, filled badges, energetic motion. Only the `bold` vibe sets this.
  expressive: boolean
  hero: {
    section: string // vertical padding (rhythm)
    align: 'left' | 'center'
    eyebrow: string // the small uppercase kicker
    heading: string // <h1> scale + weight
    rule: string // the signature divider under the heading
  }
  // Section kicker ("— Shop by category"): label classes + whether to draw the rule.
  eyebrow: { label: string; rule: boolean }
  // Product card treatment.
  card: {
    framed: boolean // bordered card vs. bare gallery tile
    align: 'left' | 'center'
    aspect: string // image aspect ratio
    price: string // price colour/weight
  }
}

// Each mood contributes weight to one or more archetypes. Absent moods (e.g. a store
// with no theme) leave every score at 0 → the `modern` baseline.
const MOOD_WEIGHTS: Record<string, Partial<Record<StoreVibe, number>>> = {
  luxury: { luxury: 2 },
  elegant: { luxury: 2 },
  vintage: { luxury: 1 },
  monochrome: { luxury: 1 },
  earthy: { luxury: 1 },
  rustic: { luxury: 1 },
  bold: { bold: 2 },
  vibrant: { bold: 2 },
  playful: { bold: 1 },
  warm: { bold: 1 },
  minimal: { minimal: 2 },
  cool: { minimal: 1 },
  techy: { minimal: 1 },
  pastel: { minimal: 1 },
  modern: { modern: 1 },
}

// Lower index wins a tie.
const PRIORITY: StoreVibe[] = ['luxury', 'bold', 'minimal', 'modern']

// Exported so useStoreArtDirection() can derive sensible structural defaults from mood
// when a theme predates the explicit artDirection block.
export function pickVibe(mood: DesignTokens['mood'] | null): StoreVibe {
  if (!mood?.length) return 'modern'
  const score: Record<StoreVibe, number> = { luxury: 0, bold: 0, minimal: 0, modern: 0 }
  for (const tag of mood) {
    const w = MOOD_WEIGHTS[tag]
    if (!w) continue
    for (const k in w) score[k as StoreVibe] += w[k as StoreVibe]!
  }
  let best: StoreVibe = 'modern'
  let bestScore = -1
  for (const v of PRIORITY) {
    if (score[v] > bestScore) {
      best = v
      bestScore = score[v]
    }
  }
  return bestScore <= 0 ? 'modern' : best
}

export const VIBE_PRESETS: Record<StoreVibe, StorePresentation> = {
  // Editorial & hushed: roomy, centred, fine tracking, a hairline rule.
  luxury: {
    vibe: 'luxury',
    expressive: false,
    hero: {
      section: 'py-20 sm:py-28',
      align: 'center',
      eyebrow: 'text-xs font-semibold uppercase tracking-[0.28em]',
      heading: 'text-5xl font-semibold leading-[0.98] sm:text-7xl',
      rule: 'h-px w-20 bg-accent/70',
    },
    eyebrow: { label: 'text-xs font-semibold uppercase tracking-[0.28em]', rule: true },
    card: { framed: false, align: 'center', aspect: 'aspect-[4/5]', price: 'text-muted' },
  },
  // Loud retail: tighter rhythm, huge left-set headline, a chunky brand rule.
  bold: {
    vibe: 'bold',
    expressive: true,
    hero: {
      section: 'py-16 sm:py-24',
      align: 'left',
      eyebrow: 'text-xs font-bold uppercase tracking-[0.14em]',
      heading: 'text-5xl font-bold leading-[0.9] sm:text-7xl',
      rule: 'h-1.5 w-16 rounded-full bg-primary',
    },
    eyebrow: { label: 'text-xs font-bold uppercase tracking-[0.14em]', rule: true },
    card: { framed: true, align: 'left', aspect: 'aspect-square', price: 'font-bold text-accent' },
  },
  // Restrained & product-forward: compact, left-set, no decorative rule.
  minimal: {
    vibe: 'minimal',
    expressive: false,
    hero: {
      section: 'py-12 sm:py-16',
      align: 'left',
      eyebrow: 'text-[0.7rem] font-medium uppercase tracking-[0.2em]',
      heading: 'text-4xl font-medium leading-[1.02] tracking-tight sm:text-6xl',
      rule: 'h-px w-12 bg-[var(--ui-border)]',
    },
    eyebrow: { label: 'text-[0.7rem] font-medium uppercase tracking-[0.2em]', rule: false },
    card: { framed: false, align: 'left', aspect: 'aspect-square', price: 'font-medium text-default' },
  },
  // Balanced default for stores with no strong mood signal.
  modern: {
    vibe: 'modern',
    expressive: false,
    hero: {
      section: 'py-14 sm:py-20',
      align: 'center',
      eyebrow: 'text-xs font-semibold uppercase tracking-[0.2em]',
      heading: 'text-5xl font-semibold leading-[0.95] sm:text-7xl',
      rule: 'h-1.5 w-16 rounded-full bg-primary',
    },
    eyebrow: { label: 'text-xs font-semibold uppercase tracking-[0.2em]', rule: true },
    card: { framed: true, align: 'left', aspect: 'aspect-square', price: 'font-semibold text-primary' },
  },
}

export function useStoreMood() {
  const { state } = useTenant()
  return computed<StorePresentation>(() => VIBE_PRESETS[pickVibe(state.value.mood)])
}
