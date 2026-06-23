import type { H3Event } from 'h3'
import type { ThemeLogo } from '~~/shared/types/theme'
import { supabaseAdmin } from '../supabaseAdmin'
import { validateAndRepair } from './validate'

export interface PersistThemeMeta {
  model?: string | null
  fallbackUsed?: boolean
  sourceImageCount?: number
  source?: 'generate' | 'manual-edit'
}

export interface PersistThemeExtras {
  logo?: ThemeLogo | null
  sourcePostIds?: string[]
}

// THE single write path for themes (H6): validates/clamps + contrast-fixes the raw
// tokens, writes a new immutable version, and repoints stores.active_theme_id.
export async function persistTheme(
  event: H3Event,
  storeId: string,
  raw: unknown,
  meta: PersistThemeMeta,
  extras: PersistThemeExtras = {},
) {
  const { tokens, adjusted } = validateAndRepair(raw)
  const admin = supabaseAdmin(event)

  const { data: last } = await admin
    .from('themes')
    .select('version')
    .eq('store_id', storeId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  const version = ((last as { version?: number } | null)?.version ?? 0) + 1

  const { data: theme, error } = await admin
    .from('themes')
    .insert({
      store_id: storeId,
      version,
      tokens,
      model: meta.model ?? null,
      meta: { ...meta, contrastAdjusted: adjusted },
      ...(extras.logo ? { logo: extras.logo } : {}),
      ...(extras.sourcePostIds ? { source_post_ids: extras.sourcePostIds } : {}),
    })
    .select('id, version')
    .single()

  if (error || !theme) {
    console.error('[theme] persist failed', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not save theme' })
  }

  const t = theme as { id: string; version: number }
  await admin.from('stores').update({ active_theme_id: t.id }).eq('id', storeId)
  return { id: t.id, version: t.version, tokens }
}
