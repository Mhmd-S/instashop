import type { ArtDirection } from '~~/shared/types/theme'
import { pickVibe, VIBE_PRESETS, type StoreVibe } from './useStoreMood'

// Translates the store's structural `artDirection` enums (chosen by the art-direction
// model from the shop's post identity) into concrete, ready-to-bind class bundles — the
// JS-side counterpart to the palette/font theming that applies via CSS variables.
//
// This is what makes two different shops render as genuinely different sites: the hero
// COMPOSITION, the product-card TREATMENT, the section ORDER, and the display-type
// PERSONALITY (feel/scale, via --t-heading-* / --t-leading-* CSS vars) all flex per
// store. Mood (useStoreMood) still supplies the expressive accent + eyebrow voice.
//
// When a theme predates the artDirection block (older DB rows), we derive a sensible
// default from the store's mood so nothing renders blank.

export interface HeroPresentation {
  variant: ArtDirection['hero']
  section: string // vertical rhythm (driven by the layout archetype)
  align: 'left' | 'center'
  eyebrow: string // kicker classes (from mood)
  heading: string // <h1> classes — size + the feel/scale display treatment
  rule: string // the signature divider under the heading
  overlay: boolean // full-bleed → render the copy over the image with a scrim
}

export interface CardPresentation {
  variant: ArtDirection['productCard']
  aspect: string // image aspect-ratio utility
  framed: boolean // bordered card vs. bare gallery tile
  align: 'left' | 'center'
  price: string // price colour/weight (from mood)
  hover: ArtDirection['cardHover']
}

export interface StoreArtDirection {
  layout: ArtDirection['layout']
  vibe: StoreVibe
  expressive: boolean
  sections: ArtDirection['sectionOrder']
  hero: HeroPresentation
  card: CardPresentation
  eyebrow: { label: string; rule: boolean }
}

// Shared display-heading treatment: feel-driven weight + tracking, scale-driven leading.
// These vars are emitted by tokensToCssVars (cssVars.ts) with main.css fallbacks, so
// typography.feel / typography.scale finally shape the headings instead of being
// discarded. Applied ONLY to display/section headings — never globally.
const DISPLAY =
  'font-heading text-balance tracking-[var(--t-heading-tracking)] [font-weight:var(--t-heading-weight)] leading-[var(--t-leading-display)]'

// Section vertical rhythm per layout archetype (on top of the density --t-space-* vars).
const LAYOUT_RHYTHM: Record<ArtDirection['layout'], string> = {
  catalog: 'py-12 sm:py-16',
  lookbook: 'py-20 sm:py-28',
  editorial: 'py-16 sm:py-24',
  boutique: 'py-16 sm:py-24',
}

// Hero composition per variant. `heading` pairs a size with the DISPLAY treatment.
const HERO: Record<ArtDirection['hero'], Omit<HeroPresentation, 'variant' | 'section' | 'eyebrow'>> = {
  split: { align: 'left', heading: `${DISPLAY} text-5xl sm:text-7xl`, rule: 'h-1.5 w-16 rounded-full bg-primary', overlay: false },
  'full-bleed': { align: 'left', heading: `${DISPLAY} text-5xl sm:text-7xl`, rule: 'h-px w-16 bg-accent', overlay: true },
  centered: { align: 'center', heading: `${DISPLAY} text-5xl sm:text-7xl`, rule: 'h-px w-20 bg-accent/70', overlay: false },
  offset: { align: 'left', heading: `${DISPLAY} text-6xl sm:text-8xl`, rule: 'h-1.5 w-16 rounded-full bg-primary', overlay: false },
}

const CARD_VARIANT: Record<ArtDirection['productCard'], { aspect: string; framed: boolean; align: 'left' | 'center' }> = {
  portrait: { aspect: 'aspect-[4/5]', framed: false, align: 'left' },
  square: { aspect: 'aspect-square', framed: true, align: 'left' },
  editorial: { aspect: 'aspect-[3/4]', framed: false, align: 'center' },
  tile: { aspect: 'aspect-square', framed: true, align: 'left' },
}

// Mood → default artDirection, used only for themes saved before artDirection existed.
function defaultsFromVibe(vibe: StoreVibe): ArtDirection {
  switch (vibe) {
    case 'luxury':
      return { layout: 'editorial', hero: 'centered', productCard: 'portrait', cardHover: 'zoom', sectionOrder: ['hero', 'categories', 'products'] }
    case 'bold':
      return { layout: 'catalog', hero: 'offset', productCard: 'square', cardHover: 'lift', sectionOrder: ['hero', 'categories', 'products'] }
    case 'minimal':
      return { layout: 'catalog', hero: 'split', productCard: 'square', cardHover: 'none', sectionOrder: ['hero', 'categories', 'products'] }
    default:
      return { layout: 'catalog', hero: 'split', productCard: 'square', cardHover: 'lift', sectionOrder: ['hero', 'categories', 'products'] }
  }
}

export function useStoreArtDirection() {
  const { state } = useTenant()
  return computed<StoreArtDirection>(() => {
    const vibe = pickVibe(state.value.mood)
    const preset = VIBE_PRESETS[vibe]
    const ad = state.value.artDirection ?? defaultsFromVibe(vibe)
    const heroCfg = HERO[ad.hero]
    const cardCfg = CARD_VARIANT[ad.productCard]
    return {
      layout: ad.layout,
      vibe,
      expressive: preset.expressive,
      sections: ad.sectionOrder?.length ? ad.sectionOrder : defaultsFromVibe(vibe).sectionOrder,
      hero: {
        variant: ad.hero,
        section: LAYOUT_RHYTHM[ad.layout],
        align: heroCfg.align,
        eyebrow: preset.hero.eyebrow,
        heading: heroCfg.heading,
        rule: heroCfg.rule,
        overlay: heroCfg.overlay,
      },
      card: {
        variant: ad.productCard,
        aspect: cardCfg.aspect,
        framed: cardCfg.framed,
        align: cardCfg.align,
        price: preset.card.price,
        hover: ad.cardHover,
      },
      eyebrow: preset.eyebrow,
    }
  })
}
