import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const Body = z.object({
  status: z.enum(['pending', 'confirmed', 'fulfilled', 'cancelled', 'refunded']),
})

// The state-machine check + update + event + restock are done atomically in the
// transition_order_status RPC (FOR UPDATE lock) — no TOCTOU, no double-restock.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const orderId = getRouterParam(event, 'orderId') as string
  const { user } = await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid status' })

  const admin = supabaseAdmin(event)
  const { error } = await admin.rpc('transition_order_status', {
    p_order: orderId,
    p_store: storeId,
    p_actor: user.id,
    p_target: parsed.data.status,
  })

  if (error) {
    const m = error.message || ''
    if (m.includes('ILLEGAL_TRANSITION')) throw createError({ statusCode: 422, statusMessage: 'Illegal status transition' })
    if (m.includes('NOT_FOUND')) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
    console.error('[order.transition]', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not update order' })
  }
  return { ok: true }
})
