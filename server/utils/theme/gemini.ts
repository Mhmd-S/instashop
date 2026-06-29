import { GoogleGenAI } from '@google/genai'
import {
  ALLOWED_BODY_FONTS,
  ALLOWED_CARD_HOVER,
  ALLOWED_HEADING_FONTS,
  ALLOWED_HERO,
  ALLOWED_LAYOUT,
  ALLOWED_MOOD,
  ALLOWED_PRODUCT_CARD,
} from '~~/shared/types/theme'
// Generation offers only the Phase-1 renderable sections so a freshly-generated theme
// always composes a complete page. The richer image-backed catalog is authored by the
// dedicated two-pass compose endpoint (Phase 4), not this once-per-store token call.
import { DEFAULT_SECTION_ORDER } from '~~/shared/types/template'

export interface ThemeImage {
  mimeType: string
  data: string // base64
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

const NEUTRAL_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

const SYSTEM = [
  'You are an art director designing a fashion/lifestyle e-commerce storefront for an Instagram shop.',
  "Given a shop's name, the visual identity of its posts (sample images), and brand mood words, infer a cohesive, on-brand storefront — both its design tokens AND its structural art direction.",
  'Base decisions ONLY on what is visible or strongly implied by the images, mood words, and name.',
  'Use real hex colors (#rrggbb). Ensure body and muted text are readable on bg (target contrast >= 4.5:1).',
  'Pick fonts, mood, and every artDirection value ONLY from the provided allowlists/enums.',
  'artDirection is how the shop\'s IDENTITY shows in STRUCTURE, not just colour — choose it deliberately:',
  '- layout: "lookbook" for photography-led/aspirational shops with strong lifestyle imagery; "editorial" for content-rich, magazine-like brands; "boutique" for refined, premium, considered shops; "catalog" for product-dense, browse-first shops.',
  '- hero: "full-bleed" for immersive image-forward brands; "split" for balanced product+story; "centered" for minimal/editorial; "offset" for bold, modern, asymmetric brands.',
  '- productCard: "portrait" for fashion/apparel (tall shots); "editorial" for styled/lifestyle catalogs; "square" for mixed catalogs; "tile" for dense, utilitarian grids.',
  '- cardHover: "zoom" for image-led shops, "lift" for tactile/playful, "none" for austere/minimal.',
  '- sectionOrder: a subset+ordering of the allowed sections matching how this shop should guide a shopper.',
  'Return ONLY the JSON object — no prose.',
].join(' ')

// JSON Schema passed via responseJsonSchema (server-side validation still clamps).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    palette: {
      type: 'object',
      properties: {
        primary: { type: 'string' },
        secondary: { type: 'string' },
        accent: { type: 'string' },
        bg: { type: 'string' },
        fg: { type: 'string' },
        muted: { type: 'string' },
        card: { type: 'string' },
        border: { type: 'string' },
        neutral: {
          type: 'object',
          properties: Object.fromEntries(NEUTRAL_KEYS.map((k) => [k, { type: 'string' }])),
        },
      },
    },
    typography: {
      type: 'object',
      properties: {
        heading: { type: 'string', enum: [...ALLOWED_HEADING_FONTS] },
        body: { type: 'string', enum: [...ALLOWED_BODY_FONTS] },
        feel: { type: 'string', enum: ['serif', 'sans-display', 'geometric', 'humanist', 'monospace-accent'] },
        scale: { type: 'string', enum: ['tight', 'normal', 'airy'] },
      },
    },
    radius: { type: 'string', enum: ['none', 'sm', 'md', 'lg', 'xl', 'full'] },
    density: { type: 'string', enum: ['compact', 'cozy', 'comfortable'] },
    buttonStyle: { type: 'string', enum: ['solid', 'soft', 'outline', 'pill'] },
    shadow: { type: 'string', enum: ['none', 'subtle', 'pronounced'] },
    mood: { type: 'array', items: { type: 'string', enum: [...ALLOWED_MOOD] } },
    artDirection: {
      type: 'object',
      properties: {
        layout: { type: 'string', enum: [...ALLOWED_LAYOUT] },
        hero: { type: 'string', enum: [...ALLOWED_HERO] },
        productCard: { type: 'string', enum: [...ALLOWED_PRODUCT_CARD] },
        cardHover: { type: 'string', enum: [...ALLOWED_CARD_HOVER] },
        sectionOrder: { type: 'array', items: { type: 'string', enum: [...DEFAULT_SECTION_ORDER] } },
      },
      required: ['layout', 'hero', 'productCard', 'cardHover'],
    },
    // One short sentence: WHY this art direction fits the shop. Display-only (shown to
    // the seller in the theme editor) — never injected into CSS/HTML.
    rationale: { type: 'string' },
    keywords: { type: 'array', items: { type: 'string' } },
  },
  required: ['palette', 'typography', 'radius', 'density', 'buttonStyle', 'shadow', 'mood', 'artDirection'],
}

// Returns the raw token object (validated/clamped by persistTheme) or null when no
// API key / refusal / error — caller falls back to the default theme.
export async function generateThemeTokens(opts: {
  storeName: string
  images: ThemeImage[]
  moodHints?: string[]
}): Promise<unknown | null> {
  const cfg = useRuntimeConfig()
  const apiKey = cfg.geminiApiKey
  if (!apiKey) return null

  const hints = (opts.moodHints ?? []).filter(Boolean).slice(0, 12)
  try {
    const ai = new GoogleGenAI({ apiKey })
    const imgNote = opts.images.length > 1
      ? `The first image is the shop's logo; the rest are representative posts that capture its visual identity (photography style, palette, mood).`
      : `The image is the shop's logo.`
    const parts: Part[] = [
      {
        text:
          `Shop name: ${opts.storeName}\n` +
          `Heading fonts allowed: ${ALLOWED_HEADING_FONTS.join(', ')}\n` +
          `Body fonts allowed: ${ALLOWED_BODY_FONTS.join(', ')}\n` +
          `Mood allowed: ${ALLOWED_MOOD.join(', ')}\n` +
          (hints.length ? `Brand mood words from the shop's posts: ${hints.join(', ')}\n` : '') +
          `${imgNote}\n` +
          `Produce the design-token + artDirection JSON for this shop's storefront, choosing structure that genuinely reflects this shop's identity.`,
      },
    ]
    for (const img of opts.images) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })

    const res = await ai.models.generateContent({
      // A once-per-store art-direction call: prefer the stronger "thinking" model
      // (geminiThemeModel, default gemini-2.5-pro) over the per-post import model.
      model: cfg.geminiThemeModel || cfg.geminiModel || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    })

    const text = res.text
    if (!text) return null
    return JSON.parse(text)
  } catch (e) {
    console.error('[theme] gemini generation failed', (e as Error)?.message)
    return null
  }
}
