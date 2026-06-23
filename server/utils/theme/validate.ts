import type { DesignTokens, NeutralScale } from '~~/shared/types/theme'
import {
  ALLOWED_BODY_FONTS,
  ALLOWED_BUTTON,
  ALLOWED_DENSITY,
  ALLOWED_HEADING_FONTS,
  ALLOWED_MOOD,
  ALLOWED_RADIUS,
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
    keywords: keywordsArr
      .filter((k): k is string => typeof k === 'string')
      .map((k) => k.slice(0, 40))
      .slice(0, 6),
  }

  return { tokens, adjusted }
}
