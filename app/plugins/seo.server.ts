import type { ResolvedStore } from '~~/shared/types/tenant'

// Per-tenant social-preview defaults for the storefront (Open Graph + Twitter
// cards) so the link looks great when pasted into a DM, an IG story/bio link, or
// WhatsApp — instead of rendering a blank gray box. Storefront-only (admin +
// marketing keep their own metadata). Page-level useSeoMeta() calls (e.g. the
// product page) override these per-property, and the titleTemplate suffixes the
// store name onto any page that sets its own title.
export default defineNuxtPlugin(() => {
  const event = useRequestEvent()
  const ctx = event?.context
  if (ctx?.surface !== 'store') return

  const store = ctx.store as ResolvedStore | null | undefined
  if (!store) return

  const { storeUrl } = useSurfaceUrls()
  const url = storeUrl(store.subdomain)
  // The branded 1200×630 card (server/api/storefront/og-image). It self-falls-back
  // to the bare logo if generation fails, so this is always a safe og:image.
  const ogImage = storeUrl(store.subdomain, '/api/storefront/og-image')
  const description = `Shop ${store.name} — browse the collection and order in a few taps.`

  // Default the storefront title to the store name (overriding the global app
  // title), and suffix it onto any page that sets its own title — e.g. a product
  // page becomes "<Product> · <Store>". The `!== store.name` guard keeps the home
  // page (which inherits this default) from doubling up to "<Store> · <Store>".
  useHead({
    title: store.name,
    titleTemplate: (title) => (title && title !== store.name ? `${title} · ${store.name}` : store.name),
  })

  useSeoMeta({
    description,
    ogSiteName: store.name,
    ogType: 'website',
    ogTitle: store.name,
    ogDescription: description,
    ogUrl: url,
    ogImage,
    twitterCard: 'summary_large_image',
    twitterTitle: store.name,
    twitterDescription: description,
    twitterImage: ogImage,
  })
})
