import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const MAX_BYTES = 8 * 1024 * 1024

// Upload a product image to the public store-media bucket (via service-role) and set
// it as the product's primary image.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.filename)
  if (!file) throw createError({ statusCode: 422, statusMessage: 'No file uploaded' })

  const type = file.type || 'application/octet-stream'
  if (!type.startsWith('image/')) throw createError({ statusCode: 422, statusMessage: 'File must be an image' })
  if (file.data.length > MAX_BYTES) throw createError({ statusCode: 413, statusMessage: 'Image too large (max 8MB)' })

  // confirm the product belongs to this store
  const userDb = await serverSupabaseClient(event)
  const { data: prod } = await userDb
    .from('products')
    .select('id')
    .eq('store_id', storeId)
    .eq('id', productId)
    .maybeSingle()
  if (!prod) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  const admin = supabaseAdmin(event)
  const ext = (type.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace('+xml', '')
  const path = `${storeId}/products/${productId}/${Date.now()}.${ext}`

  const { error: upErr } = await admin.storage
    .from('store-media')
    .upload(path, file.data, { contentType: type, upsert: true })
  if (upErr) {
    console.error('[products.image]', upErr)
    throw createError({ statusCode: 500, statusMessage: 'Upload failed' })
  }

  const publicUrl = admin.storage.from('store-media').getPublicUrl(path).data.publicUrl

  // Append to the gallery at the next position (first image lands at 0 = primary).
  const { data: last } = await admin
    .from('product_images')
    .select('position')
    .eq('product_id', productId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPos = ((last as { position?: number } | null)?.position ?? -1) + 1

  await admin
    .from('product_images')
    .insert({ product_id: productId, store_id: storeId, storage_path: path, public_url: publicUrl, position: nextPos })
  // Manual curation: protect from AI re-sync auto-attach; mirror the primary image.
  await admin.from('products').update({ locked_by_seller: true }).eq('store_id', storeId).eq('id', productId)
  await admin.rpc('sync_primary_image', { p_product: productId, p_store: storeId })

  return { image_url: publicUrl, position: nextPos }
})
