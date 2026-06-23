import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// Delete one gallery image: remove the storage object + row, re-pack positions,
// and re-mirror the product's primary image_url.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  const imageId = getRouterParam(event, 'imageId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const userDb = await serverSupabaseClient(event)
  const { data: img } = await userDb
    .from('product_images')
    .select('id, storage_path')
    .eq('store_id', storeId)
    .eq('product_id', productId)
    .eq('id', imageId)
    .maybeSingle()
  if (!img) throw createError({ statusCode: 404, statusMessage: 'Image not found' })

  const admin = supabaseAdmin(event)
  const storagePath = (img as { storage_path: string }).storage_path
  if (storagePath) await admin.storage.from('store-media').remove([storagePath])
  await admin.from('product_images').delete().eq('store_id', storeId).eq('id', imageId)

  // Re-pack remaining positions to 0..n so position-0 stays the primary.
  const { data: rest } = await admin
    .from('product_images')
    .select('id')
    .eq('product_id', productId)
    .order('position', { ascending: true })
  let pos = 0
  for (const r of (rest ?? []) as { id: string }[]) {
    await admin.from('product_images').update({ position: pos }).eq('id', r.id)
    pos++
  }
  await admin.rpc('sync_primary_image', { p_product: productId, p_store: storeId })

  return { ok: true }
})
