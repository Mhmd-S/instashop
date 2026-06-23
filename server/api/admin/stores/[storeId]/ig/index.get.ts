import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// Instagram connection status for a store (never exposes the token — it's not a column).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const admin = supabaseAdmin(event)
  const { data } = await admin
    .from('ig_accounts')
    .select('ig_username, account_type, profile_picture_url, media_count, token_status, token_expires_at, last_sync_at, connected_at')
    .eq('store_id', storeId)
    .maybeSingle()

  return { connected: !!data, account: data ?? null }
})
