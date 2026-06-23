import { serverSupabaseClient } from '#supabase/server'
import type { StorefrontProduct } from '~~/shared/types/product'

// Published products of the current tenant (resolved from Host by the tenant
// middleware). Anon client → RLS only returns published rows of active stores.
export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const db = await serverSupabaseClient(event)

  // Optional ?category=<slug> filter → restrict to products in that category.
  const categorySlug = getQuery(event).category
  let productIds: string[] | null = null
  if (typeof categorySlug === 'string' && categorySlug) {
    const { data: cat } = await db
      .from('categories')
      .select('id')
      .eq('store_id', store.id)
      .eq('slug', categorySlug)
      .maybeSingle()
    if (!cat) return { products: [] }
    const { data: links } = await db
      .from('product_categories')
      .select('product_id')
      .eq('store_id', store.id)
      .eq('category_id', (cat as { id: string }).id)
    productIds = ((links ?? []) as { product_id: string }[]).map((l) => l.product_id)
    if (!productIds.length) return { products: [] }
  }

  let query = db
    .from('products')
    .select('id, title, slug, description, price_minor, currency, image_url')
    .eq('store_id', store.id)
    .eq('status', 'published')
  if (productIds) query = query.in('id', productIds)
  const { data, error } = await query
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load products' })
  return { products: (data ?? []) as unknown as StorefrontProduct[] }
})
