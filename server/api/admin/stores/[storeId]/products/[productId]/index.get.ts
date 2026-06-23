import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import type { AdminProduct } from '~~/shared/types/product'

const COLS =
  'id, store_id, source, status, title, slug, description, price_minor, currency, stock, image_url, position, locked_by_seller, created_at, updated_at'

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('products')
    .select(COLS)
    .eq('store_id', storeId)
    .eq('id', productId)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load product' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  const { data: images } = await db
    .from('product_images')
    .select('id, public_url, storage_path, alt, position, is_video, video_url')
    .eq('store_id', storeId)
    .eq('product_id', productId)
    .order('position', { ascending: true })

  const { data: cats } = await db
    .from('product_categories')
    .select('category_id')
    .eq('store_id', storeId)
    .eq('product_id', productId)
  const category_ids = ((cats ?? []) as { category_id: string }[]).map((c) => c.category_id)

  return {
    product: { ...(data as object), images: images ?? [], category_ids } as unknown as AdminProduct,
  }
})
