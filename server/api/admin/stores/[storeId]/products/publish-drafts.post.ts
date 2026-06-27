import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'

// Bulk-publish the store's priced unpublished products in one shot — the onboarding
// "Next" on the products step takes the imported drafts live. We deliberately skip
// unpublished products with no price (price_minor 0): imports only carry a price when
// the caption stated one, so publishing those would push $0.00 listings to the
// storefront. Mirrors the single-product publish, which also locks the row against AI
// re-sync auto-changes once a seller commits it live.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('products')
    .update({ published: true, locked_by_seller: true })
    .eq('store_id', storeId)
    .eq('published', false)
    .gt('price_minor', 0)
    .select('id')

  if (error) {
    console.error('[products.publish-drafts]', error)
    throw createError({ statusCode: 400, statusMessage: 'Could not publish products' })
  }
  return { published: (data ?? []).length }
})
