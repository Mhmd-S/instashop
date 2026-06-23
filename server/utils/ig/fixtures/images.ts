// Verified, stable Unsplash photo IDs for the DEV-ONLY fixture importer, bucketed
// by niche + role (product vs lifestyle) from a visual review. images.unsplash.com
// serves these directly (200, no redirect), so they pass the re-host SSRF guard via
// the dev-only host allowlist in rehost.ts. Product posts bind to `product` photos,
// branding posts bind to `lifestyle` photos.

export interface NichePool {
  product: string[]
  lifestyle: string[]
  logo: string // profile-picture stand-in (drives logo→theme colour derivation)
}

export const IMAGE_POOLS: Record<string, NichePool> = {
  apparel: {
    product: [
      '1490481651871-ab68de25d43d', // neutral clothing rack
      '1556905055-8f358a7a47b2', // folded clothing stack
      '1551488831-00ddcb6c6bd3', // boutique clothing rack
      '1521572163474-6864f9cf17ab', // white tee
      '1576566588028-4147f3842f27', // printed tee flatlay
      '1542291026-7eec264c27ff', // footwear
    ],
    lifestyle: [
      '1539109136881-3be0616acf4b', // model in denim outdoors
      '1483985988355-763728e1935b', // fashion portrait
      '1441986300917-64674bd600d8', // shop interior
    ],
    logo: '1490481651871-ab68de25d43d',
  },
  jewelry: {
    product: [
      '1515562141207-7a88fb7ce338', // pearl necklace
      '1605100804763-247f67b3557e', // diamond ring
      '1611591437281-460bfbe1220a', // rings on pink
      '1599643478518-a784e5dc4c8f', // gold pendant
      '1535632787350-4e68ef0ac584', // earrings
      '1573408301185-9146fe634ad0', // bracelet
      '1608042314453-ae338d80c427', // rings on dish
    ],
    lifestyle: [
      '1611652022419-a9419f74343d', // necklace worn by model
      '1483985988355-763728e1935b', // portrait
    ],
    logo: '1515562141207-7a88fb7ce338',
  },
  coffee: {
    product: [
      '1447933601403-0c6688de566e', // roasted beans
      '1559056199-641a0ac8b55e', // coffee bag
      '1521302080334-4bebac2763a6', // black coffee, top-down
      '1509440159596-0249088772ff', // baked goods / bread
    ],
    lifestyle: [
      '1495474472287-4d71bcdd2085', // lattes on a table
      '1442512595331-e89e73853f31', // espresso machine / counter
      '1453614512568-c4024d13c247', // cafe interior
      '1556760544-74068565f05c', // barista pouring
      '1519682577862-22b62b24e493', // coffee + book flatlay
      '1556740758-90de374c12ad', // bright cafe interior
    ],
    logo: '1559056199-641a0ac8b55e',
  },
  ceramics: {
    product: [
      '1514228742587-6b1558fcca3d', // white mug
      '1530018607912-eff2daa1bac4', // planters / plants
      '1610701596007-11502861dcfa', // stacked bowls
      '1578749556568-bc2c40e68b61', // stacked plates
      '1565193566173-7a0ee3dbe261', // white vases
    ],
    lifestyle: [
      '1493106641515-6b5631de4bb9', // hands at the pottery wheel
      '1441986300917-64674bd600d8', // studio interior
    ],
    logo: '1514228742587-6b1558fcca3d',
  },
}

export function unsplashUrl(id: string, w = 1080, h = 1080): string {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&fm=jpg&q=75`
}
