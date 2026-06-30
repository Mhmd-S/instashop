import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'

// Single store, scoped to the caller's membership. `role` comes from the access
// check so the client can gate owner-only actions (e.g. delete).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  const { role } = await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data, error } = await db
    .from('stores')
    .select('id, subdomain, name, status, base_currency, created_at')
    .eq('id', storeId)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Store not found' })

  return { store: { ...data, role } }
})
