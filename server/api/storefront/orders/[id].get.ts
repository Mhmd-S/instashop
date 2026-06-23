import { serverSupabaseClient } from '#supabase/server'

// Guest order read-back: order_lookup(id, token) constant-time compares the stored
// access_token. Also scoped to the current tenant so store A can't render store B.
export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const id = getRouterParam(event, 'id') as string
  const token = String(getQuery(event).token ?? '')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Missing token' })

  const db = await serverSupabaseClient(event)
  const { data, error } = await db.rpc('order_lookup', { p_order: id, p_token: token })
  if (error) {
    console.error('[order_lookup]', error)
    throw createError({ statusCode: 500, statusMessage: 'Error' })
  }
  const order = data as { store_id?: string } | null
  if (!order || order.store_id !== store.id) {
    throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  }
  return { order }
})
