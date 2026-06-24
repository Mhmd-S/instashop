import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// Consolidated onboarding-wizard status: store basics + per-step completion signals
// in a single round-trip, so the wizard doesn't fan out to 5 endpoints.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data: store } = await db
    .from('stores')
    .select('id, name, subdomain, status, active_theme_id, payment_methods, onboarding_reviewed')
    .eq('id', storeId)
    .maybeSingle()
  if (!store) throw createError({ statusCode: 404, statusMessage: 'Store not found' })
  const s = store as {
    id: string; name: string; subdomain: string; status: string
    active_theme_id: string | null; payment_methods: string[] | null
    onboarding_reviewed: Record<string, boolean> | null
  }

  const admin = supabaseAdmin(event)
  const [ig, products, categories, branding, heroes, stripeAcct] = await Promise.all([
    admin.from('ig_accounts').select('token_status').eq('store_id', storeId).maybeSingle(),
    admin.from('products').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    admin.from('categories').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    admin.from('branding_assets').select('id', { count: 'exact', head: true }).eq('store_id', storeId),
    admin.from('branding_assets').select('id', { count: 'exact', head: true }).eq('store_id', storeId).eq('used_as', 'hero'),
    admin.from('stripe_accounts').select('charges_enabled').eq('store_id', storeId).maybeSingle(),
  ])

  if (ig.error || products.error || categories.error || branding.error || heroes.error || stripeAcct.error) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to load setup status' })
  }

  const productCount = products.count ?? 0
  const brandingCount = branding.count ?? 0
  // Mirror instagram.vue's `active`: a row whose token was revoked/expired/errored
  // needs reconnect, so it doesn't count as connected/done.
  const igToken = (ig.data as { token_status?: string } | null)?.token_status ?? ''
  const igActive = !!ig.data && !['revoked', 'expired', 'error'].includes(igToken)
  // Payments mirror the Payments page: "done" once Stripe can actually charge.
  const chargesEnabled = !!(stripeAcct.data as { charges_enabled?: boolean } | null)?.charges_enabled
  const stripeEnabled = (s.payment_methods ?? []).includes('stripe')
  // Theme/products/branding are auto-filled by the IG import, so they only count as
  // "done" once the seller has explicitly reviewed each inline in the wizard.
  const reviewed = s.onboarding_reviewed ?? {}

  return {
    store: { id: s.id, name: s.name, subdomain: s.subdomain, status: s.status },
    steps: {
      instagram: { done: igActive, connected: igActive },
      theme: { done: !!reviewed.theme },
      products: { done: !!reviewed.products, count: productCount },
      categories: { count: categories.count ?? 0 },
      branding: { done: !!reviewed.branding, count: brandingCount, heroSet: (heroes.count ?? 0) > 0 },
      payments: { done: chargesEnabled, connected: !!stripeAcct.data, chargesEnabled, enabled: stripeEnabled },
    },
  }
})
