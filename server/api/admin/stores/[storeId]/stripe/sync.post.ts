import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { stripe } from '~~/server/utils/stripe/client'
import { syncStripeAccountStatus } from '~~/server/utils/stripe/account'
import { bustStoreCache } from '~~/server/utils/tenant'

// Pull the latest capability flags from Stripe and persist them. Called on the
// onboarding return landing so the seller sees charges_enabled immediately, without
// waiting for the account.updated webhook.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const admin = supabaseAdmin(event)
  const { data } = await admin
    .from('stripe_accounts')
    .select('stripe_account_id')
    .eq('store_id', storeId)
    .maybeSingle()
  const acctId = (data as { stripe_account_id?: string } | null)?.stripe_account_id
  if (!acctId) throw createError({ statusCode: 404, statusMessage: 'Not connected' })

  const acct = await stripe(event).accounts.retrieve(acctId)
  await syncStripeAccountStatus(event, acct)

  // Connecting Stripe is the seller's intent to take cards, so once the account can
  // charge, switch 'stripe' on by default — this replaces the onboarding toggle. Only
  // ever ADD here (never remove) so a later "off" in settings isn't fought by syncs.
  if (acct.charges_enabled) {
    const { data: store } = await admin
      .from('stores')
      .select('subdomain, payment_methods')
      .eq('id', storeId)
      .maybeSingle()
    const sub = (store as { subdomain?: string } | null)?.subdomain
    const methods = new Set(((store as { payment_methods?: string[] } | null)?.payment_methods) ?? [])
    if (sub && !methods.has('stripe')) {
      methods.add('stripe')
      const { error } = await admin.from('stores').update({ payment_methods: [...methods] }).eq('id', storeId)
      if (!error) await bustStoreCache(sub)
    }
  }

  return {
    chargesEnabled: !!acct.charges_enabled,
    detailsSubmitted: !!acct.details_submitted,
    payoutsEnabled: !!acct.payouts_enabled,
  }
})
