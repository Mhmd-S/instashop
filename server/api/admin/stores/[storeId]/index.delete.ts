import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { purgeIgAccount } from '~~/server/utils/ig/account'
import { deleteStoreMedia } from '~~/server/utils/storage'

const Body = z.object({ confirm: z.string().trim() })

// Permanently delete a store and everything it owns. Owner-only (superadmin maps to
// owner in requireStoreAccess). The database does the heavy lifting — every store_id
// FK is ON DELETE CASCADE, so one delete removes products, orders, categories,
// themes, and the IG analysis/link rows. Two things do NOT cascade and we clean them
// ourselves first: the Instagram Vault secret (a vault entry, not a row) and the
// store's storage objects (public files, not FK-linked). The caller must re-type the
// subdomain as an accidental-deletion guard.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const { user } = await requireStoreAccess(event, storeId, 'owner')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Type the store subdomain to confirm' })
  }

  const admin = supabaseAdmin(event)
  const { data: store } = await admin
    .from('stores')
    .select('id, name, subdomain')
    .eq('id', storeId)
    .maybeSingle()
  const s = store as { id: string; name: string; subdomain: string } | null
  if (!s) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  if (parsed.data.confirm.toLowerCase() !== s.subdomain.toLowerCase()) {
    throw createError({ statusCode: 422, statusMessage: "Confirmation doesn't match the store subdomain" })
  }

  // Record intent before the row (and its cascade) is gone. audit_log.store_id is ON
  // DELETE SET NULL, so this row survives the deletion with actor + target intact.
  await admin.from('audit_log').insert({
    store_id: storeId,
    actor_id: user.id,
    action: 'store.delete',
    target: s.subdomain,
    meta: { name: s.name },
  })

  // 1. Free the Instagram Vault secret + remove the account row (cascade would drop
  //    the row but leak the secret). Safe no-op when nothing is connected.
  await purgeIgAccount(event, { storeId, mode: 'hard' })

  // 2. Wipe the store's storage objects. Best-effort — never block the actual store
  //    deletion on a storage hiccup; any orphans can be cleaned up later.
  let media = { removed: 0, failed: 0 }
  try {
    media = await deleteStoreMedia(admin, storeId)
  } catch (e) {
    console.error('[stores.delete] storage wipe failed', (e as Error)?.message)
  }

  // 3. Delete the store; FK cascade clears every remaining store-owned row.
  const { error } = await admin.from('stores').delete().eq('id', storeId)
  if (error) {
    console.error('[stores.delete]', error)
    throw createError({ statusCode: 500, statusMessage: 'Failed to delete store' })
  }

  return { ok: true, mediaRemoved: media.removed, mediaFailed: media.failed }
})
