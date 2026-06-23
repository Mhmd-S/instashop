import type { IgMedia } from '../client'
import { FIXTURES, type FixtureShop } from './data'
import { IMAGE_POOLS, unsplashUrl } from './images'

export const FIXTURE_KEYS = Object.keys(FIXTURES)

export interface BuiltFixture {
  key: string
  shopName: string
  niche: string
  baseCurrency: string
  profilePictureUrl: string
  media: IgMedia[]
  expected: { products: number; branding: number }
}

// Deterministic, descending timestamps (newest post first, like /me/media).
const BASE_TS = Date.parse('2026-05-01T12:00:00Z')
const DAY = 86_400_000

// Turn an authored fixture shop into IgMedia[] with real, bound stock-photo URLs.
// Product posts draw from the niche `product` pool, branding posts from `lifestyle`,
// each cursor advancing so distinct items get distinct photos where the pool allows.
export function buildFixture(key: string): BuiltFixture | null {
  const f: FixtureShop | undefined = FIXTURES[key]
  const pool = IMAGE_POOLS[key]
  if (!f || !pool) return null

  const branding = new Set(f.expectations.brandingLocalIds)
  let productCursor = 0
  let lifestyleCursor = 0
  const pick = (isBrand: boolean): string => {
    const arr = isBrand ? pool.lifestyle : pool.product
    const i = isBrand ? lifestyleCursor++ : productCursor++
    return unsplashUrl(arr[i % arr.length]!)
  }

  const media: IgMedia[] = f.posts.map((p, idx) => {
    const isBrand = branding.has(p.localId)
    const count = Math.max(1, p.imageDescriptions.length)
    const urls = Array.from({ length: count }, () => pick(isBrand))
    const id = `fixture_${key}_${p.localId}`
    const timestamp = new Date(BASE_TS - idx * DAY).toISOString()
    const permalink = `https://www.instagram.com/p/${id}/`

    if (p.mediaType === 'CAROUSEL_ALBUM') {
      return {
        id,
        caption: p.caption,
        media_type: 'CAROUSEL_ALBUM',
        media_url: urls[0],
        permalink,
        timestamp,
        children: { data: urls.map((u, i) => ({ id: `${id}_c${i}`, media_type: 'IMAGE', media_url: u })) },
      }
    }
    if (p.mediaType === 'VIDEO') {
      return { id, caption: p.caption, media_type: 'VIDEO', media_url: urls[0], thumbnail_url: urls[0], permalink, timestamp }
    }
    return { id, caption: p.caption, media_type: 'IMAGE', media_url: urls[0], permalink, timestamp }
  })

  return {
    key,
    shopName: f.shop.name,
    niche: f.shop.niche,
    baseCurrency: f.shop.baseCurrency,
    profilePictureUrl: unsplashUrl(pool.logo, 320, 320),
    media,
    expected: { products: f.expectations.products.length, branding: f.expectations.brandingLocalIds.length },
  }
}
