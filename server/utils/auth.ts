import type { H3Event } from 'h3'
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'

// Resolve the authenticated user, or 401. NOTE: @nuxtjs/supabase's
// serverSupabaseUser() returns JWT *claims* (user id is `sub`, not `id`), so we
// normalize to a stable { id, email, app_metadata } shape for all callers.
export async function requireUser(event: H3Event) {
  const claims = (await serverSupabaseUser(event)) as {
    sub?: string
    email?: string
    app_metadata?: Record<string, unknown>
  } | null
  if (!claims?.sub) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return {
    id: claims.sub,
    email: claims.email,
    app_metadata: claims.app_metadata ?? {},
    claims,
  }
}

// Require the caller to be a platform superadmin (the SaaS owner), else 403.
export async function requireSuperadmin(event: H3Event) {
  const user = await requireUser(event)
  const role = (user.app_metadata as { global_role?: string } | undefined)?.global_role
  if (role !== 'superadmin') throw createError({ statusCode: 403, statusMessage: 'Superadmin only' })
  return user
}

export type MemberRole = 'staff' | 'admin' | 'owner'
const ROLE_RANK: Record<MemberRole, number> = { staff: 1, admin: 2, owner: 3 }

// Require the caller to be a member (>= minRole) of storeId, or superadmin. Returns
// the user + their effective role. Authorization is explicit (not RLS-implicit).
export async function requireStoreAccess(event: H3Event, storeId: string, minRole: MemberRole = 'staff') {
  const user = await requireUser(event)

  const globalRole = (user.app_metadata as { global_role?: string } | undefined)?.global_role
  if (globalRole === 'superadmin') return { user, role: 'owner' as MemberRole }

  const db = await serverSupabaseClient(event)
  const { data } = await db
    .from('store_members')
    .select('role')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .maybeSingle()

  const role = (data as { role: MemberRole } | null)?.role
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole]) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  return { user, role }
}
