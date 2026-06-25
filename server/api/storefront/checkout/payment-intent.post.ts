import { z } from 'zod'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { stripe, applicationFeeAmount } from '~~/server/utils/stripe/client'
import { getStripeAccountForStore } from '~~/server/utils/stripe/account'
import { getPlatformFeeBps } from '~~/server/utils/platformSettings'

const Body = z.object({
  orderId: z.string().uuid(),
  token: z.string().min(8),
})

// Create (or reuse) the PaymentIntent for an already-placed Stripe order. The amount
// is the server-stored order total — NEVER trusted from the client. Destination
// charge: funds settle to the store's connected account, application_fee = our cut.
// The client only needs the platform publishable key + this clientSecret.
export default defineEventHandler(async (event) => {
  const store = event.context.store
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid request' })
  const { orderId, token } = parsed.data

  const admin = supabaseAdmin(event)

  // Prove order ownership via the access token (constant-time, tenant-scoped).
  const { data: looked } = await admin.rpc('order_lookup', { p_order: orderId, p_token: token })
  const order = looked as null | {
    store_id: string
    status: string
    payment_method: string
    payment_status: string
    total_minor: number
    currency: string
    stripe_payment_intent_id: string | null
  }
  if (!order || order.store_id !== store.id) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  if (order.payment_method !== 'stripe') throw createError({ statusCode: 409, statusMessage: 'Order is not a card order' })
  if (order.status === 'cancelled') throw createError({ statusCode: 409, statusMessage: 'Order was cancelled' })
  if (!['unpaid', 'pending'].includes(order.payment_status)) {
    throw createError({ statusCode: 409, statusMessage: 'Order is already paid' })
  }

  const acct = await getStripeAccountForStore(event, store.id)
  if (!acct?.charges_enabled) {
    throw createError({ statusCode: 409, statusMessage: 'This store is not accepting card payments' })
  }

  const cfg = useRuntimeConfig(event)
  const publishableKey = cfg.public.stripePublishableKey
  if (!publishableKey) throw createError({ statusCode: 503, statusMessage: 'Stripe is not configured' })

  const amount = order.total_minor
  const currency = order.currency.toLowerCase()
  const s = stripe(event)

  // Reuse an existing PI on retries / page reloads if it still matches the order.
  if (order.stripe_payment_intent_id) {
    try {
      const pi = await s.paymentIntents.retrieve(order.stripe_payment_intent_id)
      const reusable =
        pi.amount === amount && pi.currency === currency && !['succeeded', 'canceled'].includes(pi.status)
      if (reusable && pi.client_secret) {
        return { clientSecret: pi.client_secret, publishableKey, amountMinor: amount, currency: order.currency }
      }
    } catch {
      // fall through and create a fresh PI
    }
  }

  const fee = applicationFeeAmount(amount, await getPlatformFeeBps(event))

  const pi = await s.paymentIntents.create(
    {
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
      metadata: { order_id: orderId, store_id: store.id },
      transfer_data: { destination: acct.stripe_account_id },
      ...(fee > 0 ? { application_fee_amount: fee } : {}),
    },
    // Per-order + amount idempotency: dedupes rapid double-submits; a changed total
    // (re-priced) yields a new key, hence a fresh PI.
    { idempotencyKey: `pi_${orderId}_${amount}` },
  )

  await admin.from('orders').update({ stripe_payment_intent_id: pi.id }).eq('id', orderId)

  return { clientSecret: pi.client_secret, publishableKey, amountMinor: amount, currency: order.currency }
})
