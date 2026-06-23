import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import type { OrderSummary } from '~~/shared/types/order'

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('orders')
    .select('id, order_number, status, payment_status, total_minor, currency, contact_name, contact_email, placed_at')
    .eq('store_id', storeId)
    .order('placed_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load orders' })
  return { orders: (data ?? []) as unknown as OrderSummary[] }
})
