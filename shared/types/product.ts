export type ProductStatus = 'draft' | 'published' | 'archived'
export type ProductSource = 'instagram' | 'manual'

// One image in a product's gallery (admin view).
export interface ProductImage {
  id: string
  public_url: string | null
  storage_path: string
  alt: string | null
  position: number
  is_video: boolean
  video_url: string | null
}

// Trimmed gallery image exposed to the public storefront.
export interface StorefrontImage {
  public_url: string | null
  alt: string | null
  is_video: boolean
  video_url: string | null
}

// Full product as seen by store staff in the admin.
export interface AdminProduct {
  id: string
  store_id: string
  source: ProductSource
  status: ProductStatus
  title: string
  slug: string
  description: string | null
  price_minor: number
  currency: string
  stock: number | null
  image_url: string | null
  position: number
  needs_review: boolean
  locked_by_seller: boolean
  created_at: string
  updated_at: string
  images?: ProductImage[]
  category_ids?: string[]
}

// Trimmed product exposed to the public storefront.
export interface StorefrontProduct {
  id: string
  title: string
  slug: string
  description: string | null
  price_minor: number
  currency: string
  image_url: string | null
  images?: StorefrontImage[]
}

// Format integer minor units as a currency string (e.g. 2400, 'USD' -> "$24.00").
export function formatPrice(minor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100)
  } catch {
    return `${(minor / 100).toFixed(2)} ${currency}`
  }
}
