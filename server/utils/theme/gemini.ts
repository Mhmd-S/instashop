import { GoogleGenAI } from '@google/genai'
import { ALLOWED_BODY_FONTS, ALLOWED_HEADING_FONTS, ALLOWED_MOOD } from '~~/shared/types/theme'

export interface ThemeImage {
  mimeType: string
  data: string // base64
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } }

const NEUTRAL_KEYS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

const SYSTEM = [
  'You are a brand designer.',
  "Given a shop's name and sample images, infer a cohesive visual theme as design tokens.",
  'Base decisions ONLY on what is visible or strongly implied by the images and name.',
  'Use real hex colors (#rrggbb). Ensure body and muted text are readable on bg (target contrast >= 4.5:1).',
  'Pick fonts ONLY from the provided allowlists. Pick mood ONLY from the allowed set.',
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
    keywords: { type: 'array', items: { type: 'string' } },
  },
  required: ['palette', 'typography', 'radius', 'density', 'buttonStyle', 'shadow', 'mood'],
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
    const parts: Part[] = [
      {
        text:
          `Shop name: ${opts.storeName}\n` +
          `Heading fonts allowed: ${ALLOWED_HEADING_FONTS.join(', ')}\n` +
          `Body fonts allowed: ${ALLOWED_BODY_FONTS.join(', ')}\n` +
          `Mood allowed: ${ALLOWED_MOOD.join(', ')}\n` +
          (hints.length ? `Brand mood words from the shop's posts: ${hints.join(', ')}\n` : '') +
          `Produce the design-token JSON for this shop's storefront.`,
      },
    ]
    for (const img of opts.images) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })

    const res = await ai.models.generateContent({
      model: cfg.geminiModel || 'gemini-2.5-flash',
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
