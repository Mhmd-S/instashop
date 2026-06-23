import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// Delete a category. product_categories rows cascade via FK (products are not
// touched — they just lose this category).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const categoryId = getRouterParam(event, 'categoryId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const admin = supabaseAdmin(event)
  const { error } = await admin.from('categories').delete().eq('store_id', storeId).eq('id', categoryId)
  if (error) throw createError({ statusCode: 400, statusMessage: 'Could not delete category' })
  return { ok: true }
})
