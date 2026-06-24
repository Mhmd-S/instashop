import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { bustStoreCache } from '~~/server/utils/tenant'
import { isSupportedCurrency } from '~~/shared/types/currency'

// Update store settings. Changing the currency relabels the WHOLE catalogue to the
// new code (price_minor amounts are NOT converted — there are no FX rates), so the
// store always shows a single, consistent currency. base_currency is read by the
// storefront via the tenant cache, so we bust it.
const Body = z.object({
  baseCurrency: z.string().length(3),
})

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid request' })
  const code = parsed.data.baseCurrency.toUpperCase()
  if (!isSupportedCurrency(code)) throw createError({ statusCode: 422, statusMessage: 'Unsupported currency' })

  const admin = supabaseAdmin(event)
  const { data: store } = await admin.from('stores').select('subdomain').eq('id', storeId).maybeSingle()
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  const { error } = await admin.from('stores').update({ base_currency: code }).eq('id', storeId)
  if (error) throw createError({ statusCode: 500, statusMessage: 'Could not update currency' })

  // Keep the catalogue single-currency: relabel every product to the new code.
  const { error: pErr } = await admin.from('products').update({ currency: code }).eq('store_id', storeId)
  if (pErr) throw createError({ statusCode: 500, statusMessage: 'Currency saved, but updating products failed' })

  await bustStoreCache((store as { subdomain: string }).subdomain)

  return { baseCurrency: code }
})
