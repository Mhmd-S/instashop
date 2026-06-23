import { serverSupabaseClient } from '#supabase/server'
import { requireUser } from '~~/server/utils/auth'

// List the stores the current user is a member of. Queried via the user's JWT so
// RLS (store_members + stores member-read) scopes it to their own stores —
// NOT the public "active stores" policy.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await serverSupabaseClient(event)

  const { data, error } = await db
    .from('store_members')
    .select('role, store:stores(id, subdomain, name, status, base_currency, created_at)')
    .eq('user_id', user.id)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const stores = (data ?? [])
    .filter((r) => r.store)
    .map((r) => {
      const st = r.store as unknown as {
        id: string; subdomain: string; name: string
        status: string; base_currency: string; created_at: string
      }
      return {
        id: st.id,
        subdomain: st.subdomain,
        name: st.name,
        status: st.status,
        base_currency: st.base_currency,
        created_at: st.created_at,
        role: r.role as string,
      }
    })

  return { stores }
})
