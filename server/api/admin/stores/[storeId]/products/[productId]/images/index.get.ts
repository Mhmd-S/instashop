import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import type { ProductImage } from '~~/shared/types/product'

// List a product's gallery images (admin), ordered by position.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('product_images')
    .select('id, public_url, storage_path, alt, position, is_video, video_url')
    .eq('store_id', storeId)
    .eq('product_id', productId)
    .order('position', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load images' })
  return { images: (data ?? []) as unknown as ProductImage[] }
})
