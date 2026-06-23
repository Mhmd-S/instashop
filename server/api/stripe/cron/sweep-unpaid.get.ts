import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { stripe } from '~~/server/utils/stripe/client'

// Daily sweep of abandoned Stripe orders. Order-first checkout decrements stock at
// placement, so card orders that were never paid would hold inventory forever.
// We cancel the open PaymentIntent, then transition the order to 'cancelled' (which
// restocks idempotently). Guarded by the cron Bearer secret, like the IG cron.
//
// `?olderThan=<interval>` overrides the default window (testing convenience); it's
// passed as a parameterized RPC arg, never interpolated.
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  if (!cfg.cronSecret) throw createError({ statusCode: 503, statusMessage: 'Cron is not configured' })

  const auth = getHeader(event, 'authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : auth
  if (token !== cfg.cronSecret) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const olderThan = String(getQuery(event).olderThan || '24 hours')
  const admin = supabaseAdmin(event)
  const { data, error } = await admin.rpc('list_stale_stripe_orders', {
    p_older_than: olderThan as unknown as string,
  })
  if (error) {
    console.error('[stripe sweep] list', error)
    throw createError({ statusCode: 500, statusMessage: 'Sweep failed' })
  }

  const rows = (data ?? []) as Array<{ order_id: string; store_id: string; pi: string | null }>
  let cancelled = 0
  let skipped = 0

  for (const r of rows) {
    let safeToCancel = true

    // Cancel the PaymentIntent first. If it can't be canceled because it actually
    // succeeded/processing (a payment that raced the sweep), leave the order alone.
    if (r.pi) {
      try {
        await stripe(event).paymentIntents.cancel(r.pi)
      } catch {
        try {
          const pi = await stripe(event).paymentIntents.retrieve(r.pi)
          if (pi.status === 'succeeded' || pi.status === 'processing') safeToCancel = false
        } catch {
          safeToCancel = false // can't verify → be conservative, don't cancel the order
        }
      }
    }

    if (!safeToCancel) {
      skipped++
      continue
    }

    const { error: tErr } = await admin.rpc('transition_order_status', {
      p_order: r.order_id,
      p_store: r.store_id,
      p_actor: null as unknown as string,
      p_target: 'cancelled',
    })
    if (tErr) {
      console.error('[stripe sweep] cancel', r.order_id, tErr.message)
      skipped++
      continue
    }
    cancelled++
  }

  return { ok: true, scanned: rows.length, cancelled, skipped }
})
