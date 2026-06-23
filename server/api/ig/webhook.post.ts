import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { verifyXHubSignature } from '~~/server/utils/ig/signedRequest'
import { purgeIgAccount } from '~~/server/utils/ig/account'

// Instagram webhook notifications. Signed with X-Hub-Signature-256 (HMAC of the
// raw body with the app secret). We must ack 2xx fast; processing is best-effort.
//
// Instagram delivers account-removal/deauth via the dedicated deauthorize callback
// (see deauthorize.post.ts), so here we only defensively handle any future fields
// and always 200 so Meta doesn't disable the subscription.
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  const raw = (await readRawBody(event)) || ''
  const sig = getHeader(event, 'x-hub-signature-256')

  if (!verifyXHubSignature(raw, sig, cfg.igAppSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Bad signature' })
  }

  let body: { object?: string; entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: unknown }> }> }
  try {
    body = JSON.parse(raw)
  } catch {
    return { ok: true }
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      // Defensive: some integrations emit an explicit deauthorize/revoke field.
      if (change.field === 'deauthorize' || change.field === 'revoke') {
        if (entry.id) {
          const r = await purgeIgAccount(event, { igUserId: entry.id, mode: 'soft' })
          if (r.found) {
            await supabaseAdmin(event)
              .from('audit_log')
              .insert({ store_id: r.storeId, action: 'ig.deauthorize', target: r.igUserId, meta: { via: 'webhook' } })
          }
        }
      }
    }
  }

  return { ok: true }
})
