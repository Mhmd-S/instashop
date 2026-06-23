import type { H3Event } from 'h3'
import { supabaseAdmin } from './supabaseAdmin'

// Mandatory choke-point for service-role access to tenant-scoped tables.
// Every read/insert is forced to carry the resolved store_id (H2/M9), so a
// forgotten filter can't leak across tenants.
export function tenantScoped(event: H3Event) {
  const store = event.context.store
  if (!store?.id) {
    throw createError({ statusCode: 400, statusMessage: 'No tenant in context' })
  }
  const db = supabaseAdmin(event)
  const storeId: string = store.id
  return {
    storeId,
    select: (table: string, columns = '*') =>
      db.from(table).select(columns).eq('store_id', storeId),
    insert: (table: string, rows: Record<string, unknown> | Record<string, unknown>[]) =>
      db.from(table).insert(
        Array.isArray(rows)
          ? rows.map((r) => ({ ...r, store_id: storeId }))
          : { ...rows, store_id: storeId },
      ),
    rpc: db.rpc.bind(db),
    raw: db,
  }
}
