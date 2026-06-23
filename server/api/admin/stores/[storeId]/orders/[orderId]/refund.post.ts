import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { stripe } from '~~/server/utils/stripe/client'

const Body = z.object({
  // Omit for a full refund of the remaining amount; pass minor units for a partial.
  amountMinor: z.number().int().positive().optional(),
})

// Refund a Stripe order (full or partial). The refund is created on the PLATFORM
// account against the PaymentIntent: reverse_transfer pulls funds back from the
// connected account, refund_application_fee returns our commission proportionally.
// We do NOT mutate payment_status here — the charge.refunded webhook calls
// record_stripe_refund, so there's a single source of truth (and refunds initiated
// from the Stripe dashboard reconcile the same way).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const orderId = getRouterParam(event, 'orderId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid request' })
  const { amountMinor } = parsed.data

  const admin = supabaseAdmin(event)
  const { data } = await admin
    .from('orders')
    .select('payment_method, payment_status, total_minor, stripe_payment_intent_id')
    .eq('store_id', storeId)
    .eq('id', orderId)
    .maybeSingle()
  const order = data as null | {
    payment_method: string
    payment_status: string
    total_minor: number
    stripe_payment_intent_id: string | null
  }
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  if (order.payment_method !== 'stripe' || !order.stripe_payment_intent_id) {
    throw createError({ statusCode: 422, statusMessage: 'Not a card order' })
  }
  if (!['paid', 'partially_refunded'].includes(order.payment_status)) {
    throw createError({ statusCode: 422, statusMessage: 'Order is not refundable' })
  }
  if (amountMinor != null && amountMinor > order.total_minor) {
    throw createError({ statusCode: 422, statusMessage: 'Refund exceeds the order total' })
  }

  try {
    const refund = await stripe(event).refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      ...(amountMinor != null ? { amount: amountMinor } : {}),
      reverse_transfer: true,
      refund_application_fee: true,
    })
    return { ok: true, refundId: refund.id, status: refund.status }
  } catch (e) {
    // Stripe rejects e.g. an already-fully-refunded charge or an over-amount.
    const msg = (e as { message?: string }).message || 'Refund failed'
    throw createError({ statusCode: 422, statusMessage: msg })
  }
})
