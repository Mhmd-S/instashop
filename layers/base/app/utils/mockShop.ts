// The "Sage Studio" demo shop shown in the marketing hero + auth-panel mockups.
// Single source of truth so every surface (landing HeroMockStack, AuthShell, the
// FeatureMock import grid) portrays the SAME shop. The photos are committed under
// public/marketing — a curated subset of the same vetted catalogue the dev IG
// importer uses (server/utils/ig/fixtures/images.ts) — so the mock storefront shows
// REAL product photography and mirrors the editorial storefront Chanis generates.
// Auto-imported across layers (Nuxt app/utils, base layer = shared everywhere).

export interface MockProduct {
  name: string
  price: string
  image: string
}

export interface MockShop {
  name: string
  tagline: string
  handle: string
  domain: string
  /** Storefront category nav (mirrors the real StorefrontHeader's second row). */
  nav: string[]
  products: MockProduct[]
  /** The seller's IG feed — the "before": product + studio shots, real photos. */
  feed: string[]
  /** IG profile stats shown in the marketing hero's "before" feed tile. */
  ig: {
    posts: string
    followers: string
    following: string
  }
}

export const MOCK_SHOP: MockShop = {
  name: 'Sage Studio',
  tagline: 'Handmade ceramics',
  handle: 'sagestudio',
  domain: 'sage-studio.chanis.app',
  nav: ['All', 'Mugs', 'Bowls', 'Vases', 'Tableware'],
  products: [
    { name: 'Stoneware mug', price: '£38.00', image: '/marketing/sage-mug.jpg' },
    { name: 'Serving bowls', price: '£56.00', image: '/marketing/sage-bowls.jpg' },
    { name: 'Bud vase', price: '£44.00', image: '/marketing/sage-vases.jpg' },
    { name: 'Dinner plates', price: '£48.00', image: '/marketing/sage-plates.jpg' },
  ],
  feed: [
    '/marketing/sage-mug.jpg',
    '/marketing/sage-studio.jpg',
    '/marketing/sage-bowls.jpg',
    '/marketing/sage-planter.jpg',
    '/marketing/sage-vases.jpg',
    '/marketing/sage-wheel.jpg',
    '/marketing/sage-plates.jpg',
  ],
  ig: {
    posts: '128',
    followers: '12.4k',
    following: '312',
  },
}
