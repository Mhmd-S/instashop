import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'

// Store-level settings the admin can edit (currency for now). Kept separate from
// setup-status so the standalone products page can read it too.
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data } = await db.from('stores').select('base_currency').eq('id', storeId).maybeSingle()
  if (!data) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  return { baseCurrency: (data as { base_currency: string }).base_currency }
})
