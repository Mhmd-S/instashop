import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { persistTheme } from '~~/server/utils/theme/persist'
import {
  ALLOWED_BODY_FONTS,
  ALLOWED_BUTTON,
  ALLOWED_DENSITY,
  ALLOWED_HEADING_FONTS,
  ALLOWED_MOOD,
  ALLOWED_RADIUS,
  FALLBACK_THEME,
} from '~~/shared/types/theme'
import type { DesignTokens, ThemeLogo } from '~~/shared/types/theme'

const HEX = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a #rrggbb color')
const enumOf = <T extends readonly string[]>(a: T) => z.enum(a as unknown as [string, ...string[]])

const Body = z.object({
  palette: z.object({
    primary: HEX,
    secondary: HEX,
    accent: HEX,
    bg: HEX,
    fg: HEX,
    muted: HEX,
    card: HEX,
    border: HEX,
  }),
  typography: z.object({
    heading: enumOf(ALLOWED_HEADING_FONTS),
    body: enumOf(ALLOWED_BODY_FONTS),
  }),
  radius: enumOf(ALLOWED_RADIUS),
  density: enumOf(ALLOWED_DENSITY),
  buttonStyle: enumOf(ALLOWED_BUTTON),
  shadow: enumOf(['none', 'subtle', 'pronounced'] as const),
  mood: z.array(enumOf(ALLOWED_MOOD)).max(4).optional(),
})

// Manual theme edit: merge the seller's edits over the current tokens (preserving
// the derived neutral ramp / feel / scale / logo) and persist as a new version.
// persistTheme re-validates + contrast-fixes everything (H6).
export default defineEventHandler(async (event) => {
  const storeId = getRouterParam(event, 'storeId') as string
  await requireStoreAccess(event, storeId, 'admin')

  const parsed = Body.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Invalid theme', data: parsed.error.flatten() })
  }
  const b = parsed.data

  const admin = supabaseAdmin(event)
  const { data: store } = await admin.from('stores').select('active_theme_id').eq('id', storeId).maybeSingle()
  const activeId = (store as { active_theme_id?: string | null } | null)?.active_theme_id ?? null

  let current: DesignTokens = FALLBACK_THEME
  let logo: ThemeLogo | null = null
  if (activeId) {
    const { data: theme } = await admin.from('themes').select('tokens, logo').eq('id', activeId).maybeSingle()
    const t = theme as { tokens?: DesignTokens; logo?: ThemeLogo } | null
    if (t?.tokens) current = t.tokens
    logo = t?.logo ?? null
  }

  const merged = {
    ...current,
    palette: { ...current.palette, ...b.palette },
    typography: { ...current.typography, ...b.typography },
    radius: b.radius,
    density: b.density,
    buttonStyle: b.buttonStyle,
    shadow: b.shadow,
    mood: b.mood ?? current.mood,
  }

  const theme = await persistTheme(event, storeId, merged, { source: 'manual-edit' }, { logo })
  return { theme }
})
