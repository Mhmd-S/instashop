import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const Body = z.object({ ids: z.array(z.string().uuid()).min(1) })

// Reorder a product's gallery: `ids` is the desired order (index = position).
// Moving an image to ids[0] makes it the primary. Re-mirrors products.image_url.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid order' })

  // Confirm every id belongs to this product+store before writing.
  const userDb = await serverSupabaseClient(event)
  const { data: owned } = await userDb
    .from('product_images')
    .select('id')
    .eq('store_id', storeId)
    .eq('product_id', productId)
  const ownedIds = new Set(((owned ?? []) as { id: string }[]).map((r) => r.id))
  if (!parsed.data.ids.every((id) => ownedIds.has(id))) {
    throw createError({ statusCode: 422, statusMessage: 'Unknown image in order' })
  }

  const admin = supabaseAdmin(event)
  let pos = 0
  for (const id of parsed.data.ids) {
    await admin.from('product_images').update({ position: pos }).eq('id', id).eq('store_id', storeId)
    pos++
  }
  await admin.from('products').update({ locked_by_seller: true }).eq('store_id', storeId).eq('id', productId)
  await admin.rpc('sync_primary_image', { p_product: productId, p_store: storeId })

  return { ok: true }
})
