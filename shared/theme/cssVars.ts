import type { DesignTokens } from '~~/shared/types/theme'
import { ALLOWED_BODY_FONTS, ALLOWED_HEADING_FONTS } from '~~/shared/types/theme'

// Map the tenant radius scale onto Nuxt UI's base radius (--ui-radius).
const RADIUS_MAP: Record<DesignTokens['radius'], string> = {
  none: '0',
  sm: '.125rem',
  md: '.25rem',
  lg: '.375rem',
  xl: '.5rem',
  full: '.75rem',
}

// Tenant shadow scale → a CSS box-shadow value (exposed as --t-shadow).
const SHADOW_MAP: Record<DesignTokens['shadow'], string> = {
  none: 'none',
  subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.08)',
  pronounced: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 10px 20px -5px rgb(0 0 0 / 0.15)',
}

// Per-tenant theming = override Nuxt UI's design-token CSS variables, so every
// Nuxt UI component on the storefront reflects the seller's vibe. Pure + safe:
// only validated (hex/enum) values are interpolated (H6).
export function tokensToCssVars(t: DesignTokens): string {
  const p = t.palette
  const vars: Record<string, string> = {
    '--ui-primary': p.primary,
    '--ui-secondary': p.secondary,
    '--ui-bg': p.bg,
    '--ui-bg-muted': p.card,
    '--ui-bg-elevated': p.card,
    '--ui-bg-accented': p.border,
    '--ui-text': p.fg,
    '--ui-text-highlighted': p.fg,
    '--ui-text-toned': p.fg,
    '--ui-text-muted': p.muted,
    '--ui-text-dimmed': p.muted,
    // Text drawn on a filled brand surface (Nuxt UI's `text-inverted`, used by every
    // solid button). It MUST track the brand color's readable on-color — not Nuxt UI's
    // default white, and never the OS-dark-mode flip to near-black (the cause of the
    // "dark button, black text" bug: color-mode toggles .dark, which re-points
    // --ui-text-inverted at neutral-900 — we pin it here so solid CTAs stay legible).
    '--ui-text-inverted': p.onPrimary,
    '--ui-border': p.border,
    '--ui-border-muted': p.border,
    '--ui-border-accented': p.border,
    '--ui-radius': RADIUS_MAP[t.radius],
    '--t-font-heading': `'${t.typography.heading}'`,
    '--t-font-body': `'${t.typography.body}'`,
    // Extra tenant tokens for storefront surfaces (accent CTAs, readable-on colors,
    // shadow, neutral ramp). Only validated hex/enum values are interpolated (H6).
    '--t-accent': p.accent,
    '--t-on-primary': p.onPrimary,
    '--t-on-secondary': p.onSecondary,
    '--t-on-accent': p.onAccent,
    '--t-shadow': SHADOW_MAP[t.shadow],
    '--t-neutral-50': p.neutral['50'],
    '--t-neutral-100': p.neutral['100'],
    '--t-neutral-200': p.neutral['200'],
    '--t-neutral-300': p.neutral['300'],
    '--t-neutral-400': p.neutral['400'],
    '--t-neutral-500': p.neutral['500'],
    '--t-neutral-600': p.neutral['600'],
    '--t-neutral-700': p.neutral['700'],
    '--t-neutral-800': p.neutral['800'],
    '--t-neutral-900': p.neutral['900'],
    '--t-neutral-950': p.neutral['950'],
  }
  const root = Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
  // Generated themes are ALWAYS light palettes (derive.ts → light bg + dark fg). Pin
  // color-scheme:light so a visitor whose OS prefers dark still gets light native
  // controls/scrollbars, and Nuxt UI's .dark token values never bleed onto the store.
  // This <style> is injected unlayered via useHead, so it wins over Nuxt UI's
  // @layer theme defaults (incl. the .dark overrides) regardless of OS preference.
  // Body font for the tenant; headings use the .font-heading utility (main.css @theme).
  return `:root{color-scheme:light;${root}}body{font-family:var(--t-font-body),ui-sans-serif,system-ui,sans-serif}`
}

const ALLOWED_FONTS = new Set<string>([...ALLOWED_HEADING_FONTS, ...ALLOWED_BODY_FONTS])

// Only allowlisted families ever get a <link> — defends against font-name injection.
export function googleFontLinks(heading: string, body: string) {
  const families = [...new Set([heading, body])].filter((f) => ALLOWED_FONTS.has(f))
  if (!families.length) return []
  const q = families
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;500;600;700`)
    .join('&')
  return [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: `https://fonts.googleapis.com/css2?${q}&display=swap` },
  ]
}
