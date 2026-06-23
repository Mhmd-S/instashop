import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'

// Deletes the product row (product_images cascade via FK). Storage objects are left
// for a later cleanup job — noted as M2 debt.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { error } = await db.from('products').delete().eq('store_id', storeId).eq('id', productId)
  if (error) {
    console.error('[products.delete]', error)
    throw createError({ statusCode: 400, statusMessage: 'Could not delete product' })
  }
  return { ok: true }
})
