import { serverSupabaseClient } from '#supabase/server'
import type { StorefrontProduct } from '~~/shared/types/product'

export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })
  const slug = getRouterParam(event, 'slug') as string

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('products')
    .select('id, title, slug, description, price_minor, currency, image_url')
    .eq('store_id', store.id)
    .eq('status', 'published')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load product' })
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  // Gallery (anon + RLS: only readable because the product is published + store active).
  const { data: images } = await db
    .from('product_images')
    .select('public_url, alt, is_video, video_url, position')
    .eq('product_id', (data as { id: string }).id)
    .order('position', { ascending: true })

  const product = {
    ...(data as unknown as StorefrontProduct),
    images: (images ?? []) as unknown as StorefrontProduct['images'],
  }
  return { product }
})
