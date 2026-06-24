import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { stripe } from '~~/server/utils/stripe/client'
import { safeReturnPath } from '~~/shared/utils/safeReturn'

// Create (once) the store's Express connected account, then return a fresh, single-use
// onboarding Account Link. The shared PaymentsSetup component (mounted both in the
// onboarding wizard and on the standalone Payments page) calls this via $fetch and then
// does window.location = url. Account Links are short-lived, so we always mint a new one
// — which also serves the "refresh" landing when a link expires mid-onboarding.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const admin = supabaseAdmin(event)
  const s = stripe(event)

  const { data: existing } = await admin
    .from('stripe_accounts')
    .select('stripe_account_id')
    .eq('store_id', storeId)
    .maybeSingle()
  let acctId = (existing as { stripe_account_id?: string } | null)?.stripe_account_id

  if (!acctId) {
    const { data: store } = await admin
      .from('stores')
      .select('name, default_country')
      .eq('id', storeId)
      .maybeSingle()
    let acct
    try {
      acct = await s.accounts.create({
        type: 'express',
        country: (store as { default_country?: string | null } | null)?.default_country || undefined,
        business_profile: { name: (store as { name?: string } | null)?.name || undefined },
        metadata: { store_id: storeId },
      })
    } catch (err) {
      // Connect must be activated on the platform account before any connected
      // account can be created. This is a one-time platform setup at
      // https://dashboard.stripe.com/connect — not something the seller can fix —
      // so surface it as a 503 with a clear, actionable message instead of a 500.
      const msg = err instanceof Error ? err.message : ''
      if (/signed up for Connect/i.test(msg)) {
        console.error('[stripe] Connect not enabled on platform account', msg)
        throw createError({
          statusCode: 503,
          statusMessage: 'Stripe Connect is not enabled on the platform account. Enable it at https://dashboard.stripe.com/connect, then retry.',
        })
      }
      console.error('[stripe] account create failed', msg)
      throw createError({ statusCode: 502, statusMessage: 'Could not start Stripe onboarding' })
    }
    acctId = acct.id
    const { error } = await admin.from('stripe_accounts').insert({ store_id: storeId, stripe_account_id: acctId })
    if (error) {
      console.error('[stripe] account row insert', error)
      throw createError({ statusCode: 500, statusMessage: 'Could not start Stripe onboarding' })
    }
  }

  const base = useRuntimeConfig(event).public.appBaseDomain
  const proto = base.includes('lvh.me') || base.startsWith('localhost') || base.startsWith('127.') ? 'http' : 'https'
  const adminUrl = (path: string) => `${proto}://app.${base}${path}`

  // Stripe bounces the seller back to wherever they launched the flow: the onboarding
  // wizard when an explicit return path is given (so the flow keeps the wizard's
  // design), otherwise the standalone Payments page. The landing reads the ?stripe
  // marker to sync status / re-mint an expired link. Return path validated to a local
  // path; we append the marker with the right separator for its existing query.
  const body = await readBody(event).catch(() => null)
  const returnTo = safeReturnPath((body as { return?: unknown } | null)?.return)
  const landing = returnTo ?? `/stores/${storeId}/payments`
  const sep = landing.includes('?') ? '&' : '?'

  const link = await s.accountLinks.create({
    account: acctId,
    type: 'account_onboarding',
    refresh_url: adminUrl(`${landing}${sep}stripe=refresh`),
    return_url: adminUrl(`${landing}${sep}stripe=return`),
  })

  return { url: link.url }
})
