// ============================================================================
// shared/types/template.ts — the "Atelier" storefront template schema.
//
// ONE canonical storefront homepage rendered for every shop: a fixed library of
// polished section components, composed by DATA — an ordered `sectionOrder` enum
// array + a per-section `sections` config map. Variety comes from DesignTokens
// (palette/type/density), the seller's own imagery, and these per-section enums —
// never from a different page skeleton.
//
// H6 (anti-injection) holds end-to-end: EVERY authorable value here is an enum, a
// bounded number/boolean, or a *reference* (id/slug) re-validated server-side. No
// raw markup/CSS/free text is ever modelled — the one prose escape hatch is a
// `TextSlotRef` pointing at a server-sanitized `section_text_slots` row.
//
// This module owns all section-level VALUES. shared/types/theme.ts re-exports
// ALLOWED_SECTION from here and references SectionId/SectionConfig as TYPES only,
// so the runtime dependency is strictly one-directional (theme → template).
// ============================================================================
import type { ArtDirection } from './theme'

// The canonical catalog. REPLACES the old 4-value section enum
// (`hero|categories|featured|products`). Order here = the default render order;
// the renderer always force-pins `hero` first and guarantees `products` present.
export const ALLOWED_SECTION = [
  'hero', // lead band — 4 token-driven compositions
  'marquee', // thin trust/value-prop strip
  'lifestyleBand', // full-bleed IG lifestyle shot + overlaid copy (P2)
  'shopByCategory', // the shop's real taxonomy as tiles
  'featuredRail', // horizontal product rail (curated or first-N)
  'editorialSplit', // "shop the look" — image + referenced products (P2)
  'lookbook', // masonry/justified IG gallery (P2)
  'products', // the full buyable grid (always present)
  'brandStory', // seller prose via a sanitized text slot (P3)
  'igFollow', // "follow us" IG strip (P2)
  'promise', // static row of trust badges
  'newsletter', // email capture band
] as const
export type SectionId = (typeof ALLOWED_SECTION)[number]

// Sections that REQUIRE branding_assets imagery to render meaningfully. The
// renderer auto-skips these when their refs/data resolve to nothing.
export const IMAGE_BACKED_SECTIONS = ['lifestyleBand', 'editorialSplit', 'lookbook', 'igFollow'] as const

// Sections shipped in Phase 1 (token + product data only, no IG endpoint). The
// renderer registers only these for now; others are clamped + persisted but skipped
// until their components land.
export const P1_SECTIONS: SectionId[] = [
  'hero', 'marquee', 'shopByCategory', 'featuredRail', 'products', 'promise', 'newsletter',
]

// Legacy → new id remap, applied when reading older persisted themes (which used
// the 4-value enum) so nothing renders blank.
export const LEGACY_SECTION_MAP: Record<string, SectionId> = {
  categories: 'shopByCategory',
  featured: 'featuredRail',
}

// ---- per-section enum vocabularies (every one clamped via pick()) ------------
export const ALLOWED_BAND_HEIGHT = ['compact', 'standard', 'tall'] as const
export const ALLOWED_TEXT_PLACEMENT = ['overlay-left', 'overlay-center', 'overlay-right', 'beside'] as const
export const ALLOWED_RAIL_SIZE = ['sm', 'md', 'lg'] as const
export const ALLOWED_TILE_SHAPE = ['square', 'portrait', 'wide'] as const
export const ALLOWED_COLUMNS = [2, 3, 4] as const
export const ALLOWED_GALLERY_LAYOUT = ['masonry', 'justified', 'grid-3', 'grid-4'] as const
export const ALLOWED_FEED_LAYOUT = ['filmstrip', 'grid'] as const
export const ALLOWED_FEED_COUNT = [6, 8, 12] as const
export const ALLOWED_STORY_LAYOUT = ['sideBySide', 'centeredQuote'] as const
export const ALLOWED_NEWSLETTER_VAR = ['plain', 'imageBacked'] as const
export const ALLOWED_IMAGE_SIDE = ['left', 'right'] as const

// Vetted, templated copy — NEVER free text. Resolved to real strings (with the
// store name interpolated) by shared/template/copy.ts.
export const ALLOWED_COPY_SLOT = [
  'new-arrivals', 'shop-the-look', 'best-sellers', 'as-seen-on-ig', 'our-story',
  'the-collection', 'featured', 'follow-along', 'restocked', 'shop-all', 'browse',
] as const
export type CopySlot = (typeof ALLOWED_COPY_SLOT)[number]

// Fixed icon+label pairs (resolved in shared/template/badges.ts).
export const ALLOWED_PROMISE_BADGE = [
  'free-shipping', 'easy-returns', 'secure-checkout', 'handmade', 'ships-worldwide',
  'small-batch', 'sustainably-made', 'gift-wrap', 'five-star', 'new-weekly',
] as const
export type PromiseBadge = (typeof ALLOWED_PROMISE_BADGE)[number]

// ---- references — the ONLY way config points at content ---------------------
export type AssetRef = { kind: 'branding'; id: string } // branding_assets.id
export type ProductRef = { kind: 'product'; id: string } // products.id
export type CategoryRef = { kind: 'category'; slug: string } // categories.slug
export type TextSlotRef = { kind: 'text'; id: string } // section_text_slots.id
export type CtaTarget = 'products' | 'none' | CategoryRef

// Hero composition + product-card kind are owned by theme.ts's ArtDirection; we
// borrow them as TYPES (no runtime import) so there is a single source of truth.
type HeroComposition = ArtDirection['hero']

// ---- per-section configs (discriminated by `id`) ----------------------------
interface Base<T extends SectionId> {
  id: T
  enabled: boolean
}
export interface HeroSection extends Base<'hero'> {
  composition: HeroComposition
  imageRef?: AssetRef
  headlineSlot: CopySlot
  showCategoriesCta: boolean
}
export interface MarqueeSection extends Base<'marquee'> {
  badges: PromiseBadge[]
}
export interface LifestyleBandSection extends Base<'lifestyleBand'> {
  imageRef?: AssetRef
  height: (typeof ALLOWED_BAND_HEIGHT)[number]
  textPlacement: (typeof ALLOWED_TEXT_PLACEMENT)[number]
  copySlot: CopySlot
  ctaTarget: CtaTarget
}
export interface ShopByCategorySection extends Base<'shopByCategory'> {
  tileShape: (typeof ALLOWED_TILE_SHAPE)[number]
  columns: (typeof ALLOWED_COLUMNS)[number]
  imageBacked: boolean
  showCount: boolean
  covers?: Array<{ slug: string; imageRef: AssetRef }>
}
export interface FeaturedRailSection extends Base<'featuredRail'> {
  size: (typeof ALLOWED_RAIL_SIZE)[number]
  productRefs?: ProductRef[]
  copySlot: CopySlot
}
export interface EditorialSplitSection extends Base<'editorialSplit'> {
  imageRef?: AssetRef
  imageSide: (typeof ALLOWED_IMAGE_SIDE)[number]
  productRefs: ProductRef[]
  copySlot: CopySlot
  ctaTarget: CtaTarget
}
export interface LookbookSection extends Base<'lookbook'> {
  layout: (typeof ALLOWED_GALLERY_LAYOUT)[number]
  assetRefs?: AssetRef[]
  linkToIg: boolean
  showCaptions: boolean
}
export interface ProductsSection extends Base<'products'> {
  copySlot: CopySlot
}
export interface BrandStorySection extends Base<'brandStory'> {
  layout: (typeof ALLOWED_STORY_LAYOUT)[number]
  headlineSlot: CopySlot
  bodyRef?: TextSlotRef
  imageRef?: AssetRef
}
export interface IgFollowSection extends Base<'igFollow'> {
  layout: (typeof ALLOWED_FEED_LAYOUT)[number]
  count: (typeof ALLOWED_FEED_COUNT)[number]
  assetRefs?: AssetRef[]
}
export interface PromiseSection extends Base<'promise'> {
  badges: PromiseBadge[]
}
export interface NewsletterSection extends Base<'newsletter'> {
  variant: (typeof ALLOWED_NEWSLETTER_VAR)[number]
  copySlot: CopySlot
  imageRef?: AssetRef
}

export type SectionConfig =
  | HeroSection
  | MarqueeSection
  | LifestyleBandSection
  | ShopByCategorySection
  | FeaturedRailSection
  | EditorialSplitSection
  | LookbookSection
  | ProductsSection
  | BrandStorySection
  | IgFollowSection
  | PromiseSection
  | NewsletterSection

export type SectionMap = Partial<Record<SectionId, SectionConfig>>

// Default composition for a brand-new shop + the Gemini fallback. All P1 sections,
// so a day-one shop renders a complete, finished page from token + product data. One
// quiet trust strip only (marquee); `promise` stays in the catalog as an opt-in add so
// the default page doesn't repeat the same badges twice.
export const DEFAULT_SECTION_ORDER: SectionId[] = [
  'hero', 'marquee', 'shopByCategory', 'featuredRail', 'products', 'newsletter',
]

// Advisory per-archetype seed (soft default, not a hard gate). Used later by the
// Gemini compose pass; in Phase 1 the renderer falls back to DEFAULT_SECTION_ORDER.
export const ARCHETYPE_SEED: Record<ArtDirection['layout'], SectionId[]> = {
  catalog: ['hero', 'marquee', 'shopByCategory', 'featuredRail', 'products', 'newsletter'],
  lookbook: ['hero', 'lifestyleBand', 'lookbook', 'shopByCategory', 'products', 'igFollow', 'newsletter'],
  editorial: ['hero', 'lifestyleBand', 'editorialSplit', 'shopByCategory', 'products', 'brandStory', 'newsletter'],
  boutique: ['hero', 'marquee', 'featuredRail', 'editorialSplit', 'shopByCategory', 'products', 'brandStory', 'newsletter'],
}

// ---------------------------------------------------------------------------
// Clamping + materialization — the single source of truth shared by the server
// choke-point (validateAndRepair) and the client composable (useStoreArtDirection).
// Pure, dependency-free, never throws.
// ---------------------------------------------------------------------------
function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}
function pick<T extends readonly unknown[]>(v: unknown, allowed: T, fallback: T[number]): T[number] {
  return (allowed as readonly unknown[]).includes(v) ? (v as T[number]) : fallback
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}
function pickBadges(v: unknown, min: number, max: number, fallback: PromiseBadge[]): PromiseBadge[] {
  if (!Array.isArray(v)) return fallback
  const out = v.filter((b): b is PromiseBadge => (ALLOWED_PROMISE_BADGE as readonly unknown[]).includes(b))
  const deduped = [...new Set(out)]
  return deduped.length >= min ? deduped.slice(0, max) : fallback
}
function pickAssetRefs(v: unknown, max: number): AssetRef[] {
  if (!Array.isArray(v)) return []
  const out: AssetRef[] = []
  for (const r of v) {
    const o = asObj(r)
    if (o.kind === 'branding' && typeof o.id === 'string' && o.id) out.push({ kind: 'branding', id: o.id })
  }
  return out.slice(0, max)
}
function pickProductRefs(v: unknown, max: number): ProductRef[] {
  if (!Array.isArray(v)) return []
  const out: ProductRef[] = []
  for (const r of v) {
    const o = asObj(r)
    if (o.kind === 'product' && typeof o.id === 'string' && o.id) out.push({ kind: 'product', id: o.id })
  }
  return out.slice(0, max)
}
function pickAssetRef(v: unknown): AssetRef | undefined {
  const o = asObj(v)
  return o.kind === 'branding' && typeof o.id === 'string' && o.id ? { kind: 'branding', id: o.id } : undefined
}
function pickCtaTarget(v: unknown): CtaTarget {
  if (v === 'products' || v === 'none') return v
  const o = asObj(v)
  if (o.kind === 'category' && typeof o.slug === 'string' && o.slug) return { kind: 'category', slug: o.slug }
  return 'products'
}

// The default config for a section the model/seller didn't specify.
export function defaultSectionConfig(id: SectionId): SectionConfig {
  switch (id) {
    case 'hero':
      return { id, enabled: true, composition: 'split', headlineSlot: 'the-collection', showCategoriesCta: true }
    case 'marquee':
      return { id, enabled: true, badges: ['free-shipping', 'easy-returns', 'secure-checkout'] }
    case 'lifestyleBand':
      return { id, enabled: true, height: 'standard', textPlacement: 'overlay-left', copySlot: 'shop-the-look', ctaTarget: 'products' }
    case 'shopByCategory':
      return { id, enabled: true, tileShape: 'square', columns: 3, imageBacked: true, showCount: true }
    case 'featuredRail':
      return { id, enabled: true, size: 'md', copySlot: 'featured' }
    case 'editorialSplit':
      return { id, enabled: true, imageSide: 'left', productRefs: [], copySlot: 'shop-the-look', ctaTarget: 'products' }
    case 'lookbook':
      return { id, enabled: true, layout: 'justified', linkToIg: true, showCaptions: true }
    case 'products':
      return { id, enabled: true, copySlot: 'the-collection' }
    case 'brandStory':
      return { id, enabled: true, layout: 'sideBySide', headlineSlot: 'our-story' }
    case 'igFollow':
      return { id, enabled: true, layout: 'filmstrip', count: 8 }
    case 'promise':
      return { id, enabled: true, badges: ['free-shipping', 'easy-returns', 'secure-checkout'] }
    case 'newsletter':
      return { id, enabled: true, variant: 'plain', copySlot: 'follow-along' }
  }
}

// Clamp ONE raw section config to its allowlist. Unknown fields are dropped; every
// enum/number/ref is validated; missing fields fall back to the section default.
function clampSectionConfig(id: SectionId, raw: unknown): SectionConfig {
  const r = asObj(raw)
  const d = defaultSectionConfig(id)
  const enabled = bool(r.enabled, true)
  switch (id) {
    case 'hero': {
      const dd = d as HeroSection
      return {
        id,
        enabled,
        composition: pick(r.composition, ['split', 'full-bleed', 'centered', 'offset'] as const, dd.composition),
        imageRef: pickAssetRef(r.imageRef),
        headlineSlot: pick(r.headlineSlot, ALLOWED_COPY_SLOT, dd.headlineSlot),
        showCategoriesCta: bool(r.showCategoriesCta, dd.showCategoriesCta),
      }
    }
    case 'marquee':
      return { id, enabled, badges: pickBadges(r.badges, 2, 6, (d as MarqueeSection).badges) }
    case 'lifestyleBand': {
      const dd = d as LifestyleBandSection
      return {
        id,
        enabled,
        imageRef: pickAssetRef(r.imageRef),
        height: pick(r.height, ALLOWED_BAND_HEIGHT, dd.height),
        textPlacement: pick(r.textPlacement, ALLOWED_TEXT_PLACEMENT, dd.textPlacement),
        copySlot: pick(r.copySlot, ALLOWED_COPY_SLOT, dd.copySlot),
        ctaTarget: pickCtaTarget(r.ctaTarget),
      }
    }
    case 'shopByCategory': {
      const dd = d as ShopByCategorySection
      return {
        id,
        enabled,
        tileShape: pick(r.tileShape, ALLOWED_TILE_SHAPE, dd.tileShape),
        columns: pick(typeof r.columns === 'number' ? r.columns : Number(r.columns), ALLOWED_COLUMNS, dd.columns),
        imageBacked: bool(r.imageBacked, dd.imageBacked),
        showCount: bool(r.showCount, dd.showCount),
      }
    }
    case 'featuredRail': {
      const dd = d as FeaturedRailSection
      return {
        id,
        enabled,
        size: pick(r.size, ALLOWED_RAIL_SIZE, dd.size),
        productRefs: pickProductRefs(r.productRefs, 8),
        copySlot: pick(r.copySlot, ALLOWED_COPY_SLOT, dd.copySlot),
      }
    }
    case 'editorialSplit': {
      const dd = d as EditorialSplitSection
      return {
        id,
        enabled,
        imageRef: pickAssetRef(r.imageRef),
        imageSide: pick(r.imageSide, ALLOWED_IMAGE_SIDE, dd.imageSide),
        productRefs: pickProductRefs(r.productRefs, 4),
        copySlot: pick(r.copySlot, ALLOWED_COPY_SLOT, dd.copySlot),
        ctaTarget: pickCtaTarget(r.ctaTarget),
      }
    }
    case 'lookbook': {
      const dd = d as LookbookSection
      return {
        id,
        enabled,
        layout: pick(r.layout, ALLOWED_GALLERY_LAYOUT, dd.layout),
        assetRefs: pickAssetRefs(r.assetRefs, 12),
        linkToIg: bool(r.linkToIg, dd.linkToIg),
        showCaptions: bool(r.showCaptions, dd.showCaptions),
      }
    }
    case 'products':
      return { id, enabled, copySlot: pick(r.copySlot, ALLOWED_COPY_SLOT, (d as ProductsSection).copySlot) }
    case 'brandStory': {
      const dd = d as BrandStorySection
      const bodyRefObj = asObj(r.bodyRef)
      return {
        id,
        enabled,
        layout: pick(r.layout, ALLOWED_STORY_LAYOUT, dd.layout),
        headlineSlot: pick(r.headlineSlot, ALLOWED_COPY_SLOT, dd.headlineSlot),
        bodyRef: bodyRefObj.kind === 'text' && typeof bodyRefObj.id === 'string' && bodyRefObj.id ? { kind: 'text', id: bodyRefObj.id } : undefined,
        imageRef: pickAssetRef(r.imageRef),
      }
    }
    case 'igFollow': {
      const dd = d as IgFollowSection
      return {
        id,
        enabled,
        layout: pick(r.layout, ALLOWED_FEED_LAYOUT, dd.layout),
        count: pick(typeof r.count === 'number' ? r.count : Number(r.count), ALLOWED_FEED_COUNT, dd.count),
        assetRefs: pickAssetRefs(r.assetRefs, 12),
      }
    }
    case 'promise':
      return { id, enabled, badges: pickBadges(r.badges, 3, 4, (d as PromiseSection).badges) }
    case 'newsletter': {
      const dd = d as NewsletterSection
      return {
        id,
        enabled,
        variant: pick(r.variant, ALLOWED_NEWSLETTER_VAR, dd.variant),
        copySlot: pick(r.copySlot, ALLOWED_COPY_SLOT, dd.copySlot),
        imageRef: pickAssetRef(r.imageRef),
      }
    }
  }
}

function remapSectionId(s: unknown): SectionId | null {
  if (typeof s !== 'string') return null
  if ((ALLOWED_SECTION as readonly string[]).includes(s)) return s as SectionId
  return LEGACY_SECTION_MAP[s] ?? null
}

// Normalize a raw sectionOrder: remap legacy ids, drop unknowns, dedupe, force
// `hero` first, and guarantee `products` present (a shop must always be buyable).
// An empty/degenerate result falls back to DEFAULT_SECTION_ORDER.
export function normalizeSectionOrder(raw: unknown): SectionId[] {
  const seen = new Set<SectionId>(['hero'])
  const order: SectionId[] = ['hero']
  if (Array.isArray(raw)) {
    for (const s of raw) {
      const id = remapSectionId(s)
      if (id && !seen.has(id)) {
        seen.add(id)
        order.push(id)
      }
    }
  }
  let result = order.length > 1 ? order : [...DEFAULT_SECTION_ORDER]
  if (!result.includes('products')) result = [...result, 'products']
  return result
}

// THE choke-point: turn ANY raw (model/DB/edit) order + sections JSON into a valid,
// fully-clamped { sectionOrder, sections }. `sections` is materialized for every id
// in the order (clamped raw config or the default).
export function resolveSections(rawOrder: unknown, rawSections: unknown): { sectionOrder: SectionId[]; sections: SectionMap } {
  const sectionOrder = normalizeSectionOrder(rawOrder)
  const rs = asObj(rawSections)
  const sections: SectionMap = {}
  for (const id of sectionOrder) {
    // Read the new key first; fall back to a legacy key when migrating an old row.
    const legacyKey = Object.keys(LEGACY_SECTION_MAP).find((k) => LEGACY_SECTION_MAP[k] === id)
    const rawCfg = rs[id] ?? (legacyKey ? rs[legacyKey] : undefined)
    sections[id] = clampSectionConfig(id, rawCfg)
  }
  return { sectionOrder, sections }
}
