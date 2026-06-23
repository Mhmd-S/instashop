import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

const Body = z.object({ hero: z.boolean() })

// Set (or clear) a branding post as the storefront hero. At most one hero per store.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const assetId = getRouterParam(event, 'assetId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Invalid request' })

  const admin = supabaseAdmin(event)
  if (parsed.data.hero) {
    await admin.from('branding_assets').update({ used_as: null }).eq('store_id', storeId).eq('used_as', 'hero')
    const { data } = await admin
      .from('branding_assets')
      .update({ used_as: 'hero' })
      .eq('store_id', storeId)
      .eq('id', assetId)
      .select('id')
      .maybeSingle()
    if (!data) throw createError({ statusCode: 404, statusMessage: 'Branding post not found' })
  } else {
    await admin.from('branding_assets').update({ used_as: null }).eq('store_id', storeId).eq('id', assetId)
  }
  return { ok: true }
})
