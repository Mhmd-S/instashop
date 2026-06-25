import type { ArtDirection, DesignTokens, NeutralScale } from '~~/shared/types/theme'
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
  ALLOWED_SECTION,
  FALLBACK_THEME,
} from '~~/shared/types/theme'
import { bestOn, fixOn } from './contrast'

const HEX = /^#[0-9a-fA-F]{6}$/

function asObj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}
}
function hex(v: unknown, fallback: string): string {
  return typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback
}
function pick<T extends readonly string[]>(v: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T[number]) : fallback
}

const NEUTRAL_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'] as const

// Clamp the art-direction block to enums-only, exactly like fonts/mood. sectionOrder
// is filtered to the allowlist + deduped; 'hero' is guaranteed present and first so a
// model that omits it can never produce a heroless page.
function repairArtDirection(raw: unknown): ArtDirection {
  const a = asObj(raw)
  const fb = FALLBACK_THEME.artDirection
  const seen = new Set<ArtDirection['sectionOrder'][number]>()
  const order: ArtDirection['sectionOrder'] = ['hero']
  seen.add('hero')
  if (Array.isArray(a.sectionOrder)) {
    for (const s of a.sectionOrder) {
      if (typeof s === 'string' && (ALLOWED_SECTION as readonly string[]).includes(s) && !seen.has(s as ArtDirection['sectionOrder'][number])) {
        seen.add(s as ArtDirection['sectionOrder'][number])
        order.push(s as ArtDirection['sectionOrder'][number])
      }
    }
  }
  // Only 'hero' was forced → no real composition given; fall back to the default set.
  let sectionOrder = order.length > 1 ? order : [...fb.sectionOrder]
  // A storefront must always show its products — force the grid in if the model
  // (or an edit) dropped it, so a shop can never render with no buyable surface.
  if (!sectionOrder.includes('products')) sectionOrder = [...sectionOrder, 'products']

  return {
    layout: pick(a.layout, ALLOWED_LAYOUT, fb.layout),
    hero: pick(a.hero, ALLOWED_HERO, fb.hero),
    productCard: pick(a.productCard, ALLOWED_PRODUCT_CARD, fb.productCard),
    cardHover: pick(a.cardHover, ALLOWED_CARD_HOVER, fb.cardHover),
    sectionOrder,
  }
}

// Single choke-point: turns ANY model/DB JSON into a valid, AA-contrast DesignTokens.
// Never throws — bad fields fall back to the default theme's value (H6).
export function validateAndRepair(raw: unknown): { tokens: DesignTokens; adjusted: boolean } {
  const r = asObj(raw)
  const p = asObj(r.palette)
  const ty = asObj(r.typography)
  const fp = FALLBACK_THEME.palette
  const nRaw = asObj(p.neutral)

  const neutral = {} as NeutralScale
  for (const k of NEUTRAL_KEYS) neutral[k] = hex(nRaw[k], fp.neutral[k])

  const bg = hex(p.bg, fp.bg)
  const primary = hex(p.primary, fp.primary)
  const secondary = hex(p.secondary, fp.secondary)
  const accent = hex(p.accent, fp.accent)

  const fgIn = hex(p.fg, fp.fg)
  const mutedIn = hex(p.muted, fp.muted)
  const fg = fixOn(fgIn, bg, 4.5)
  const muted = fixOn(mutedIn, bg, 4.5)
  const adjusted = fg !== fgIn || muted !== mutedIn

  const moodArr = Array.isArray(r.mood) ? r.mood : []
  const keywordsArr = Array.isArray(r.keywords) ? r.keywords : []

  const tokens: DesignTokens = {
    palette: {
      primary,
      secondary,
      accent,
      bg,
      fg,
      muted,
      card: hex(p.card, fp.card),
      border: hex(p.border, fp.border),
      neutral,
      onPrimary: bestOn(primary),
      onSecondary: bestOn(secondary),
      onAccent: bestOn(accent),
    },
    typography: {
      heading: pick(ty.heading, ALLOWED_HEADING_FONTS, 'Inter'),
      body: pick(ty.body, ALLOWED_BODY_FONTS, 'Inter'),
      feel: pick(ty.feel, ['serif', 'sans-display', 'geometric', 'humanist', 'monospace-accent'] as const, 'humanist'),
      scale: pick(ty.scale, ['tight', 'normal', 'airy'] as const, 'normal'),
    },
    radius: pick(r.radius, ALLOWED_RADIUS, 'md'),
    density: pick(r.density, ALLOWED_DENSITY, 'comfortable'),
    buttonStyle: pick(r.buttonStyle, ALLOWED_BUTTON, 'solid'),
    shadow: pick(r.shadow, ['none', 'subtle', 'pronounced'] as const, 'subtle'),
    mood: moodArr
      .filter((m): m is DesignTokens['mood'][number] => (ALLOWED_MOOD as readonly string[]).includes(m as string))
      .slice(0, 4),
    artDirection: repairArtDirection(r.artDirection),
    keywords: keywordsArr
      .filter((k): k is string => typeof k === 'string')
      .map((k) => k.slice(0, 40))
      .slice(0, 6),
  }

  return { tokens, adjusted }
}
