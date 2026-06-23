import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'

// Images belonging to the store's OTHER products, grouped by product. This is the
// source list for the "reuse an image" picker in the product editor — the seller
// picks images here and copy.post.ts duplicates them into the current product.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('product_images')
    .select('id, public_url, alt, is_video, position, product_id, products!inner(title)')
    .eq('store_id', storeId)
    .neq('product_id', productId)
    .order('position', { ascending: true })
  if (error) {
    console.error('[images.library]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to load image library' })
  }

  type Row = {
    id: string
    public_url: string | null
    alt: string | null
    is_video: boolean
    position: number
    product_id: string
    products: { title: string } | { title: string }[] | null
  }
  type LibImage = { id: string; public_url: string; alt: string | null; is_video: boolean }
  type LibProduct = { id: string; title: string; images: LibImage[] }

  const groups = new Map<string, LibProduct>()
  for (const r of (data ?? []) as Row[]) {
    if (!r.public_url) continue // only displayable images are useful as picker sources
    const title = Array.isArray(r.products) ? r.products[0]?.title : r.products?.title
    let g = groups.get(r.product_id)
    if (!g) {
      g = { id: r.product_id, title: title ?? 'Untitled', images: [] }
      groups.set(r.product_id, g)
    }
    g.images.push({ id: r.id, public_url: r.public_url, alt: r.alt, is_video: r.is_video })
  }

  const products = [...groups.values()].sort((a, b) => a.title.localeCompare(b.title))
  return { products }
})
