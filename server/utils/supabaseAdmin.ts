import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// The ONE service-role factory (resolves consistency finding D). This client
// BYPASSES RLS — on tenant-scoped tables it must only be reached via
// tenantScoped() so a store_id filter is always applied (H2).
export function supabaseAdmin(event: H3Event) {
  return serverSupabaseServiceRole(event)
}
