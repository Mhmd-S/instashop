import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { materializeImport } from '~~/server/utils/ig/importer'
import { buildFixture, FIXTURE_KEYS } from '~~/server/utils/ig/fixtures'

// DEV-ONLY. Seeds a curated mock Instagram shop and runs the REAL import pipeline
// (analyze → cluster → materialize) against it, so the product-generation logic can
// be exercised end-to-end without a live Instagram connection. Disabled in
// production. Never overwrites a real connected account's token.
const Body = z.object({
  fixture: z.enum(FIXTURE_KEYS as [string, ...string[]]),
  reset: z.boolean().optional().default(true),
})

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 403, statusMessage: 'Fixture seeding is disabled in production' })
  }
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const { fixture, reset } = await readValidatedBody(event, Body.parse)
  const built = buildFixture(fixture)
  if (!built) throw createError({ statusCode: 400, statusMessage: 'Unknown fixture' })

  const admin = supabaseAdmin(event)
  const prefix = `fixture_${fixture}_`

  // Clean a prior run of THIS fixture so re-seeding is deterministic (product
  // delete cascades its images/links/category junctions).
  if (reset) {
    await admin.from('products').delete().eq('store_id', storeId).like('ig_media_id', `${prefix}%`)
    await admin.from('ig_analysis').delete().eq('store_id', storeId).like('ig_media_id', `${prefix}%`)
    await admin.from('branding_assets').delete().eq('store_id', storeId).like('ig_media_id', `${prefix}%`)
  }

  // Give the store a profile picture so logo→theme derivation can be tested too —
  // but only when there is no real connected account (don't clobber a live token).
  const { data: acct } = await admin
    .from('ig_accounts')
    .select('access_token_secret_id')
    .eq('store_id', storeId)
    .maybeSingle()
  const hasRealConnection = !!(acct as { access_token_secret_id?: string | null } | null)?.access_token_secret_id
  if (!hasRealConnection) {
    await admin.from('ig_accounts').upsert(
      {
        store_id: storeId,
        provider: 'instagram',
        ig_user_id: `fixture_${storeId}`,
        ig_username: `${built.shopName} (fixture)`,
        account_type: 'CREATOR',
        profile_picture_url: built.profilePictureUrl,
        token_status: 'revoked', // not a live connection
        scopes: [],
      },
      { onConflict: 'store_id' },
    )
  }

  const result = await materializeImport(event, storeId, built.media)

  return {
    fixture,
    shopName: built.shopName,
    niche: built.niche,
    posts: built.media.length,
    expected: built.expected,
    result,
  }
})
