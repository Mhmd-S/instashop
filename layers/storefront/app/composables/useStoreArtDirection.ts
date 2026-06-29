import type { ArtDirection } from '~~/shared/types/theme'
import type { HeroSection, SectionId, SectionMap } from '~~/shared/types/template'
import { DEFAULT_SECTION_ORDER, resolveSections } from '~~/shared/types/template'
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
  // The ordered section ids the storefront renders (the widened "Atelier" catalog).
  sectionOrder: SectionId[]
  // Per-section enum config, materialized for every id in sectionOrder.
  sections: SectionMap
  hero: HeroPresentation
  card: CardPresentation
  eyebrow: { label: string; rule: boolean }
}

// Shared display-heading treatment, consuming the feel/scale CSS vars emitted by
// tokensToCssVars (cssVars.ts) with main.css fallbacks — so typography.feel and
// typography.scale finally shape the headings instead of being discarded:
//   --t-heading-tracking / --t-heading-weight / --t-heading-transform ← feel
//   --t-leading-display ← scale (and the H1 sizes below multiply by --t-scale ← scale)
// Applied ONLY to display headings — never globally (would fight per-element utilities).
const DISPLAY =
  'font-heading text-balance tracking-[var(--t-heading-tracking)] [font-weight:var(--t-heading-weight)] [text-transform:var(--t-heading-transform)] leading-[var(--t-leading-display)]'

// Display heading sizes, scale-aware: typography.scale (--t-scale) multiplies the base
// so an "airy" shop reads larger and a "tight" one tighter.
const H1 = 'text-[length:calc(2.75rem*var(--t-scale))] sm:text-[length:calc(4rem*var(--t-scale))]'
const H1_BIG = 'text-[length:calc(3.25rem*var(--t-scale))] sm:text-[length:calc(5rem*var(--t-scale))]'

// Section vertical rhythm per layout archetype (on top of the density --t-space-* vars).
const LAYOUT_RHYTHM: Record<ArtDirection['layout'], string> = {
  catalog: 'py-12 sm:py-16',
  lookbook: 'py-20 sm:py-28',
  editorial: 'py-16 sm:py-24',
  boutique: 'py-16 sm:py-24',
}

// Hero composition per variant. Exported so the hero component can recompute classes
// for an EFFECTIVE variant (e.g. full-bleed degrades to centered when there's no image)
// rather than binding the declared variant's rule. `heading` pairs a size with DISPLAY.
export function heroVariantClasses(
  variant: ArtDirection['hero'],
): Pick<HeroPresentation, 'align' | 'heading' | 'rule' | 'overlay'> {
  switch (variant) {
    case 'full-bleed':
      return { align: 'left', heading: `${DISPLAY} ${H1}`, rule: 'h-px w-16 bg-accent', overlay: true }
    case 'centered':
      return { align: 'center', heading: `${DISPLAY} ${H1}`, rule: 'h-px w-20 bg-accent/70', overlay: false }
    case 'offset':
      return { align: 'left', heading: `${DISPLAY} ${H1_BIG}`, rule: 'h-1.5 w-16 rounded-full bg-primary', overlay: false }
    case 'split':
    default:
      return { align: 'left', heading: `${DISPLAY} ${H1}`, rule: 'h-1.5 w-16 rounded-full bg-primary', overlay: false }
  }
}

const CARD_VARIANT: Record<ArtDirection['productCard'], { aspect: string; framed: boolean; align: 'left' | 'center' }> = {
  portrait: { aspect: 'aspect-[4/5]', framed: false, align: 'left' },
  square: { aspect: 'aspect-square', framed: true, align: 'left' },
  editorial: { aspect: 'aspect-[3/4]', framed: false, align: 'center' },
  tile: { aspect: 'aspect-square', framed: true, align: 'left' },
}

// Mood → default artDirection, used only for themes saved before artDirection existed.
// sectionOrder uses Phase-1 sections only so the page always renders complete.
function defaultsFromVibe(vibe: StoreVibe): ArtDirection {
  switch (vibe) {
    case 'luxury':
      return { layout: 'editorial', hero: 'centered', productCard: 'portrait', cardHover: 'zoom', sectionOrder: ['hero', 'shopByCategory', 'featuredRail', 'products', 'newsletter'] }
    case 'bold':
      return { layout: 'catalog', hero: 'offset', productCard: 'square', cardHover: 'lift', sectionOrder: ['hero', 'marquee', 'featuredRail', 'shopByCategory', 'products', 'newsletter'] }
    case 'minimal':
      return { layout: 'catalog', hero: 'split', productCard: 'square', cardHover: 'none', sectionOrder: ['hero', 'shopByCategory', 'products', 'newsletter'] }
    default:
      return { layout: 'catalog', hero: 'split', productCard: 'square', cardHover: 'lift', sectionOrder: [...DEFAULT_SECTION_ORDER] }
  }
}

export function useStoreArtDirection() {
  const { state } = useTenant()
  return computed<StoreArtDirection>(() => {
    const vibe = pickVibe(state.value.mood)
    const preset = VIBE_PRESETS[vibe]
    const ad = state.value.artDirection ?? defaultsFromVibe(vibe)
    // Resolve the composition the same way the server choke-point does (remap legacy
    // ids, dedupe, hero-first, products-present, clamp + materialize per-section config)
    // so even a theme persisted before `sections` existed renders the full catalog.
    const { sectionOrder, sections } = resolveSections(ad.sectionOrder, ad.sections)
    // The hero composition is the per-section config's choice, falling back to the
    // legacy global `artDirection.hero`.
    const heroComposition = (sections.hero as HeroSection | undefined)?.composition ?? ad.hero
    const heroCfg = heroVariantClasses(heroComposition)
    const cardCfg = CARD_VARIANT[ad.productCard]
    return {
      layout: ad.layout,
      vibe,
      expressive: preset.expressive,
      sectionOrder,
      sections,
      hero: {
        variant: heroComposition,
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
