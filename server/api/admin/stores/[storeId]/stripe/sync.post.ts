import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { stripe } from '~~/server/utils/stripe/client'
import { syncStripeAccountStatus } from '~~/server/utils/stripe/account'

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

  return {
    chargesEnabled: !!acct.charges_enabled,
    detailsSubmitted: !!acct.details_submitted,
    payoutsEnabled: !!acct.payouts_enabled,
  }
})
