import type { H3Event } from 'h3'
import { supabaseAdmin } from '../supabaseAdmin'
import { deleteIgToken } from './token'

interface PurgeOpts {
  storeId?: string
  igUserId?: string
  // 'soft' keeps the ig_accounts row (marks revoked) — used for deauthorize so the
  // seller still sees they were disconnected. 'hard' removes the row entirely.
  mode: 'soft' | 'hard'
  deleteImportedProducts?: boolean
}

interface PurgeResult {
  storeId: string | null
  igUserId: string | null
  found: boolean
}

// Single choke-point for tearing down an Instagram connection: always frees the
// Vault secret, optionally removes IG-sourced products, then soft- or hard-removes
// the account row. Safe to call when nothing is connected (found: false).
export async function purgeIgAccount(event: H3Event, opts: PurgeOpts): Promise<PurgeResult> {
  const admin = supabaseAdmin(event)

  let q = admin.from('ig_accounts').select('store_id, ig_user_id, access_token_secret_id')
  if (opts.storeId) q = q.eq('store_id', opts.storeId)
  else if (opts.igUserId) q = q.eq('ig_user_id', opts.igUserId)
  else return { storeId: null, igUserId: null, found: false }

  const { data } = await q.maybeSingle()
  const acct = data as
    | { store_id: string; ig_user_id: string; access_token_secret_id: string | null }
    | null
  if (!acct) return { storeId: opts.storeId ?? null, igUserId: opts.igUserId ?? null, found: false }

  if (acct.access_token_secret_id) await deleteIgToken(event, acct.access_token_secret_id)

  if (opts.deleteImportedProducts) {
    await admin.from('products').delete().eq('store_id', acct.store_id).eq('source', 'instagram')
  }

  if (opts.mode === 'hard') {
    await admin.from('ig_accounts').delete().eq('store_id', acct.store_id)
  } else {
    await admin
      .from('ig_accounts')
      .update({
        access_token_secret_id: null,
        token_status: 'revoked',
        deauthorized_at: new Date().toISOString(),
      })
      .eq('store_id', acct.store_id)
  }

  return { storeId: acct.store_id, igUserId: acct.ig_user_id, found: true }
}
