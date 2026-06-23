import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { stripe } from '~~/server/utils/stripe/client'
import { safeReturnPath } from '~~/shared/utils/safeReturn'

// Create (once) the store's Express connected account, then return a fresh, single-use
// onboarding Account Link. The admin Payments page calls this via $fetch and then does
// window.location = url. Account Links are short-lived, so we always mint a new one —
// which also serves the "refresh" landing when a link expires mid-onboarding.
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
    const acct = await s.accounts.create({
      type: 'express',
      country: (store as { default_country?: string | null } | null)?.default_country || undefined,
      business_profile: { name: (store as { name?: string } | null)?.name || undefined },
      metadata: { store_id: storeId },
    })
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

  // Optional onboarding-wizard return path; threaded through both links so it
  // survives the (possibly multi-hop) Stripe round-trip. Validated to a local path.
  const body = await readBody(event).catch(() => null)
  const returnTo = safeReturnPath((body as { return?: unknown } | null)?.return)
  const retQs = returnTo ? `&return=${encodeURIComponent(returnTo)}` : ''

  const link = await s.accountLinks.create({
    account: acctId,
    type: 'account_onboarding',
    refresh_url: adminUrl(`/stores/${storeId}/payments?stripe=refresh${retQs}`),
    return_url: adminUrl(`/stores/${storeId}/payments?stripe=return${retQs}`),
  })

  return { url: link.url }
})
