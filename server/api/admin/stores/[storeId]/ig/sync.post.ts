import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { runImport } from '~~/server/utils/ig/importer'

// Import Instagram posts → products. AI (Gemini) analyzes each post, clusters
// same-product posts into one product with multiple images, multi-categorizes
// them, and routes non-product posts to branding assets. Idempotent on re-run;
// never touches seller-edited (locked) products. Falls back to a per-post
// heuristic without a Gemini key.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  try {
    return await runImport(event, storeId)
  } catch (e) {
    const msg = (e as { statusMessage?: string }).statusMessage || (e as Error).message || 'Import failed'
    await supabaseAdmin(event)
      .from('ig_accounts')
      .update({ last_sync_error: msg.slice(0, 500) })
      .eq('store_id', storeId)
    throw e
  }
})
