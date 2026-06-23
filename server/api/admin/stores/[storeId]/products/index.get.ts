import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import type { AdminProduct } from '~~/shared/types/product'

const COLS =
  'id, store_id, source, status, title, slug, description, price_minor, currency, stock, image_url, position, needs_review, created_at, updated_at'

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('products')
    .select(COLS)
    .eq('store_id', storeId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load products' })
  return { products: (data ?? []) as unknown as AdminProduct[] }
})
