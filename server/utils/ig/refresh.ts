import type { H3Event } from 'h3'
import { supabaseAdmin } from '../supabaseAdmin'
import { readIgToken } from './token'
import { refreshLongLivedToken } from './client'

export interface RefreshSummary {
  checked: number
  refreshed: number
  failed: number
  expired: number
}

// Refresh long-lived IG tokens that are still valid but nearing expiry. Meant to
// run daily (Vercel Cron / Nitro task). Idempotent and safe to run often: the IG
// refresh endpoint only acts on tokens >24h old, and we only touch ones inside the
// renewal window.
export async function refreshExpiringTokens(event: H3Event, windowDays = 7): Promise<RefreshSummary> {
  const admin = supabaseAdmin(event)
  const now = Date.now()
  const horizon = new Date(now + windowDays * 24 * 60 * 60 * 1000).toISOString()

  const { data } = await admin
    .from('ig_accounts')
    .select('store_id, access_token_secret_id, token_expires_at, token_status')
    .in('token_status', ['active', 'expiring'])
    .not('access_token_secret_id', 'is', null)
    .lt('token_expires_at', horizon)

  const rows = (data ?? []) as Array<{
    store_id: string
    access_token_secret_id: string
    token_expires_at: string | null
  }>

  const summary: RefreshSummary = { checked: rows.length, refreshed: 0, failed: 0, expired: 0 }

  for (const row of rows) {
    // Already expired → can't refresh; mark it so the seller is prompted to reconnect.
    if (row.token_expires_at && new Date(row.token_expires_at).getTime() <= now) {
      await admin.from('ig_accounts').update({ token_status: 'expired' }).eq('store_id', row.store_id)
      summary.expired++
      continue
    }

    const token = await readIgToken(event, row.access_token_secret_id)
    if (!token) {
      summary.failed++
      continue
    }

    const fresh = await refreshLongLivedToken(token)
    if (!fresh) {
      await admin.from('ig_accounts').update({ token_status: 'error' }).eq('store_id', row.store_id)
      summary.failed++
      continue
    }

    await admin.rpc('ig_update_token', { p_secret_id: row.access_token_secret_id, p_secret: fresh.accessToken })
    await admin
      .from('ig_accounts')
      .update({
        token_expires_at: new Date(now + fresh.expiresIn * 1000).toISOString(),
        token_refreshed_at: new Date().toISOString(),
        token_status: 'active',
      })
      .eq('store_id', row.store_id)
    summary.refreshed++
  }

  return summary
}
