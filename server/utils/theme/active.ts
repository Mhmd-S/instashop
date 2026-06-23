import type { H3Event } from 'h3'
import type { DesignTokens, ThemeLogo } from '~~/shared/types/theme'
import type { ResolvedStore } from '~~/shared/types/tenant'
import { supabaseAdmin } from '../supabaseAdmin'
import { validateAndRepair } from './validate'

export interface ActiveTheme {
  tokens: DesignTokens
  logo: ThemeLogo | null
  logoUrl: string | null // public URL for the storefront/admin to render the logo
  version: number | null
}

// Load + validate the store's active theme. Cached in Nitro storage by theme id
// (a new theme gets a new id => a new key, so no explicit invalidation needed).
export async function getActiveTheme(event: H3Event, store: ResolvedStore): Promise<ActiveTheme | null> {
  if (!store.active_theme_id) return null

  const cache = useStorage('theme')
  const key = `theme:${store.active_theme_id}`
  const cached = await cache.getItem<ActiveTheme>(key)
  if (cached) return cached

  try {
    const db = supabaseAdmin(event)
    const { data, error } = await db
      .from('themes')
      .select('tokens, logo, version')
      .eq('id', store.active_theme_id)
      .maybeSingle()
    if (error || !data) return null

    const row = data as { tokens: unknown; logo: unknown; version: number | null }
    const { tokens } = validateAndRepair(row.tokens)
    const logo = (row.logo as ThemeLogo) ?? null
    // store-media is a public bucket, so a stored logo path maps directly to a public
    // URL (same scheme the admin theme endpoint uses). processedPath first, then the
    // original upload.
    const logoPath = logo?.processedPath || logo?.originalPath || null
    const logoUrl = logoPath ? db.storage.from('store-media').getPublicUrl(logoPath).data.publicUrl : null
    const result: ActiveTheme = {
      tokens,
      logo,
      logoUrl,
      version: row.version ?? null,
    }
    await cache.setItem(key, result, { ttl: 300 })
    return result
  } catch (err) {
    console.error('[theme] active load failed', (err as Error)?.message)
    return null
  }
}
