import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { parseSignedRequest } from '~~/server/utils/ig/signedRequest'
import { purgeIgAccount } from '~~/server/utils/ig/account'

// Meta "Deauthorize Callback URL". Fired when a user removes our app from their
// Instagram. Body is form-encoded `signed_request` (HMAC-signed with the app
// secret) carrying the IG-scoped user_id. We revoke the connection + free the
// Vault token, but keep the (now token-less) account row + imported products so
// the seller still sees what happened. Data removal is the separate callback.
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  const body = await readBody<{ signed_request?: string }>(event)
  const signed = body?.signed_request
  if (!signed) throw createError({ statusCode: 400, statusMessage: 'Missing signed_request' })

  const parsed = parseSignedRequest(signed, cfg.igAppSecret)
  if (!parsed?.user_id) throw createError({ statusCode: 400, statusMessage: 'Invalid signed_request' })

  const r = await purgeIgAccount(event, { igUserId: String(parsed.user_id), mode: 'soft' })
  if (r.found) {
    await supabaseAdmin(event).from('audit_log').insert({
      store_id: r.storeId,
      action: 'ig.deauthorize',
      target: r.igUserId,
      meta: { via: 'deauthorize_callback' },
    })
  }

  return { ok: true }
})
