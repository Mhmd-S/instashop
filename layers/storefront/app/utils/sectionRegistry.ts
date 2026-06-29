import type { Component } from 'vue'
import type { ResolvedStore } from '~~/shared/types/tenant'
import type { StorefrontCategory } from '~~/shared/types/category'
import type { StorefrontProduct } from '~~/shared/types/product'
import type {
  FeaturedRailSection,
  MarqueeSection,
  PromiseSection,
  SectionConfig,
  SectionId,
} from '~~/shared/types/template'
import SectionHero from '../components/sections/SectionHero.vue'
import SectionMarquee from '../components/sections/SectionMarquee.vue'
import SectionShopByCategory from '../components/sections/SectionShopByCategory.vue'
import SectionFeaturedRail from '../components/sections/SectionFeaturedRail.vue'
import SectionProducts from '../components/sections/SectionProducts.vue'
import SectionPromise from '../components/sections/SectionPromise.vue'
import SectionNewsletter from '../components/sections/SectionNewsletter.vue'

// Everything a section component needs to render, resolved ONCE by StorefrontHome and
// passed down. Sections never fetch — so the exact same components can later be mounted
// in the in-admin live preview against builder-supplied data (preview == store).
export interface SectionRenderCtx {
  store: ResolvedStore | null
  products: StorefrontProduct[]
  categories: StorefrontCategory[]
  hero: { public_url: string | null; caption: string | null } | null
  heroLine: string
  // Whether the shopByCategory section will actually render (in the order, enabled, and
  // has categories) — so the hero's "Browse categories" CTA only shows when its scroll
  // target (#categories) exists. Mirrors shouldRenderSection's test for that section.
  hasCategorySection: boolean
}

// The dispatch table. Phase 1 registers the token + product-driven sections; the
// image-backed catalog (lifestyleBand, editorialSplit, lookbook, igFollow, brandStory)
// lands with the storefront branding endpoint in Phase 2/3. A section id in the saved
// composition but absent here is simply skipped — graceful, never an error.
export const SECTION_COMPONENTS: Partial<Record<SectionId, Component>> = {
  hero: SectionHero,
  marquee: SectionMarquee,
  shopByCategory: SectionShopByCategory,
  featuredRail: SectionFeaturedRail,
  products: SectionProducts,
  promise: SectionPromise,
  newsletter: SectionNewsletter,
}

// Render-time graceful degradation: drop a section whose data is too thin to look
// finished (no categories, too few products for a rail), so the page is ALWAYS great.
// Belt-and-braces alongside the server-side clamp.
export function shouldRenderSection(id: SectionId, config: SectionConfig, ctx: SectionRenderCtx): boolean {
  if (!SECTION_COMPONENTS[id]) return false
  if (config.enabled === false) return false
  switch (id) {
    case 'marquee':
      return (config as MarqueeSection).badges.length > 0
    case 'shopByCategory':
      return ctx.categories.length > 0
    case 'featuredRail':
      return ctx.products.length >= 4 && resolveRailProducts(config as FeaturedRailSection, ctx).length >= 2
    case 'promise':
      return (config as PromiseSection).badges.length > 0
    default:
      return true
  }
}

// Resolve a featured rail's products: curated refs (matched against the live catalogue)
// first, topped up with first-N published products so a partially-stale curation (e.g.
// a single surviving ref after others were deleted) still renders a full rail rather
// than disappearing. Shared by the guard + the component.
export function resolveRailProducts(config: FeaturedRailSection, ctx: SectionRenderCtx): StorefrontProduct[] {
  const refs = config.productRefs ?? []
  const byId = new Map(ctx.products.map((p) => [p.id, p]))
  const picked = refs.map((r) => byId.get(r.id)).filter((p): p is StorefrontProduct => !!p)
  if (picked.length >= 2) return picked.slice(0, 8)
  // Too few curated survivors — append the first published items to fill the rail.
  const seen = new Set(picked.map((p) => p.id))
  const out = [...picked]
  for (const p of ctx.products) {
    if (out.length >= 8) break
    if (!seen.has(p.id)) {
      out.push(p)
      seen.add(p.id)
    }
  }
  return out
}
