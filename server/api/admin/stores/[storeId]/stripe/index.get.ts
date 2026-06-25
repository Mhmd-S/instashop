import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// Stripe Connect status for a store (admin). No secrets to hide — destination
// charges run on the platform account, so we only ever store the acct_… id.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const admin = supabaseAdmin(event)
  const { data } = await admin
    .from('stripe_accounts')
    .select('stripe_account_id, details_submitted, charges_enabled, payouts_enabled, connected_at')
    .eq('store_id', storeId)
    .maybeSingle()

  const { data: s } = await admin.from('stores').select('payment_methods').eq('id', storeId).maybeSingle()
  const methods = ((s as { payment_methods?: string[] } | null)?.payment_methods) ?? []

  const acct = data as null | {
    stripe_account_id: string
    details_submitted: boolean
    charges_enabled: boolean
    payouts_enabled: boolean
    connected_at: string
  }

  return {
    connected: !!acct,
    chargesEnabled: !!acct?.charges_enabled,
    stripeEnabled: methods.includes('stripe'),
    account: acct,
  }
})
