export const THEME_SCHEMA_VERSION = 1 as const

// Curated allowlists — the vision model may ONLY pick from these (anti-injection, Blueprint §6).
export const ALLOWED_HEADING_FONTS = ['Inter', 'Poppins', 'Montserrat', 'Playfair Display', 'Fraunces', 'Lora', 'Space Grotesk', 'DM Serif Display', 'Archivo', 'Libre Franklin'] as const
export const ALLOWED_BODY_FONTS = ['Inter', 'Source Sans 3', 'Work Sans', 'Nunito Sans', 'DM Sans', 'Lora', 'Karla', 'IBM Plex Sans', 'Public Sans', 'Mulish'] as const
export const ALLOWED_RADIUS = ['none', 'sm', 'md', 'lg', 'xl', 'full'] as const
export const ALLOWED_DENSITY = ['compact', 'cozy', 'comfortable'] as const
export const ALLOWED_BUTTON = ['solid', 'soft', 'outline', 'pill'] as const
export const ALLOWED_MOOD = ['minimal', 'luxury', 'playful', 'bold', 'earthy', 'vibrant', 'vintage', 'modern', 'elegant', 'rustic', 'techy', 'warm', 'cool', 'monochrome', 'pastel'] as const

// Art-direction enums (Blueprint: the "Art-Direction Layer"). The vision model picks
// STRUCTURE from these curated sets exactly like it picks fonts/mood — every value is
// enum-clamped by validateAndRepair, so richer AI output never reaches the DOM as
// free-form markup/CSS (the H6 anti-injection invariant holds).
//
//   layout       — the page archetype that selects the hero + section composition.
//   hero         — the hero composition (decoupled from the old hardcoded grid).
//   productCard  — product-tile treatment (aspect + framing personality).
//   cardHover    — the tile's hover affordance.
//   section      — the orderable/omittable storefront sections (sectionOrder is a
//                  validated, deduped subset; 'hero' is always forced first downstream).
export const ALLOWED_LAYOUT = ['catalog', 'lookbook', 'editorial', 'boutique'] as const
export const ALLOWED_HERO = ['split', 'full-bleed', 'centered', 'offset'] as const
export const ALLOWED_PRODUCT_CARD = ['portrait', 'square', 'editorial', 'tile'] as const
export const ALLOWED_CARD_HOVER = ['lift', 'zoom', 'none'] as const
export const ALLOWED_SECTION = ['hero', 'categories', 'featured', 'products'] as const

export type Hex = string // validated against /^#[0-9a-fA-F]{6}$/ server-side (Zod)

export type NeutralScale = Record<'50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950', Hex>

// Structural art direction — what makes two different shops render as genuinely
// different sites (not just a recolour). Enum-only, so it flows through the same
// validate/clamp choke-point as the rest of the tokens.
export interface ArtDirection {
  layout: typeof ALLOWED_LAYOUT[number]
  hero: typeof ALLOWED_HERO[number]
  productCard: typeof ALLOWED_PRODUCT_CARD[number]
  cardHover: typeof ALLOWED_CARD_HOVER[number]
  // Which sections render and in what order. Validated to a deduped subset of
  // ALLOWED_SECTION; the renderer always pins 'hero' first regardless.
  sectionOrder: Array<typeof ALLOWED_SECTION[number]>
}

export interface DesignTokens {
  palette: {
    primary: Hex
    secondary: Hex
    accent: Hex
    bg: Hex
    fg: Hex
    muted: Hex
    card: Hex
    border: Hex
    neutral: NeutralScale
    onPrimary: Hex
    onSecondary: Hex
    onAccent: Hex
  }
  typography: {
    heading: typeof ALLOWED_HEADING_FONTS[number]
    body: typeof ALLOWED_BODY_FONTS[number]
    feel: 'serif' | 'sans-display' | 'geometric' | 'humanist' | 'monospace-accent'
    scale: 'tight' | 'normal' | 'airy'
  }
  radius: typeof ALLOWED_RADIUS[number]
  density: typeof ALLOWED_DENSITY[number]
  buttonStyle: typeof ALLOWED_BUTTON[number]
  shadow: 'none' | 'subtle' | 'pronounced'
  mood: Array<typeof ALLOWED_MOOD[number]>
  // Structural archetype + section composition the storefront renders. Required on the
  // type; legacy themes persisted before this field existed stay compatible because
  // validateAndRepair always materializes it (repairArtDirection) and the storefront
  // falls back to a mood-derived default (useStoreArtDirection) when state is absent.
  artDirection: ArtDirection
  keywords: string[] // admin text display only (H6) — never injected into CSS/HTML
}

export interface ThemeLogo {
  source: 'profile_picture' | 'manual' | 'post_extracted'
  processedPath: string | null
  faviconPath: string | null
  originalPath: string | null
  bgIsTransparent: boolean
}

// Used on refusal / parse error / Zod failure / API error / zero images (H6).
export const FALLBACK_THEME: DesignTokens = {
  palette: {
    primary: '#111827',
    secondary: '#374151',
    accent: '#2563eb',
    bg: '#ffffff',
    fg: '#18181b',
    muted: '#6b7280',
    card: '#ffffff',
    border: '#e5e7eb',
    neutral: {
      '50': '#fafafa', '100': '#f4f4f5', '200': '#e4e4e7', '300': '#d4d4d8',
      '400': '#a1a1aa', '500': '#71717a', '600': '#52525b', '700': '#3f3f46',
      '800': '#27272a', '900': '#18181b', '950': '#09090b',
    },
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onAccent: '#ffffff',
  },
  typography: { heading: 'Inter', body: 'Inter', feel: 'humanist', scale: 'normal' },
  radius: 'md',
  density: 'comfortable',
  buttonStyle: 'solid',
  shadow: 'subtle',
  mood: ['minimal', 'modern'],
  artDirection: {
    layout: 'catalog',
    hero: 'split',
    productCard: 'square',
    cardHover: 'lift',
    sectionOrder: ['hero', 'categories', 'products'],
  },
  keywords: [],
}
