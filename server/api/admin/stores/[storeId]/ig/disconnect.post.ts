import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { purgeIgAccount } from '~~/server/utils/ig/account'

// Disconnect Instagram. Imported products are kept; the account row + Vault token
// are removed (hard purge — the seller chose to disconnect).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const { user } = await requireStoreAccess(event, storeId, 'admin')

  await purgeIgAccount(event, { storeId, mode: 'hard' })

  const admin = supabaseAdmin(event)
  await admin.from('audit_log').insert({ store_id: storeId, actor_id: user.id, action: 'ig.disconnect' })
  return { ok: true }
})
