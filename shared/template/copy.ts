import type { CopySlot } from '~~/shared/types/template'

// Vetted, templated section copy. The storefront NEVER renders free-form model or
// seller text for section headings — a section config carries a CopySlot id, and
// this table resolves it to a real eyebrow + heading (with the store name
// interpolated where `{store}` appears). This is what keeps H6 intact for copy:
// the model picks a slot from the allowlist; the strings live in version control.
export interface ResolvedCopy {
  eyebrow: string
  heading: string
}

const COPY: Record<CopySlot, ResolvedCopy> = {
  'new-arrivals': { eyebrow: 'Just landed', heading: 'New arrivals' },
  'shop-the-look': { eyebrow: 'As seen on us', heading: 'Shop the look' },
  'best-sellers': { eyebrow: 'Loved by many', heading: 'Best sellers' },
  'as-seen-on-ig': { eyebrow: 'From the feed', heading: 'As seen on Instagram' },
  'our-story': { eyebrow: 'Our story', heading: 'Made by {store}' },
  'the-collection': { eyebrow: 'The collection', heading: 'Shop all' },
  featured: { eyebrow: 'Featured', heading: 'The edit' },
  'follow-along': { eyebrow: '@{store}', heading: 'Follow along' },
  restocked: { eyebrow: 'Back in stock', heading: 'Restocked' },
  'shop-all': { eyebrow: 'Everything', heading: 'Shop all' },
  browse: { eyebrow: 'Browse', heading: 'Shop by category' },
}

// Resolve a copy slot to its eyebrow + heading, interpolating the store name.
export function resolveCopy(slot: CopySlot, storeName?: string | null): ResolvedCopy {
  const c = COPY[slot] ?? COPY['shop-all']
  const name = (storeName ?? '').trim() || 'the shop'
  return {
    eyebrow: c.eyebrow.replace('{store}', name),
    heading: c.heading.replace('{store}', name),
  }
}
