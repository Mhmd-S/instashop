I now have complete grounding on every claim. I have verified: the exact `DesignTokens`/`ArtDirection` shape, `ALLOWED_SECTION` (4 values), `repairArtDirection`'s hero-pin + products-force logic, `tokensToCssVars` emitted vars, `StorefrontHome.vue`'s `v-for`/`v-else-if` chain, the PUT zod `Body` with `sectionOrder: z.array(enumOf(ALLOWED_SECTION)).optional()`, `persistTheme`'s single-write-path, `hero.ts` `selectHero`/`gatherCandidates`/`commitHero`, the RLS policies in 0010 (`used_as is not null`), `mood_keywords`/`suggested_categories` columns existing on `branding_assets`, and the `ThemeEditor.vue` split-workspace/sticky-preview structure. Now I'll write the definitive spec.

# Insteshop Storefront Template — Definitive Build Specification ("Atelier")

Status: authoritative implementation artifact. Supersedes the four proposals and the judge's hybrid. Every file path is absolute-from-repo-root unless noted. Grounded against the live codebase as of branch `main` (uncommitted migration 0022 / auto-hero work present).

---

## 1. TEMPLATE PHILOSOPHY

**Atelier is ONE canonical, fully-parameterized storefront homepage** — a single fixed vertical stack of polished, toggle-able, reorderable sections that *every* shop renders. Variety comes exclusively from three sources: (a) the existing `DesignTokens` (palette / typography / radius / density / shadow / `artDirection` feel knobs), (b) the seller's own Instagram + product imagery, and (c) a small per-section enum config. It is not four half-finished archetypes recoloured; it is one skeleton tuned once to pixel-perfection and reused.

**Decision: single-canonical, NOT multi-archetype.** The codebase already ships a 4-archetype generative skeleton (`ALLOWED_LAYOUT = ['catalog','lookbook','editorial','boutique']`) but it only ever feeds `LAYOUT_RHYTHM` (a per-archetype `py-*` bundle in `useStoreArtDirection.ts`) and a `defaultsFromVibe()` preset. We **keep** `artDirection.layout` but narrow its meaning to "a global rhythm/density preset + an *advisory* seed for the default section composition" — it no longer selects a different page skeleton. Rationale: a single skeleton concentrates polish (one spacing scale, one type scale, one image-treatment language, one accent/radius/shadow) instead of fragmenting it; it matches the Shopify "sections" mental model a non-technical seller already understands (a page = a list of cards you toggle/reorder/swap); and it collapses Gemini's job to a tiny bounded search space (pick sections + order + enum options + vetted refs) that clamps cleanly through the existing `validateAndRepair` choke-point. This is the single biggest "real theme vs recolour" lever.

**"Static template + programmatically modifiable" is satisfied** because the template *structure* is static Vue (`layers/storefront/app/components/sections/*.vue`, hand-tuned, version-controlled) while *composition + content-selection* is pure data: an ordered `sectionOrder` enum array + a `sections` config map, both living in the existing immutable `themes.tokens.artDirection` JSON. Modifying the page = mutating that JSON. The same JSON is authored two ways: programmatically by Gemini (one structured-output call → clamped) and by hand by the seller (drag/toggle/swap in the merged builder → pure client-side token application, zero Gemini). **H6 holds end-to-end**: every authorable knob is an enum, a bounded number/boolean, or a *reference* to a vetted asset/product/category row that is existence-checked server-side. The only free-text escape hatch (seller-written brand-story prose) lives in a dedicated sanitized table referenced by id — never inline in the config JSON, never `v-html`.

---

## 2. SECTION CATALOG

Final ordered catalog. `ALLOWED_SECTION` (today `['hero','categories','featured','products']`) is **widened** to the 12 ids below. Legacy ids remap in `repairArtDirection` (`categories→shopByCategory`, `featured→featuredRail`). The renderer always force-pins `hero` first and guarantees `products` present (existing invariants, extended).

**Phase tags:** **P1** = ships in the pure-render flagship (token+product data only, no RLS work). **P2** = needs the `/api/storefront/branding` endpoint (non-hero IG imagery). **P3** = needs new schema (text slots / subscribe).

`availableToday` legend: `yes-pure-render` / `needs-endpoint-or-rls` / `needs-new-schema`.

| # | id | Phase | availableToday |
|---|----|-------|----------------|
| 1 | `hero` | P1 | yes-pure-render |
| 2 | `marquee` | P1 | yes-pure-render |
| 3 | `lifestyleBand` | P2 | needs-endpoint-or-rls |
| 4 | `shopByCategory` | P1 | yes-pure-render |
| 5 | `featuredRail` | P1 | yes-pure-render |
| 6 | `editorialSplit` (= "shop the look") | P2 | needs-endpoint-or-rls |
| 7 | `lookbook` | P2 | needs-endpoint-or-rls |
| 8 | `products` | P1 | yes-pure-render |
| 9 | `brandStory` | P3 | needs-new-schema |
| 10 | `igFollow` | P2 | needs-endpoint-or-rls |
| 11 | `promise` | P1 | yes-pure-render |
| 12 | `newsletter` | P3 (visual P1) | needs-new-schema |

---

### 1. `hero` — P1
- **Looks like:** Reuses the 4 existing compositions verbatim from `StorefrontHero.vue` (`split` / `full-bleed` / `centered` / `offset`). Full-bleed = immersive lifestyle/product photo + `from-black/70` scrim + white display H1; split = copy + framed 4:5 shot with offset accent block; centered = stacked copy over a 16:7 band; offset = supersized headline + square image bleeding right. H1 already scales via `--t-scale` and tracks `--t-heading-*`. Effective-variant degradation (`full-bleed`→`centered` when no image) already implemented.
- **Data source:** `GET /api/storefront/hero` (`branding_assets` where `used_as='hero'` → `public_url, caption`). Headline = `store.name`; subline = real taxonomy via `heroLine` (categories, else item count). **No fake tagline** (existing discipline).
- **Gemini sets:** `composition: 'split'|'full-bleed'|'centered'|'offset'`, `imageRef?: AssetRef` (override; default = `used_as:'hero'`), `headlineSlot: COPY_SLOT`, `showCategoriesCta: boolean`.
- **User can:** swap composition (4 thumbnails), re-pick hero image (existing Auto-pick + manual override UI, absorbed from migration 0022), toggle the "Browse categories" CTA. No free text.

### 2. `marquee` — P1
- **Looks like:** Thin band (32–40px or a single row) of 2–6 trust signals, each = `i-lucide-*` icon + one-line label, hairline dividers, on a `color-mix(in oklab, var(--ui-primary) 5%, var(--ui-bg))` tint. Optional slow horizontal scroll on mobile (`motion-safe:`).
- **Data source:** config only, no table. Labels are fixed icon+label pairs.
- **Gemini sets:** `badges: PROMISE_BADGE[]` (2..6). Defaults seeded from `mood` (e.g. `handmade` if mood ∋ `earthy`/`rustic`).
- **User can:** toggle, reorder badges, swap each from a dropdown.

### 3. `lifestyleBand` — P2
- **Looks like:** Full-bleed (or contained 21:9) lifestyle image, `min-h` per `BAND_HEIGHT`, copy block over a fixed `--t-scrim` gradient (always AA white text regardless of palette). `Reveal.vue` scroll-fade. One accent hairline + one CTA.
- **Data source:** `branding_assets` (role ∈ `lifestyle`/`branding`, high `hero_score`) via **new** `GET /api/storefront/branding`. Caption sanitized server-side. **Product-photo fallback** (grafted from ig-editorial): when no lifestyle asset resolves, route through `hero.ts gatherCandidates` product path → frame a product photo with the band tint.
- **Gemini sets:** `imageRef: AssetRef`, `height: 'compact'|'standard'|'tall'`, `textPlacement: 'overlay-left'|'overlay-center'|'overlay-right'|'beside'`, `copySlot: COPY_SLOT`, `ctaTarget: 'products'|CategoryRef|'none'`.
- **User can:** swap photo from IG-post picker, flip placement, choose height, set CTA target, toggle caption.

### 4. `shopByCategory` — P1
- **Looks like:** The existing `categories` block upgraded. `tiles` = current text+arrow tiles (2/3/4-up). `covers` = image-backed cards using each category's first product photo (P1) or an assigned cover (P2) behind a dark scrim with the name overlaid.
- **Data source:** `GET /api/storefront/categories` (`slug, name`). Covers P1: first product image per category (derivable from `products`); P2: optional assigned `AssetRef`.
- **Gemini sets:** `tileShape: 'square'|'portrait'|'wide'`, `columns: 2|3|4`, `imageBacked: boolean`, `showCount: boolean`.
- **User can:** toggle, choose tile shape + columns, switch text/cover, assign a per-category cover (P2).

### 5. `featuredRail` — P1
- **Looks like:** Horizontal snap rail (or 3-up trio) of large 4:5 product cards on a primary-5% tint band with a "Featured" accent pill. Eyebrow + heading. Hover = `cardHover` (lift/zoom).
- **Data source:** `GET /api/storefront/products`. `productRefs` (curated) else first-N published. Mirrors today's `>=4 products` guard.
- **Gemini sets:** `size: 'sm'|'md'|'lg'`, `productRefs?: ProductRef[]` (≤8), `copySlot: COPY_SLOT`.
- **User can:** multi-select products from real catalogue, reorder, choose size + heading.

### 6. `editorialSplit` ("shop the look") — P2
- **Looks like:** Image-left/right alternating band: large lifestyle image one side, copy + a vertical strip of 2–4 referenced product cards the other (mobile = image then horizontal product scroller). Products link to PDP; quick-add pill reused from grid.
- **Data source:** `branding_assets` image (`AssetRef`, via branding endpoint) + explicit `productRefs`. Pairing is *authored*, seeded by Gemini from `suggested_categories ↔ product.category` overlap. Product-photo fallback if no lifestyle asset.
- **Gemini sets:** `imageRef: AssetRef`, `imageSide: 'left'|'right'`, `productRefs: ProductRef[]` (≤4), `copySlot: COPY_SLOT`, `ctaTarget: 'products'|CategoryRef`.
- **User can:** pick the photo, pick which products are "in the look", flip side, set CTA.

### 7. `lookbook` — P2
- **Looks like:** Justified / masonry / 3-up / 4-up IG gallery of lifestyle posts. Each tile hover-reveals caption + "View on Instagram" (`ig_permalink`, `rel=noopener`). Varied aspect for magazine rhythm. Requires **≥3 assets** else dropped.
- **Data source:** `branding_assets` (role ∈ lifestyle/branding/hero_candidate, `public_url` not null) via branding endpoint, ordered by `hero_score` desc.
- **Gemini sets:** `layout: 'masonry'|'justified'|'grid-3'|'grid-4'`, `assetRefs?: AssetRef[]` (≤12), `linkToIg: boolean`.
- **User can:** reorder/remove tiles, choose layout, cap count, toggle captions + IG links.

### 8. `products` — P1 (force-present, non-removable)
- **Looks like:** The full buyable grid via `StorefrontProductGrid.vue`, card treatment from `artDirection.productCard` + `cardHover` + quick-add. Eyebrow + heading + item count.
- **Data source:** `GET /api/storefront/products`.
- **Gemini sets:** `copySlot: COPY_SLOT` (header copy only; card shape stays the global token).
- **User can:** choose heading copy. Cannot delete (builder greys out remove); can reorder.

### 9. `brandStory` — P3
- **Looks like:** Centered `max-w-2xl` prose (1 eyebrow + 1 short paragraph) over a tint surface, or split with the logo/brand mark. Generous `--t-leading-body`, serif/display pull-quote feel.
- **Data source:** **`section_text_slots`** table (grafted from schema-first) — server-sanitized plain text referenced by `bodyRef: TextSlotRef`. No free text in config JSON, ever. Heading = `COPY_SLOT`. Image = optional `AssetRef`.
- **Gemini sets:** `headlineSlot: COPY_SLOT`, `bodyRef?` (a Gemini-generated, server-sanitized, length-clamped slot written once via the compose endpoint), `imageRef?: AssetRef`, `layout: 'sideBySide'|'centeredQuote'`.
- **User can:** type their own bio into a plain-text box → server sanitizes + length-clamps (≤600) → writes a `section_text_slots` row → config holds only the slot id. Swap image, choose layout. **The one place a seller writes prose.**

### 10. `igFollow` — P2
- **Looks like:** Edge-to-edge filmstrip or 6-up grid of newest IG posts by `ig_posted_at`, each a square crop linking to `ig_permalink`, with an `@handle` header + Follow button. Scroll-snap. Requires **≥3 assets** else dropped.
- **Data source:** `branding_assets` (source='ig') via branding endpoint; `@handle` from `ig_accounts.username` (exposed on the endpoint — see §6).
- **Gemini sets:** `layout: 'filmstrip'|'grid'`, `count: 6|8|12`, `assetRefs?: AssetRef[]`.
- **User can:** toggle, choose layout + count, deselect specific posts. Auto-hidden if no IG source.

### 11. `promise` — P1
- **Looks like:** Row of 3–4 icon+label trust badges (shipping/returns/secure/handmade). Same vocabulary as `marquee` but a static block, hairline dividers, generous gutters.
- **Data source:** config only.
- **Gemini sets:** `badges: PROMISE_BADGE[]` (3..4).
- **User can:** toggle, swap badges.

### 12. `newsletter` — P3 (renders P1 as visual; capture P3)
- **Looks like:** Centered tinted band: heading + one-line subcopy + email input + brand button (`buttonStyle` token). Optional image-backed variant with heavy scrim.
- **Data source:** layout needs nothing; submissions need a new `newsletter_signups` table + endpoint (P3). Degrades to a "Follow us" → `ig_permalink` link when capture isn't wired.
- **Gemini sets:** `copySlot: COPY_SLOT`, `variant: 'plain'|'imageBacked'`, `imageRef?: AssetRef`.
- **User can:** toggle, choose variant, swap background, pick heading copy.

---

## 3. CONFIG SCHEMA

**Decision on persistence:** store the composition in the **existing `themes.tokens.artDirection` JSON** (NOT a new column). Verified: `index.put.ts` already zod-validates `artDirection.sectionOrder`, `repairArtDirection` already clamps it, `persistTheme` already versions it, and `tokensToCssVars` doesn't touch it. We widen the enum and add a sibling `sections` map — the existing immutable-versioned-tokens + `stores.active_theme_id` model governs it for free (undo = repoint to a prior version). **Free-text prose is the one exception**: it goes in a new `section_text_slots` table (§6), referenced by id, so `tokens` stays reference-only.

New file: **`shared/types/template.ts`** (extends, does not rewrite, `shared/types/theme.ts`).

```ts
// shared/types/template.ts — extends shared/types/theme.ts
// Every authorable value is an enum, a bounded number/boolean, or a *reference* id
// re-validated server-side. No raw markup/CSS/free text ever reaches the DOM (H6).

// REPLACES ALLOWED_SECTION in shared/types/theme.ts. Order here = the canonical
// default render order; the renderer still force-pins 'hero' first + 'products' present.
export const ALLOWED_SECTION = [
  'hero', 'marquee', 'lifestyleBand', 'shopByCategory', 'featuredRail',
  'editorialSplit', 'lookbook', 'products', 'brandStory', 'igFollow',
  'promise', 'newsletter',
] as const
export type SectionId = typeof ALLOWED_SECTION[number]

// Sections that REQUIRE branding_assets imagery; auto-skipped when refs don't resolve.
export const IMAGE_BACKED_SECTIONS = ['lifestyleBand', 'editorialSplit', 'lookbook', 'igFollow'] as const

// Legacy → new id remap (run in repairArtDirection for old DB rows).
export const LEGACY_SECTION_MAP: Record<string, SectionId> = {
  categories: 'shopByCategory',
  featured: 'featuredRail',
}

// ---- per-section enum vocabularies (all clamped via pick()) -----------------
export const ALLOWED_HERO           = ['split', 'full-bleed', 'centered', 'offset'] as const // unchanged
export const ALLOWED_BAND_HEIGHT    = ['compact', 'standard', 'tall'] as const
export const ALLOWED_TEXT_PLACEMENT = ['overlay-left', 'overlay-center', 'overlay-right', 'beside'] as const
export const ALLOWED_RAIL_SIZE      = ['sm', 'md', 'lg'] as const
export const ALLOWED_TILE_SHAPE     = ['square', 'portrait', 'wide'] as const
export const ALLOWED_COLUMNS        = [2, 3, 4] as const
export const ALLOWED_GALLERY_LAYOUT = ['masonry', 'justified', 'grid-3', 'grid-4'] as const
export const ALLOWED_FEED_LAYOUT    = ['filmstrip', 'grid'] as const
export const ALLOWED_FEED_COUNT     = [6, 8, 12] as const
export const ALLOWED_STORY_LAYOUT   = ['sideBySide', 'centeredQuote'] as const
export const ALLOWED_NEWSLETTER_VAR = ['plain', 'imageBacked'] as const
export const ALLOWED_IMAGE_SIDE     = ['left', 'right'] as const

// Vetted, templated copy — NEVER free text. Rendered from a string table with the
// store name interpolated (shared/template/copy.ts).
export const ALLOWED_COPY_SLOT = [
  'new-arrivals', 'shop-the-look', 'best-sellers', 'as-seen-on-ig', 'our-story',
  'the-collection', 'featured', 'follow-along', 'restocked', 'shop-all', 'browse',
] as const

// Fixed icon+label pairs (icon resolved in shared/template/badges.ts).
export const ALLOWED_PROMISE_BADGE = [
  'free-shipping', 'easy-returns', 'secure-checkout', 'handmade', 'ships-worldwide',
  'small-batch', 'sustainably-made', 'gift-wrap', 'five-star', 'new-weekly',
] as const

// ---- references — the ONLY way config points at content ---------------------
export type AssetRef    = { kind: 'branding'; id: string }   // branding_assets.id
export type ProductRef  = { kind: 'product';  id: string }   // products.id
export type CategoryRef = { kind: 'category'; slug: string } // categories.slug
export type TextSlotRef = { kind: 'text';     id: string }   // section_text_slots.id
export type CtaTarget   = 'products' | 'none' | CategoryRef

// ---- per-section configs (discriminated by SectionId) ----------------------
interface Base<T extends SectionId> { id: T; enabled: boolean }

export interface HeroSection           extends Base<'hero'> { composition: typeof ALLOWED_HERO[number]; imageRef?: AssetRef; headlineSlot: typeof ALLOWED_COPY_SLOT[number]; showCategoriesCta: boolean }
export interface MarqueeSection        extends Base<'marquee'> { badges: Array<typeof ALLOWED_PROMISE_BADGE[number]> }
export interface LifestyleBandSection  extends Base<'lifestyleBand'> { imageRef?: AssetRef; height: typeof ALLOWED_BAND_HEIGHT[number]; textPlacement: typeof ALLOWED_TEXT_PLACEMENT[number]; copySlot: typeof ALLOWED_COPY_SLOT[number]; ctaTarget: CtaTarget }
export interface ShopByCategorySection extends Base<'shopByCategory'> { tileShape: typeof ALLOWED_TILE_SHAPE[number]; columns: typeof ALLOWED_COLUMNS[number]; imageBacked: boolean; showCount: boolean; covers?: Array<{ slug: string; imageRef: AssetRef }> }
export interface FeaturedRailSection   extends Base<'featuredRail'> { size: typeof ALLOWED_RAIL_SIZE[number]; productRefs?: ProductRef[]; copySlot: typeof ALLOWED_COPY_SLOT[number] }
export interface EditorialSplitSection extends Base<'editorialSplit'> { imageRef?: AssetRef; imageSide: typeof ALLOWED_IMAGE_SIDE[number]; productRefs: ProductRef[]; copySlot: typeof ALLOWED_COPY_SLOT[number]; ctaTarget: CtaTarget }
export interface LookbookSection       extends Base<'lookbook'> { layout: typeof ALLOWED_GALLERY_LAYOUT[number]; assetRefs?: AssetRef[]; linkToIg: boolean; showCaptions: boolean }
export interface ProductsSection       extends Base<'products'> { copySlot: typeof ALLOWED_COPY_SLOT[number] }
export interface BrandStorySection     extends Base<'brandStory'> { layout: typeof ALLOWED_STORY_LAYOUT[number]; headlineSlot: typeof ALLOWED_COPY_SLOT[number]; bodyRef?: TextSlotRef; imageRef?: AssetRef }
export interface IgFollowSection       extends Base<'igFollow'> { layout: typeof ALLOWED_FEED_LAYOUT[number]; count: typeof ALLOWED_FEED_COUNT[number]; assetRefs?: AssetRef[] }
export interface PromiseSection        extends Base<'promise'> { badges: Array<typeof ALLOWED_PROMISE_BADGE[number]> }
export interface NewsletterSection     extends Base<'newsletter'> { variant: typeof ALLOWED_NEWSLETTER_VAR[number]; copySlot: typeof ALLOWED_COPY_SLOT[number]; imageRef?: AssetRef }

export type SectionConfig =
  | HeroSection | MarqueeSection | LifestyleBandSection | ShopByCategorySection
  | FeaturedRailSection | EditorialSplitSection | LookbookSection | ProductsSection
  | BrandStorySection | IgFollowSection | PromiseSection | NewsletterSection

// ---- the v2 art-direction block --------------------------------------------
// KEEPS layout/hero/productCard/cardHover as global feel knobs. REPLACES the old
// 4-value sectionOrder with the widened enum + a per-section config map.
export interface ArtDirectionV2 {
  layout: 'catalog' | 'lookbook' | 'editorial' | 'boutique' // now a global rhythm preset + advisory default seed
  hero: typeof ALLOWED_HERO[number]                          // legacy mirror of sections.hero.composition
  productCard: 'portrait' | 'square' | 'editorial' | 'tile'
  cardHover: 'lift' | 'zoom' | 'none'
  sectionOrder: SectionId[]                                  // ordered, deduped, hero-first, products-present
  sections: Partial<Record<SectionId, SectionConfig>>        // per-section enum config (config.id MUST === key)
}

// Advisory per-archetype default composition (grafted from rich-archetype as SOFT seed,
// not a hard gate). Used for brand-new shops + as the Gemini default fallback.
export const DEFAULT_SECTION_ORDER: SectionId[] =
  ['hero', 'marquee', 'shopByCategory', 'featuredRail', 'products', 'promise', 'newsletter']
export const ARCHETYPE_SEED: Record<ArtDirectionV2['layout'], SectionId[]> = {
  catalog:   ['hero', 'marquee', 'shopByCategory', 'featuredRail', 'products', 'promise', 'newsletter'],
  lookbook:  ['hero', 'lifestyleBand', 'lookbook', 'shopByCategory', 'products', 'igFollow', 'newsletter'],
  editorial: ['hero', 'lifestyleBand', 'editorialSplit', 'shopByCategory', 'products', 'brandStory', 'newsletter'],
  boutique:  ['hero', 'marquee', 'featuredRail', 'editorialSplit', 'shopByCategory', 'products', 'brandStory', 'newsletter'],
}
```

**Relationship to existing `artDirection.sectionOrder`:** strict superset. `ALLOWED_SECTION` is replaced in `shared/types/theme.ts` (re-exported from `template.ts`); `ArtDirection` gains `sections`. The old 4 values map 1:1 (`categories→shopByCategory`, `featured→featuredRail`). `useStoreArtDirection.ts` keeps reading `ad.sectionOrder`; we extend its return with a `sectionConfig(id)` accessor that maps each section's enum config to ready-to-bind Tailwind class bundles (mirroring `heroVariantClasses`/`CARD_VARIANT`).

**Persistence:** `tokens.artDirection.sectionOrder` + `tokens.artDirection.sections` (no new column). `section_text_slots` for prose. No `section_assets` table — asset/product/category pins are refs inside the config JSON.

---

## 4. RENDER ARCHITECTURE

### Component plan — `layers/storefront/app/components/`

**New directory `sections/`** — one SFC per section id, each consuming `:config` (already-clamped) + resolved data:
- `SectionHero.vue` — **modified rename** of existing `StorefrontHero.vue` (keep the 4 compositions + effective-variant degradation; wrap to take a `HeroSection` config).
- `SectionMarquee.vue` *(new, P1)*
- `SectionLifestyleBand.vue` *(new, P2)*
- `SectionShopByCategory.vue` *(new, P1 — lifts the `categories` block out of `StorefrontHome.vue`)*
- `SectionFeaturedRail.vue` *(new, P1 — lifts `featured`)*
- `SectionEditorialSplit.vue` *(new, P2)*
- `SectionLookbook.vue` *(new, P2)*
- `SectionProducts.vue` *(new, P1 — wraps `StorefrontProductGrid.vue`, lifts the `products` block)*
- `SectionBrandStory.vue` *(new, P3)*
- `SectionIgFollow.vue` *(new, P2)*
- `SectionPromise.vue` *(new, P1)*
- `SectionNewsletter.vue` *(new, P3 visual P1)*

**Unchanged/reused:** `StorefrontHeader.vue`, `StorefrontBrand.vue`, `StorefrontEyebrow.vue`, `StorefrontProductGrid.vue`. **Promote** `layers/marketing/app/components/Reveal.vue` → `layers/base/` so storefront sections can import it.

**New registry** `layers/storefront/app/utils/sectionRegistry.ts`:
```ts
import { defineAsyncComponent } from 'vue'
export const SECTION_COMPONENTS = {
  hero: defineAsyncComponent(() => import('../components/sections/SectionHero.vue')),
  marquee: ..., lifestyleBand: ..., shopByCategory: ..., featuredRail: ...,
  editorialSplit: ..., lookbook: ..., products: ..., brandStory: ...,
  igFollow: ..., promise: ..., newsletter: ...,
} satisfies Record<SectionId, Component>
```

### `StorefrontHome.vue` becomes a config-driven renderer

Replace the current hand-written `v-for`/`v-else-if` chain (verified: it loops `ad.sections` with one `v-if` per legacy id) with a single dispatch:

```vue
<template v-for="sec in ad.sectionOrder" :key="sec">
  <component
    :is="SECTION_COMPONENTS[sec]"
    v-if="isResolvable(sec)"            // render-time graceful-degradation guard
    :config="ad.sections[sec]"
    :store="props.store"
    :data="sectionData(sec)"           // resolved products/categories/hero/branding
  />
</template>
```
`isResolvable(sec)` drops any `IMAGE_BACKED_SECTIONS` whose refs resolve to nothing (belt-and-braces alongside `repairArtDirection`). All data (`/products`, `/categories`, `/hero`, new `/branding`) is fetched once at the top of `StorefrontHome.vue` and passed down — sections resolve their own refs against these resolved collections via a small `useSectionData()` composable.

### Preview == store (the load-bearing guarantee)

The merged builder (`WebsiteBuilder.vue`, §7) renders the **real `Section*.vue` components**, not a hand-mirrored mock. Today `ThemeEditor.vue` hand-rolls a parallel preview (verified: `heroSplit`/`heroCentered`/`previewItems` computed). We **replace that mirror** with an in-page `<StorefrontHome>`-equivalent preview that mounts the actual section components against the builder's **reactive local config** + the seller's real fetched data. The preview wraps the section stack in a `surface="store"` provider that applies `tokensToCssVars(localTokens)` (the same pure isomorphic fn the storefront uses SSR) as a scoped `<style>` — so corners, shadow, density, fonts, palette match the live store exactly. `Reveal.vue` is disabled inside the builder preview for stability.

### Client-side token application for preview

Every global-feel edit (color/font/radius/density/button/shadow/mood) and every section edit (toggle/reorder/swap/enum) mutates a local `reactive` config ref → a `computed` re-runs `tokensToCssVars()` → the scoped preview style updates instantly. **Zero Gemini, zero server round-trip per edit.** Save serializes `{...tokens, artDirection: {...feel, sectionOrder, sections}}` to the existing `PUT /api/admin/stores/[storeId]/theme`.

---

## 5. GEMINI AUTHORING CONTRACT

**Two-pass compose** (grafted from rich-archetype) — runs ONLY on explicit "Compose with AI", never per-edit. Respects the spend cap by reusing the single budgeted `selectHero` vision call and doing all ref-binding deterministically server-side.

### Pass A — structure (one structured-output call)
New `server/utils/theme/compose.ts`, mirroring `gemini.ts`'s `RESPONSE_SCHEMA` and `hero.ts`'s `SCORE_SCHEMA` (`responseJsonSchema` forces enums).

**Input to Gemini:** store name; catalogue summary (`{slug, name, productCount}[]`); a **numbered manifest** of available `branding_assets` (`{index, role, hero_score, mood_keywords, hasCaption}[]` — IDs-by-index only, never URLs the model can echo); product manifest (`{index, category, hasImage}[]`); `igPostCount`; the resolved `mood` + `layout` (for advisory seeding). The model picks **indices**, never raw ids/urls.

**Output schema (clamped):**
```jsonc
{
  "sectionOrder": ["hero","lifestyleBand", ...],          // enum array, deduped
  "sections": {
    "hero":          { "composition": "<ALLOWED_HERO>", "imageIndex": <int|null>, "headlineSlot": "<COPY_SLOT>", "showCategoriesCta": true },
    "lifestyleBand": { "imageIndex": <int>, "height": "<BAND_HEIGHT>", "textPlacement": "<TEXT_PLACEMENT>", "copySlot": "<COPY_SLOT>", "ctaTarget": "products|category|none", "ctaCategoryIndex": <int|null> },
    "featuredRail":  { "size": "<RAIL_SIZE>", "productIndices": [<int>...], "copySlot": "<COPY_SLOT>" },
    "editorialSplit":{ "imageIndex": <int>, "imageSide": "left|right", "productIndices": [<int>...], "copySlot": "<COPY_SLOT>", "ctaTarget": "...", "ctaCategoryIndex": <int|null> },
    "lookbook":      { "layout": "<GALLERY_LAYOUT>", "assetIndices": [<int>...], "linkToIg": true, "showCaptions": true },
    "brandStory":    { "layout": "<STORY_LAYOUT>", "headlineSlot": "<COPY_SLOT>", "storyTone": "craft|curated|local|sustainable", "imageIndex": <int|null> },
    "promise":       { "badges": ["<PROMISE_BADGE>"...] }
    // ...one object per chosen section; omitted sections get DEFAULT configs
  }
}
```
`storyTone` for `brandStory` is the ONLY copy-generation surface: Pass B turns it into a vetted templated paragraph (store name + top category interpolated), sanitizes it, writes a `section_text_slots` row, and sets `bodyRef`. The model never emits prose.

### Pass B — `bindRefs(storeId, raw)` (deterministic, no Gemini call)
New `server/utils/theme/bindRefs.ts`:
- Resolve every `imageIndex`/`assetIndices` against the manifest → real `branding_assets.id` `AssetRef`s. Drop indices that don't resolve.
- Resolve `productIndices` → `ProductRef`s; `ctaCategoryIndex` → `CategoryRef`.
- `hero.imageRef`: prefer the model's pick; else the existing `used_as:'hero'` row; else trigger/reuse the single `selectHero` vision call.
- `brandStory`: render the `storyTone` template → sanitize → insert `section_text_slots` → set `bodyRef`.

### `validateAndRepair` extension (the H6 choke-point)
Extend `server/utils/theme/validate.ts`'s `repairArtDirection` into `repairSections(raw, ctx)` where `ctx = { validAssetIds, validProductIds, validCategorySlugs, validTextSlotIds }` (loaded once in `persistTheme`):
1. Filter `sectionOrder` to `ALLOWED_SECTION` (remap legacy via `LEGACY_SECTION_MAP`), dedupe, **force `hero` first**, **force `products` present** (existing invariants).
2. For each section config: `pick()` every enum field against its allowlist; `clamp` numbers; slice arrays (`badges` 2..6, `lookbook.assetRefs` ≤12, `productRefs` ≤8/≤4).
3. **Drop any ref not in `ctx`** (hallucinated/dangling/cross-tenant index → removed). Render-time re-clamp too (grafted from schema-first), so a later-deleted product/post self-heals.
4. Drop any `IMAGE_BACKED_SECTIONS` whose required refs all dropped (and that lack a product-photo fallback).
5. Fill a **default config** per section the model omitted.
6. **Adjacency repair:** no two consecutive full-bleed image bands; sink `newsletter`/`promise`/`brandStory` below `products` if a model puts them above.

Nothing free-form survives: copy is a `COPY_SLOT` rendered from `shared/template/copy.ts`; badges are fixed pairs; prose is a sanitized `section_text_slots` row referenced by id; everything else is an existence-checked ref. Identical in spirit to the existing `pick()`/`hex()` clamping.

**Pipeline hooks:** `compose.ts` + `bindRefs.ts` live in `server/utils/theme/` next to `gemini.ts`/`hero.ts`. `repairSections` is called inside `persistTheme`→`validateAndRepair`. **Cost discipline:** compose = one structured-output text call + (at most) one reused `selectHero` vision call; everything else deterministic. No Gemini on edit/preview/save. The compose endpoint returns the clamped result for the editor to *preview before committing* (Save persists).

---

## 6. BACKEND CHANGES

### New / changed endpoints

1. **`GET /api/storefront/branding`** *(new, P2 — the RLS unblocker).* Service-role (`supabaseAdmin`), resolves store from `event.context.store` like `hero.get.ts`. Returns only `{ id, public_url, caption, role, ig_permalink, ig_posted_at, mood_keywords, hero_score }` plus `igHandle` (from `ig_accounts.username`), for `public_url`-bearing rows on an **active** store, filtered to roles `lifestyle`/`branding`/`hero_candidate` **and** to ids referenced by the active theme's section configs, capped ~24, ordered `hero_score desc, ig_posted_at desc`. Never returns `storage_path` or rows from inactive stores. This is the single sanctioned public read of non-hero branding (the verified migration-0010 policy only exposes `used_as IS NOT NULL`). Chosen over widening RLS: least-privilege, no write-amplification, serves only curated/referenced assets.

2. **`POST /api/admin/stores/[storeId]/theme/compose`** *(new, P4).* `requireStoreAccess(...,'admin')`. Runs Pass A (`compose.ts`) → Pass B (`bindRefs.ts`) → `repairSections` clamp; returns `{ sectionOrder, sections }` for the editor to apply. Does **not** persist (the editor's Save does).

3. **`PUT /api/admin/stores/[storeId]/theme`** *(modified).* Extend the zod `Body.artDirection`: widen `sectionOrder: z.array(enumOf(ALLOWED_SECTION))` (12 ids) and add `sections: z.record(z.any()).optional()` — re-clamped by `repairSections` (don't duplicate the union in zod; let the choke-point own it, exactly as `sectionOrder` is handled today).

4. **`GET /api/admin/stores/[storeId]/branding`** *(unchanged).* Already returns assets for builder pickers (verified). Reuse for swap pickers.

5. **`POST /api/storefront/subscribe`** *(new, P3, optional).* Newsletter capture → `newsletter_signups`.

### branding_assets RLS fix
**Do NOT widen migration-0010's `used_as IS NOT NULL` policy.** Serve non-hero imagery exclusively through the new service-role `/api/storefront/branding` endpoint (same pattern as `hero.get.ts`/`og-image.get.ts`). Anon RLS stays tight; the endpoint is the audited surface. (Fallback if product ever wants pure-RLS: a migration widening `used_as` to an enum incl. `gallery`/`band` + stamping referenced assets — recorded, not recommended.)

### Per-section asset storage
None. Asset/product/category pins are refs **inside** `tokens.artDirection.sections`. Category covers are either derived (first product image, P1) or an assigned `AssetRef` in `shopByCategory.covers` (P2). No `section_assets` table.

### Migrations (sketch)

**`supabase/migrations/0023_section_text_slots.sql`** (P3):
```sql
create table public.section_text_slots (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  kind       text not null check (kind in ('brand_story','editorial')),
  body       text not null check (char_length(body) <= 600),
  source     text not null default 'user' check (source in ('user','ai')),
  created_at timestamptz not null default now()
);
create index idx_text_slots_store on public.section_text_slots(store_id);
alter table public.section_text_slots enable row level security;
-- Staff manage via admin; written only through the server sanitizer (service-role).
create policy "text_slots: staff all" on public.section_text_slots for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
-- Public read on active stores (referenced-by-id filtering enforced at the endpoint).
create policy "text_slots: public read" on public.section_text_slots for select to anon, authenticated
  using ( exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );
```
(Body is server-sanitized — tags stripped, length-clamped — before insert; rendered via Vue text interpolation, never `v-html`.)

**`supabase/migrations/0024_newsletter_signups.sql`** (P3, optional): `(id, store_id, email citext, created_at)` + RLS (service-role insert via endpoint, staff read).

No migration needed for the composition itself (rides `themes.tokens`) or for category covers/`@handle` (`categories.description`, `ig_accounts.username`, `mood_keywords`, `suggested_categories`, `hero_score` all already exist — verified).

---

## 7. PHASED BUILD PLAN

Each phase = one or more PRs. Dependency-ordered.

### Phase 0 — Types + remap shim (foundation)
- **Goal:** widen the schema without changing render behavior; old themes still render.
- **Files:** `shared/types/template.ts` (new, §3); `shared/types/theme.ts` (re-export widened `ALLOWED_SECTION`, add `sections` to `ArtDirection`); `shared/template/copy.ts` (COPY_SLOT string table) + `shared/template/badges.ts` (badge icon+label map); `server/utils/theme/validate.ts` (`repairArtDirection`→`repairSections`: legacy remap + default configs + hero-pin/products-force kept); `index.put.ts` (widen zod).
- **Verify:** unit tests on `repairSections` — legacy `['hero','categories','featured','products']` → `['hero','shopByCategory','featuredRail','products']` with default configs; hallucinated section dropped; hero forced first; products forced present. Existing stores load unchanged.

### Phase 1 — Pure-render flagship (P1 sections, seed content)
- **Goal:** the full `DEFAULT_SECTION_ORDER` (`hero, marquee, shopByCategory, featuredRail, products, promise, newsletter`) renders beautifully from token+product data alone, with sample/seed content.
- **Files:** new `layers/storefront/app/components/sections/Section{Hero,Marquee,ShopByCategory,FeaturedRail,Products,Promise,Newsletter}.vue`; rename `StorefrontHero.vue`→`SectionHero.vue`; `sectionRegistry.ts`; rewrite `StorefrontHome.vue` to the `<component :is>` dispatch; extend `useStoreArtDirection.ts` with `sectionConfig()` + class bundles; promote `Reveal.vue`→`layers/base/`; add `--t-space-block` + `--t-scrim` to `cssVars.ts` (pure enum-derived).
- **Verify:** seed a dev fixture store, set `sectionOrder = DEFAULT_SECTION_ORDER`, load the storefront — confirm a complete, photo-led page (using product photos), correct spacing rhythm, AA contrast, mobile/desktop. Snapshot two mood/layout variants to prove variety-from-tokens.

### Phase 2 — Wire to real IG data (P2 sections + RLS fix)
- **Goal:** `lifestyleBand`, `editorialSplit`, `lookbook`, `igFollow` light up from real `branding_assets`.
- **Files:** `server/api/storefront/branding.get.ts` (new, §6); the four P2 `Section*.vue`; `useSectionData()` composable (resolves refs against fetched collections, product-photo fallback via existing hero pipeline); image-backed graceful-skip guards in `StorefrontHome.vue`.
- **Verify:** a store with imported IG posts renders the editorial sections; a store with zero lifestyle posts auto-skips them and falls back to product photos; confirm the endpoint never leaks `storage_path` or inactive-store rows (RLS/scoping test).

### Phase 3 — Brand story + newsletter schema (P3)
- **Goal:** seller-written prose (sanitized) + newsletter capture.
- **Files:** `0023_section_text_slots.sql`; `0024_newsletter_signups.sql`; server sanitizer util; `SectionBrandStory.vue`, finalize `SectionNewsletter.vue` capture; `POST /api/storefront/subscribe`; a storefront text-slot read (scoped).
- **Verify:** write a brand-story slot via the (Phase-5) editor or a script; confirm it renders as text, `<script>`/HTML is stripped, length-clamped; newsletter submit writes a row.

### Phase 4 — Gemini composition (two-pass)
- **Goal:** "Compose with AI" produces a clamped, ref-bound homepage from IG + products.
- **Files:** `server/utils/theme/compose.ts` (Pass A schema + call); `server/utils/theme/bindRefs.ts` (Pass B); `POST /api/admin/stores/[storeId]/theme/compose`; `repairSections` ctx wiring in `persistTheme`.
- **Verify:** call compose on the fixture store; assert output is fully enum/ref-clamped, references resolve, a bad/empty model response falls back to `DEFAULT_SECTION_ORDER` (never blank), and exactly one structured call + ≤1 reused vision call fire (cost check).

### Phase 5 — Merged builder editor (live preview + floating controls)
- **Goal:** one `WebsiteBuilder.vue` replacing the two-surface `ThemeEditor.vue`.
- **Files:** evolve `layers/admin/app/components/ThemeEditor.vue`→`WebsiteBuilder.vue`: keep its split workspace + sticky preview + device toggle + font loading + contrast badges; **replace the hand-mirrored preview with the real `Section*.vue` stack** (scoped `tokensToCssVars`); add a reorderable section list (drag handle + on/off toggle + "…" → floating control box of that section's `USelect`/`USwitch` enum knobs + asset/product/category swap pickers sourced from existing `/api/admin/.../branding` + `/products` + `/categories`); "Add section" palette with eligibility notes; **absorb the in-flight migration-0022 auto-hero UI** (do not duplicate); two explicit AI buttons: "Compose with AI" (→ compose endpoint, writes editable state) + "Auto-pick hero" (existing). Update `pages/stores/[storeId]/products/...` / `onboarding.vue` references.
- **Verify:** all drag/toggle/swap/enum edits update the preview instantly with no network call; Save round-trips through the existing PUT; preview pixel-matches the live store; AI buttons are the only Gemini triggers.

---

## 8. OPEN DECISIONS

1. **Brand-story prose source — sanitized free text vs. AI-only templated copy.**
   *Either:* (A) ship `section_text_slots` + a seller textarea now (real prose, Phase 3), *or* (B) launch with AI-templated `storyTone`-only copy and defer the textarea.
   **Recommendation: A.** The user's goal implies "users can easily modify"; a real (sanitized) bio is the one prose capability the COPY_SLOT model can't give, and the table keeps `tokens` reference-only. Small surface, high seller value.

2. **Compose-before-Phase-1 vs. flagship-first.**
   *Either:* build Gemini compose (Phase 4) early so every shop auto-composes, *or* ship the pure-render flagship with `DEFAULT_SECTION_ORDER` defaults first.
   **Recommendation: flagship-first (as ordered).** Day-one shops look finished from defaults with zero Gemini cost; compose is additive polish. De-risks the spend cap and lets us tune section beauty before adding the AI surface.

3. **Builder preview: real components in-page vs. iframe of the live storefront.**
   *Either:* mount the real `Section*.vue` against builder state in-page (current plan), *or* render an actual `<StorefrontHome>` in an iframe pointed at a draft.
   **Recommendation: real components in-page.** Avoids a draft-persistence/SSR round-trip per edit (which the spend-cap-free instant-preview requirement demands) while still guaranteeing preview==store *because it's the same components*. Iframe only if cross-component CSS bleed becomes unmanageable.

4. **Image-backed minimum thresholds — fixed vs. tunable.**
   *Either:* hardcode `lookbook ≥3` / `igFollow ≥3` / `lifestyleBand ≥1`, *or* expose a `hero_score` floor (e.g. ≥55) to suppress low-quality IG shots.
   **Recommendation: both, fixed.** Hardcode counts + a `hero_score ≥ 50` floor in `/api/storefront/branding`. Lifestyle quality varies wildly; a busy low-res band looks worse than a clean product grid. Not user-facing.

5. **Newsletter capture — wire now vs. visual-only.**
   *Either:* build `newsletter_signups` + `/subscribe` in Phase 3, *or* render the band as visual-only degrading to a "Follow us" IG link until there's demand.
   **Recommendation: visual-only first, capture deferred.** The band renders and degrades gracefully today; the capture backend (double-opt-in, GDPR, export) is a separate product surface not on the critical path to "amazing storefront."

---

## 9. TWO SAMPLE HOMEPAGES

### Sample A — "Ember & Oak" (candle brand)
12 products / 3 categories (Candles, Diffusers, Gift Sets) / 8 IG lifestyle posts / terracotta logo. Tokens: `primary #b5532e, accent #c98a3a, bg #fbf7f2, fg #2a2320`, heading `Fraunces`, body `Karla`, feel `serif`, scale `airy`, radius `lg`, density `comfortable`, shadow `subtle`, mood `['warm','earthy','elegant']`, `layout: 'editorial'`, `productCard: 'portrait'`, `cardHover: 'zoom'`.

```jsonc
{
  "sectionOrder": ["hero","lifestyleBand","shopByCategory","featuredRail","editorialSplit","products","brandStory","lookbook","igFollow","promise","newsletter"],
  "sections": {
    "hero":          { "id":"hero", "enabled":true, "composition":"full-bleed", "imageRef":{"kind":"branding","id":"a_hands_candle"}, "headlineSlot":"the-collection", "showCategoriesCta":true },
    "lifestyleBand": { "id":"lifestyleBand", "enabled":true, "imageRef":{"kind":"branding","id":"a_interior"}, "height":"standard", "textPlacement":"overlay-left", "copySlot":"shop-the-look", "ctaTarget":{"kind":"category","slug":"candles"} },
    "shopByCategory":{ "id":"shopByCategory", "enabled":true, "tileShape":"portrait", "columns":3, "imageBacked":true, "showCount":true },
    "featuredRail":  { "id":"featuredRail", "enabled":true, "size":"lg", "productRefs":[{"kind":"product","id":"p_bestseller"},{"kind":"product","id":"p_giftset"},{"kind":"product","id":"p_diffuser"}], "copySlot":"best-sellers" },
    "editorialSplit":{ "id":"editorialSplit", "enabled":true, "imageRef":{"kind":"branding","id":"a_flatlay"}, "imageSide":"left", "productRefs":[{"kind":"product","id":"p_soy30"},{"kind":"product","id":"p_amber"}], "copySlot":"shop-the-look", "ctaTarget":"products" },
    "products":      { "id":"products", "enabled":true, "copySlot":"the-collection" },
    "brandStory":    { "id":"brandStory", "enabled":true, "layout":"sideBySide", "headlineSlot":"our-story", "bodyRef":{"kind":"text","id":"slot_story_eo"}, "imageRef":{"kind":"branding","id":"a_pour"} },
    "lookbook":      { "id":"lookbook", "enabled":true, "layout":"justified", "assetRefs":[/* 5 remaining lifestyle posts */], "linkToIg":true, "showCaptions":true },
    "igFollow":      { "id":"igFollow", "enabled":true, "layout":"filmstrip", "count":8 },
    "promise":       { "id":"promise", "enabled":true, "badges":["free-shipping","easy-returns","small-batch"] },
    "newsletter":    { "id":"newsletter", "enabled":true, "variant":"imageBacked", "copySlot":"follow-along", "imageRef":{"kind":"branding","id":"a_dim_interior"} }
  }
}
```
Reads as a premium boutique candle site: immersive warm hero → editorial lifestyle band → photo-backed category tiles → best-seller rail → shoppable look → full grid → brand story → justified lookbook → live IG strip → trust badges → image-backed sign-up.

### Sample B — "VOLT" (streetwear, sparse lifestyle data)
40 products / 5 categories / **2** IG lifestyle posts / neon logo. Tokens: `primary #18ff6d, accent #ff2d9b, bg #0c0c0e`(→ derived light variant), heading `Space Grotesk`, body `Work Sans`, feel `sans-display`, scale `tight`, radius `md`, density `cozy`, shadow `pronounced`, buttonStyle `pill`, mood `['bold','vibrant','modern']`, `layout: 'catalog'`, `productCard: 'square'`, `cardHover: 'lift'`.

```jsonc
{
  "sectionOrder": ["hero","marquee","featuredRail","shopByCategory","products","igFollow","promise","newsletter"],
  "sections": {
    "hero":          { "id":"hero", "enabled":true, "composition":"offset", "headlineSlot":"new-arrivals", "showCategoriesCta":true },
    "marquee":       { "id":"marquee", "enabled":true, "badges":["new-weekly","ships-worldwide","secure-checkout","five-star"] },
    "featuredRail":  { "id":"featuredRail", "enabled":true, "size":"md", "copySlot":"new-arrivals" },
    "shopByCategory":{ "id":"shopByCategory", "enabled":true, "tileShape":"square", "columns":4, "imageBacked":true, "showCount":false },
    "products":      { "id":"products", "enabled":true, "copySlot":"shop-all" },
    "igFollow":      { "id":"igFollow", "enabled":true, "layout":"grid", "count":6 },
    "promise":       { "id":"promise", "enabled":true, "badges":["free-shipping","secure-checkout","easy-returns"] },
    "newsletter":    { "id":"newsletter", "enabled":true, "variant":"plain", "copySlot":"new-arrivals" }
  }
}
```
**Graceful degradation in action:** `lifestyleBand`, `editorialSplit`, `lookbook`, `brandStory` are **auto-dropped** (only 2 lifestyle posts < thresholds, no story slot). The page collapses to a dense, punchy catalog — supersized offset hero, value marquee, new-in rail, 4-up photo categories, the 40-item grid, a 6-up IG grid, trust badges, plain sign-up. **Same skeleton, same tokens, genuinely different site** — proving variety lives in tokens + imagery + per-section config, never in a different template.

---

**Key grounded facts confirmed against the codebase** (so the build matches reality): `ALLOWED_SECTION` is currently exactly `['hero','categories','featured','products']` in `shared/types/theme.ts`; `repairArtDirection` (`server/utils/theme/validate.ts`) already force-pins `hero` first and force-injects `products`; `index.put.ts` already zod-validates `artDirection.sectionOrder` via `enumOf(ALLOWED_SECTION)` and `persistTheme` is the single write path; `tokensToCssVars` emits `--ui-*` + `--t-*` and is untouched by this change; `StorefrontHome.vue` today is a `v-for ad.sections` with a `v-else-if` chain; migration 0010's public RLS is `used_as is not null AND active store`; `branding_assets` already has `mood_keywords`, `suggested_categories`, `hero_score`, `ig_permalink`, `source`; and `ThemeEditor.vue` already has the split-workspace sticky preview + device toggle + branding fetch + auto-hero manager we evolve into `WebsiteBuilder.vue`.