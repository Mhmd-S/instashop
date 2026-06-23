import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { bustStoreCache } from '~~/server/utils/tenant'

const Body = z.object({
  enableStripe: z.boolean().optional(),
  platformFeeBps: z.number().int().min(0).max(10000).nullable().optional(),
})

// Toggle card payments and set the per-store application fee. Enabling 'stripe'
// requires the connected account to have charges_enabled, so a half-onboarded store
// can never accept cards. Busts the tenant cache so the storefront sees it at once.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid request' })
  const b = parsed.data

  const admin = supabaseAdmin(event)
  const { data: store } = await admin
    .from('stores')
    .select('subdomain, payment_methods')
    .eq('id', storeId)
    .maybeSingle()
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })
  const sub = (store as { subdomain: string }).subdomain
  const methods = new Set(((store as { payment_methods?: string[] }).payment_methods) ?? [])

  if (b.enableStripe != null) {
    if (b.enableStripe) {
      const { data: acct } = await admin
        .from('stripe_accounts')
        .select('charges_enabled')
        .eq('store_id', storeId)
        .maybeSingle()
      if (!(acct as { charges_enabled?: boolean } | null)?.charges_enabled) {
        throw createError({ statusCode: 422, statusMessage: 'Finish Stripe onboarding before accepting cards' })
      }
      methods.add('stripe')
    } else {
      methods.delete('stripe')
    }
    const { error } = await admin.from('stores').update({ payment_methods: [...methods] }).eq('id', storeId)
    if (error) throw createError({ statusCode: 500, statusMessage: 'Could not update payment methods' })
    await bustStoreCache(sub)
  }

  if (b.platformFeeBps !== undefined) {
    const { error } = await admin
      .from('stripe_accounts')
      .update({ platform_fee_bps: b.platformFeeBps })
      .eq('store_id', storeId)
    if (error) throw createError({ statusCode: 500, statusMessage: 'Could not update fee' })
  }

  return { ok: true }
})
