import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const Body = z.object({ target_id: z.string().uuid() })

// Merge this category (source) into `target_id`: move all product assignments to
// the target (skipping duplicates), then delete the source category.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const sourceId = getRouterParam(event, 'categoryId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid target' })
  const targetId = parsed.data.target_id
  if (targetId === sourceId) throw createError({ statusCode: 422, statusMessage: 'Cannot merge into self' })

  const admin = supabaseAdmin(event)
  // confirm both belong to the store
  const { data: cats } = await admin
    .from('categories')
    .select('id')
    .eq('store_id', storeId)
    .in('id', [sourceId, targetId])
  if (((cats ?? []) as { id: string }[]).length !== 2) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  const { data: links } = await admin
    .from('product_categories')
    .select('product_id')
    .eq('store_id', storeId)
    .eq('category_id', sourceId)
  const rows = ((links ?? []) as { product_id: string }[]).map((l) => ({
    product_id: l.product_id,
    category_id: targetId,
    store_id: storeId,
  }))
  if (rows.length) {
    await admin.from('product_categories').upsert(rows, { onConflict: 'product_id,category_id', ignoreDuplicates: true })
  }
  await admin.from('categories').delete().eq('store_id', storeId).eq('id', sourceId)

  return { ok: true, moved: rows.length }
})
