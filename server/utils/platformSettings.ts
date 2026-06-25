import type { H3Event } from 'h3'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'

// The platform commission in basis points (global). Defaults to 0 if the row is
// somehow missing. Single source of truth for the Connect application fee.
export async function getPlatformFeeBps(event: H3Event): Promise<number> {
  const { data } = await supabaseAdmin(event)
    .from('platform_settings').select('fee_bps').eq('id', 1).maybeSingle()
  const bps = (data as { fee_bps?: number } | null)?.fee_bps ?? 0
  return Number.isFinite(bps) && bps >= 0 ? Math.min(bps, 10000) : 0
}
