import { z } from 'zod'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { persistTheme } from '~~/server/utils/theme/persist'
import {
  ALLOWED_BODY_FONTS,
  ALLOWED_BUTTON,
  ALLOWED_CARD_HOVER,
  ALLOWED_DENSITY,
  ALLOWED_HEADING_FONTS,
  ALLOWED_HERO,
  ALLOWED_LAYOUT,
  ALLOWED_MOOD,
  ALLOWED_PRODUCT_CARD,
  ALLOWED_RADIUS,
  FALLBACK_THEME,
} from '~~/shared/types/theme'
import type { DesignTokens, ThemeLogo } from '~~/shared/types/theme'
import { ALLOWED_SECTION } from '~~/shared/types/template'

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
  artDirection: z
    .object({
      layout: enumOf(ALLOWED_LAYOUT),
      hero: enumOf(ALLOWED_HERO),
      productCard: enumOf(ALLOWED_PRODUCT_CARD),
      cardHover: enumOf(ALLOWED_CARD_HOVER),
      sectionOrder: z.array(enumOf(ALLOWED_SECTION)).optional(),
      // Per-section config map. Accepted loosely here — resolveSections (inside
      // persistTheme → validateAndRepair) is the single clamp choke-point, exactly
      // as sectionOrder is. Don't duplicate the discriminated union in zod.
      sections: z.record(z.any()).optional(),
    })
    .optional(),
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

  const curAD = current.artDirection ?? FALLBACK_THEME.artDirection
  const merged = {
    ...current,
    palette: { ...current.palette, ...b.palette },
    typography: { ...current.typography, ...b.typography },
    radius: b.radius,
    density: b.density,
    buttonStyle: b.buttonStyle,
    shadow: b.shadow,
    mood: b.mood ?? current.mood,
    // Re-validated/clamped by persistTheme (repairArtDirection → resolveSections). When
    // the editor omits a field, keep the current art direction. `current` may be an older
    // DB theme that predates these fields, so fall back to the default before merging.
    artDirection: b.artDirection
      ? {
          ...b.artDirection,
          sectionOrder: b.artDirection.sectionOrder ?? curAD.sectionOrder,
          sections: b.artDirection.sections ?? curAD.sections,
        }
      : curAD,
  }

  const theme = await persistTheme(event, storeId, merged, { source: 'manual-edit' }, { logo })
  return { theme }
})
