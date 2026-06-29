import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import type { BrandingAsset } from '~~/shared/types/branding'

// List captured branding/lifestyle posts (non-product imagery) for the store.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const admin = supabaseAdmin(event)
  const { data, error } = await admin
    .from('branding_assets')
    .select('id, public_url, role, caption, used_as, ig_permalink, source, hero_score, hero_reason')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(60)

  if (error) throw createError({ statusCode: 500, statusMessage: 'Failed to load branding posts' })
  return { assets: (data ?? []) as unknown as BrandingAsset[] }
})
