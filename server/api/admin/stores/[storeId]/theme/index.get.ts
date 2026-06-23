import { serverSupabaseClient } from '#supabase/server'
import { requireStoreAccess } from '~~/server/utils/auth'
import { validateAndRepair } from '~~/server/utils/theme/validate'
import { FALLBACK_THEME } from '~~/shared/types/theme'
import type { ThemeLogo } from '~~/shared/types/theme'

export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'staff')

  const db = await serverSupabaseClient(event)
  const { data: store } = await db
    .from('stores')
    .select('active_theme_id, subdomain')
    .eq('id', storeId)
    .maybeSingle()
  const s = store as { active_theme_id?: string | null; subdomain?: string } | null
  const subdomain = s?.subdomain ?? ''
  const activeId = s?.active_theme_id

  if (!activeId) {
    return { tokens: FALLBACK_THEME, version: null, isDefault: true, subdomain, logo: null, logoUrl: null }
  }

  const { data: theme } = await db.from('themes').select('tokens, version, logo').eq('id', activeId).maybeSingle()
  if (!theme) {
    return { tokens: FALLBACK_THEME, version: null, isDefault: true, subdomain, logo: null, logoUrl: null }
  }

  const t = theme as { tokens: unknown; version: number; logo?: ThemeLogo }
  const { tokens } = validateAndRepair(t.tokens)
  const logo = t.logo ?? null
  const logoPath = logo?.processedPath || logo?.originalPath || null
  const logoUrl = logoPath ? db.storage.from('store-media').getPublicUrl(logoPath).data.publicUrl : null

  return { tokens, version: t.version, isDefault: false, subdomain, logo, logoUrl }
})
