import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// Mark a COD order paid (records a payment + order_event via the RPC state machine).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const orderId = getRouterParam(event, 'orderId') as string
  const { user } = await requireStoreAccess(event, storeId, 'staff')

  const admin = supabaseAdmin(event)
  const { error } = await admin.rpc('mark_order_paid_cod', {
    p_order: orderId,
    p_store: storeId,
    p_actor: user.id,
  })

  if (error) {
    const m = error.message || ''
    if (m.includes('ILLEGAL_TRANSITION')) throw createError({ statusCode: 422, statusMessage: 'Order is not unpaid' })
    if (m.includes('NOT_FOUND')) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
    console.error('[mark-paid]', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not mark paid' })
  }
  return { ok: true }
})
