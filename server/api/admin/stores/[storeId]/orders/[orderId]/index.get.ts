import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import type { OrderEvent, OrderItem } from '~~/shared/types/order'

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const orderId = getRouterParam(event, 'orderId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data: order } = await db
    .from('orders')
    .select('*')
    .eq('store_id', storeId)
    .eq('id', orderId)
    .maybeSingle()
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  const { data: items } = await db
    .from('order_items')
    .select('id, product_id, title_snapshot, image_url_snapshot, unit_price_minor, quantity, line_total_minor')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  const { data: events } = await db
    .from('order_events')
    .select('id, kind, from_value, to_value, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  return {
    order,
    items: (items ?? []) as unknown as OrderItem[],
    events: (events ?? []) as unknown as OrderEvent[],
  }
})
