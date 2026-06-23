import type { H3Event } from 'h3'
import type Stripe from 'stripe'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

export interface StoreStripeAccount {
  stripe_account_id: string
  details_submitted: boolean
  charges_enabled: boolean
  payouts_enabled: boolean
  platform_fee_bps: number | null
}

// The connected-account row for a store (service-role). Null if not onboarded.
export async function getStripeAccountForStore(
  event: H3Event,
  storeId: string,
): Promise<StoreStripeAccount | null> {
  const { data } = await supabaseAdmin(event)
    .from('stripe_accounts')
    .select('stripe_account_id, details_submitted, charges_enabled, payouts_enabled, platform_fee_bps')
    .eq('store_id', storeId)
    .maybeSingle()
  return (data as StoreStripeAccount | null) ?? null
}

// Mirror a Stripe Account's capability flags into stripe_accounts. Keyed on the
// connected-account id so it works from both the admin sync endpoint and the
// account.updated webhook (where event.account is all we have). Returns the row's
// store_id + chargesEnabled so callers can gate side-effects (e.g. disabling cards).
export async function syncStripeAccountStatus(
  event: H3Event,
  acct: Stripe.Account,
): Promise<{ storeId: string; chargesEnabled: boolean } | null> {
  const { data, error } = await supabaseAdmin(event)
    .from('stripe_accounts')
    .update({
      details_submitted: !!acct.details_submitted,
      charges_enabled: !!acct.charges_enabled,
      payouts_enabled: !!acct.payouts_enabled,
      requirements: (acct.requirements ?? null) as unknown as Record<string, unknown> | null,
    })
    .eq('stripe_account_id', acct.id)
    .select('store_id, charges_enabled')
    .maybeSingle()
  if (error) {
    console.error('[stripe] account status sync failed', error)
    return null
  }
  if (!data) return null
  const row = data as { store_id: string; charges_enabled: boolean }
  return { storeId: row.store_id, chargesEnabled: row.charges_enabled }
}
