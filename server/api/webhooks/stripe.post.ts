import type Stripe from 'stripe'
import type { Json } from '~~/shared/types/database.types'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { stripe } from '~~/server/utils/stripe/client'
import { syncStripeAccountStatus } from '~~/server/utils/stripe/account'
import { bustStoreCache } from '~~/server/utils/tenant'
import { notifyNewOrder } from '~~/server/utils/email'
import type { CheckoutAnswer } from '~~/shared/types/checkout'

// Stripe webhook. Public + unauthenticated — trust is the signature over the RAW
// body (constructEventAsync). One endpoint serves BOTH platform events
// (payment_intent.*, charge.refunded — destination charges live on the platform
// account, no event.account) and connected-account events (account.updated, which
// carries event.account). Configure the endpoint to "listen on connected accounts".
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  if (!cfg.stripeWebhookSecret) throw createError({ statusCode: 503, statusMessage: 'Stripe webhook not configured' })

  const raw = (await readRawBody(event)) || ''
  const sig = getHeader(event, 'stripe-signature')
  if (!sig) throw createError({ statusCode: 400, statusMessage: 'Missing signature' })

  let evt: Stripe.Event
  try {
    evt = await stripe(event).webhooks.constructEventAsync(raw, sig, cfg.stripeWebhookSecret)
  } catch (e) {
    console.error('[stripe] bad webhook signature', (e as Error).message)
    throw createError({ statusCode: 400, statusMessage: 'Bad signature' })
  }

  const admin = supabaseAdmin(event)

  // Idempotency: skip if we've already processed this event id. We record it AFTER
  // successful processing (below) so a mid-failure retry reprocesses — every RPC
  // here is itself idempotent, so reprocessing is safe.
  const { data: seen } = await admin.from('webhook_events').select('id').eq('id', evt.id).maybeSingle()
  if (seen) return { received: true }

  let storeIdForLog: string | null = null

  try {
    switch (evt.type) {
      case 'payment_intent.succeeded': {
        const pi = evt.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.order_id
        const storeId = pi.metadata?.store_id
        if (!orderId || !storeId) break
        storeIdForLog = storeId
        const charge = typeof pi.latest_charge === 'string' ? pi.latest_charge : (pi.latest_charge?.id ?? null)
        const { error } = await admin.rpc('mark_order_paid_stripe', {
          p_order: orderId,
          p_store: storeId,
          p_pi: pi.id,
          p_charge: charge,
          p_amount: pi.amount_received || pi.amount,
          p_currency: pi.currency.toUpperCase(),
          p_raw: pi as unknown as Json,
        })
        if (error) throw error
        await onOrderPaid(event, admin, storeId, orderId)
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = evt.data.object as Stripe.PaymentIntent
        const orderId = pi.metadata?.order_id
        const storeId = pi.metadata?.store_id
        if (!orderId || !storeId) break
        storeIdForLog = storeId
        const { error } = await admin.rpc('mark_order_payment_failed_stripe', {
          p_order: orderId,
          p_store: storeId,
          p_pi: pi.id,
          p_amount: pi.amount,
          p_currency: pi.currency.toUpperCase(),
          p_raw: pi as unknown as Json,
        })
        if (error) throw error
        break
      }

      case 'charge.refunded': {
        const ch = evt.data.object as Stripe.Charge
        const piId = typeof ch.payment_intent === 'string' ? ch.payment_intent : ch.payment_intent?.id
        if (!piId) break
        let storeId = ch.metadata?.store_id
        if (!storeId) {
          const { data } = await admin.from('orders').select('store_id').eq('stripe_payment_intent_id', piId).maybeSingle()
          storeId = (data as { store_id?: string } | null)?.store_id
        }
        if (!storeId) break
        storeIdForLog = storeId
        const { error } = await admin.rpc('record_stripe_refund', {
          p_store: storeId,
          p_pi: piId,
          p_refunded_total: ch.amount_refunded,
          p_raw: ch as unknown as Json,
        })
        if (error) throw error
        break
      }

      case 'account.updated': {
        const acct = evt.data.object as Stripe.Account
        const res = await syncStripeAccountStatus(event, acct)
        if (res) {
          storeIdForLog = res.storeId
          // If a connected account loses charge capability, stop offering cards.
          if (!res.chargesEnabled) {
            const { data: s } = await admin.from('stores').select('subdomain, payment_methods').eq('id', res.storeId).maybeSingle()
            const methods = ((s as { payment_methods?: string[] } | null)?.payment_methods) ?? []
            if (methods.includes('stripe')) {
              await admin.from('stores').update({ payment_methods: methods.filter((m) => m !== 'stripe') }).eq('id', res.storeId)
              await bustStoreCache((s as { subdomain: string }).subdomain)
            }
          }
        }
        break
      }

      default:
        break
    }
  } catch (e) {
    // Signature is already verified, so a failure here is transient (DB). Return 5xx
    // so Stripe retries; we have NOT recorded the event, so the retry reprocesses.
    console.error('[stripe] webhook processing failed', evt.type, (e as Error).message)
    throw createError({ statusCode: 500, statusMessage: 'Processing error' })
  }

  // Mark processed (best-effort; a racing duplicate just hits the PK and is ignored).
  await admin.from('webhook_events').insert({ id: evt.id, type: evt.type, store_id: storeIdForLog })

  return { received: true }
})

// Post-payment side-effects: optional auto-confirm + notify the seller. Best-effort —
// failures here must not 500 the webhook (the payment is already recorded).
async function onOrderPaid(
  event: Parameters<typeof supabaseAdmin>[0],
  admin: ReturnType<typeof supabaseAdmin>,
  storeId: string,
  orderId: string,
) {
  try {
    const { data: store } = await admin
      .from('stores')
      .select('name, notify_email, auto_confirm_on_paid, base_currency')
      .eq('id', storeId)
      .maybeSingle()
    const s = store as
      | { name: string; notify_email: string | null; auto_confirm_on_paid: boolean; base_currency: string }
      | null
    if (!s) return

    if (s.auto_confirm_on_paid) {
      // Reuses the audited state-machine RPC; no human actor (webhook). Swallows
      // ILLEGAL_TRANSITION inside the outer try if the order already moved on.
      await admin.rpc('transition_order_status', {
        p_order: orderId,
        p_store: storeId,
        p_actor: null as unknown as string,
        p_target: 'confirmed',
      })
    }

    if (s.notify_email) {
      const { data: ord } = await admin
        .from('orders')
        .select('order_number, total_minor, currency, custom_fields')
        .eq('id', orderId)
        .maybeSingle()
      const o = ord as
        | { order_number?: string; total_minor?: number; currency?: string; custom_fields?: CheckoutAnswer[] | null }
        | null
      void notifyNewOrder({
        to: s.notify_email,
        storeName: s.name,
        orderNumber: o?.order_number ?? orderId,
        totalMinor: o?.total_minor ?? 0,
        currency: o?.currency ?? s.base_currency,
        customAnswers: o?.custom_fields ?? [],
      })
    }
  } catch (e) {
    console.error('[stripe] post-payment side-effects failed', (e as Error).message)
  }
}
