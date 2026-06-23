import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { mergeCheckoutConfig } from '~~/shared/types/checkout'

// Load the store's checkout-question config for the admin editor. Always returns a
// complete, ordered config (empty/never-configured stores fall back to defaults).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const admin = supabaseAdmin(event)
  const { data } = await admin.from('stores').select('checkout_config').eq('id', storeId).maybeSingle()
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  return { config: mergeCheckoutConfig((data as { checkout_config?: unknown }).checkout_config) }
})
