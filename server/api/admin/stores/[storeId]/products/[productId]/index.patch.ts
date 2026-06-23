import { z } from 'zod'
import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const Body = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  price_minor: z.number().int().min(0).max(100_000_000).optional(),
  stock: z.number().int().min(0).nullable().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  category_ids: z.array(z.string().uuid()).max(50).optional(),
})

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const productId = getRouterParam(event, 'productId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  // build a partial update from provided keys (slug stays stable on title edits)
  const patch = parsed.data
  const update: Record<string, unknown> = {}
  for (const k of ['title', 'description', 'price_minor', 'stock', 'status'] as const) {
    if (k in patch) update[k] = patch[k]
  }
  const hasCats = patch.category_ids !== undefined
  if (Object.keys(update).length === 0 && !hasCats) return { ok: true }
  // Any manual edit locks the product against AI re-sync auto-changes (0009).
  update.locked_by_seller = true

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('products')
    .update(update)
    .eq('store_id', storeId)
    .eq('id', productId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[products.update]', error)
    throw createError({ statusCode: 400, statusMessage: 'Could not update product' })
  }
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Product not found' })

  // Replace the product's category assignments (multi-category).
  if (hasCats) {
    const ids = patch.category_ids ?? []
    const admin = supabaseAdmin(event)
    if (ids.length) {
      const { data: valid } = await admin.from('categories').select('id').eq('store_id', storeId).in('id', ids)
      const validIds = new Set(((valid ?? []) as { id: string }[]).map((r) => r.id))
      if (!ids.every((i) => validIds.has(i))) {
        throw createError({ statusCode: 422, statusMessage: 'Unknown category' })
      }
    }
    await admin.from('product_categories').delete().eq('store_id', storeId).eq('product_id', productId)
    if (ids.length) {
      await admin
        .from('product_categories')
        .insert(ids.map((category_id) => ({ product_id: productId, category_id, store_id: storeId })))
    }
  }
  return { ok: true }
})
