export interface Category {
  id: string
  slug: string
  name: string
  description: string | null
  position: number
  source: 'ai' | 'manual'
}

export interface CategoryWithCount extends Category {
  product_count: number
}

// Trimmed category for the public storefront.
export interface StorefrontCategory {
  slug: string
  name: string
}
