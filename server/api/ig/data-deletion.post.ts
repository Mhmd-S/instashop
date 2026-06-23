import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { parseSignedRequest, deletionCode } from '~~/server/utils/ig/signedRequest'
import { purgeIgAccount } from '~~/server/utils/ig/account'

// Meta "Data Deletion Request Callback". Body is form-encoded `signed_request`.
// We must delete the user's data and respond with { url, confirmation_code } so
// Meta (and the user) can verify completion. Unlike deauthorize, this HARD-removes
// the account row + every Instagram-sourced product.
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  const body = await readBody<{ signed_request?: string }>(event)
  const signed = body?.signed_request
  if (!signed) throw createError({ statusCode: 400, statusMessage: 'Missing signed_request' })

  const parsed = parseSignedRequest(signed, cfg.igAppSecret)
  if (!parsed?.user_id) throw createError({ statusCode: 400, statusMessage: 'Invalid signed_request' })

  const igUserId = String(parsed.user_id)
  const issuedAt = Number(parsed.issued_at) || Math.floor(Date.now() / 1000)
  const code = deletionCode(igUserId, issuedAt, cfg.igAppSecret)

  const admin = supabaseAdmin(event)
  const r = await purgeIgAccount(event, { igUserId, mode: 'hard', deleteImportedProducts: true })

  await admin.from('ig_deletion_requests').upsert(
    {
      confirmation_code: code,
      ig_user_id: igUserId,
      store_id: r.storeId,
      status: 'completed',
      detail: r.found ? 'Instagram account + imported products removed' : 'No matching data found',
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'confirmation_code' },
  )

  if (r.found) {
    await admin.from('audit_log').insert({
      store_id: r.storeId,
      action: 'ig.data_deletion',
      target: igUserId,
      meta: { confirmation_code: code },
    })
  }

  const base = (cfg.public.siteUrl || `https://${cfg.public.appBaseDomain}`).replace(/\/$/, '')
  return { url: `${base}/api/ig/deletion-status/${code}`, confirmation_code: code }
})
