import { GoogleGenAI } from '@google/genai'
import type { IgMedia } from './client'
import { cleanCaption } from './cleanCaption'

export interface AnalyzedPost {
  isProduct: boolean
  confidence: number // 0..1
  productKey: string // stable slug for the exact item; same key => same product (merge)
  productSummary: string // canonical identity (human readable)
  title: string
  description: string // original merchandised copy, 2-4 sentences; '' when none
  priceMinor: number | null
  attributes: Record<string, unknown>
  suggestedCategories: string[]
  brandingRole: string | null // when not a product
  moodKeywords: string[]
  // Per-frame image signal — only populated by an (optional) future per-frame pass;
  // the batched analyzer leaves these empty and the importer falls back to a
  // heuristic hero + title-based alt. Kept for cache/schema compatibility.
  bestImageIndex: number | null
  imageAltByUnit: Record<number, string>
}

const DESCRIPTION_MAX = 500 // chars; comfortably fits 2-4 merchandising sentences
const BRANDING_ROLE_ENUM = ['lifestyle', 'announcement', 'branding', 'hero_candidate', 'logo_candidate', 'other']

// Primary display image for a post (carousel → first child; video → thumbnail).
export function pickPrimaryUrl(m: IgMedia): string | null {
  if (m.media_type === 'VIDEO') return m.thumbnail_url ?? m.media_url ?? null
  if (m.media_type === 'CAROUSEL_ALBUM') {
    const c = m.children?.data?.[0]
    return c?.media_url ?? c?.thumbnail_url ?? null
  }
  return m.media_url ?? null
}

export interface ImageUnit {
  url: string
  childId: string | null
  isVideo: boolean
}

// Every image-unit of a post: a single image (childId null) or each carousel child.
// Array index === "unit index", the stable key the analysis and importer share.
export function imageUnits(m: IgMedia): ImageUnit[] {
  if (m.media_type === 'CAROUSEL_ALBUM') {
    return (m.children?.data ?? [])
      .map((c) => ({ url: c.media_url ?? c.thumbnail_url ?? '', childId: c.id, isVideo: c.media_type === 'VIDEO' }))
      .filter((u) => u.url)
  }
  const url = pickPrimaryUrl(m)
  return url ? [{ url, childId: null, isVideo: m.media_type === 'VIDEO' }] : []
}

const PRICE_RE = /(\d+(?:[.,]\d{1,2})?)/

// Used when Gemini is unavailable: a naive heuristic (each post its own product),
// with a cleaned caption + title and no merge key.
export function heuristicAnalysis(m: IgMedia): AnalyzedPost {
  const caption = m.caption ?? ''
  const cleanedTitle = cleanCaption(caption.split('\n')[0] ?? '', { maxSentences: 1, maxChars: 80 }).replace(/[.!?]+$/, '')
  const title = (cleanedTitle || `Imported post ${m.id.slice(-6)}`).slice(0, 80)
  const pm = caption.match(PRICE_RE)
  const parsed = pm ? Math.round(Number.parseFloat(pm[1]!.replace(',', '.')) * 100) : null
  return {
    isProduct: true,
    confidence: 0.5,
    productKey: '', // empty => never merges with another post
    productSummary: title,
    title,
    description: cleanCaption(caption, { maxSentences: 3, maxChars: DESCRIPTION_MAX }),
    priceMinor: parsed != null && Number.isFinite(parsed) ? parsed : null,
    attributes: {},
    suggestedCategories: [],
    brandingRole: null,
    moodKeywords: [],
    bestImageIndex: null,
    imageAltByUnit: {},
  }
}

const BATCH_SYSTEM = [
  'You import an Instagram shop. You are given a numbered list of POSTS (the caption text of each).',
  'Classify EVERY post INDEPENDENTLY and completely — analyze each on its own merits, never skip, summarize, or dismiss later posts because earlier ones were similar. Return exactly one object for EVERY post index given.',
  'is_product: true when the post describes a concrete item the shop SELLS — a price, a product name, sizes, colours, fabric/material, or "available"/"restock" are strong signals of a product. Set false ONLY for clearly non-sellable posts: pure lifestyle/aesthetic shots, sale/event announcements, quotes, behind-the-scenes, or general branding. When a caption clearly names and prices an item, it IS a product.',
  'product_key: for each PRODUCT, a short lowercase slug for the EXACT item (e.g. "aria-linen-midi-dress-oatmeal"). Posts about the SAME item (a restock, another angle, or a styled shot) MUST share the SAME product_key so they merge. A different colour, size, or style is a DIFFERENT product_key. Be conservative: prefer different keys over wrongly merging two different items. Empty product_key for non-products.',
  'title: a concise product name (no emoji/hashtags/price).',
  'description: write ORIGINAL, appealing merchandising copy of 2-4 short sentences for the product — do NOT copy or lightly reword the caption; compose fresh store copy in your own words, third person, present tense, even when the caption is terse or just a name + price. Open with an inviting hook, then describe how the item looks, feels, and can be styled or used, in confident, on-brand retail language (generic appeal like "a versatile wardrobe staple" or "effortlessly elegant" is welcome). Stay consistent with any concrete facts the caption DOES give (material, colour, sizes, silhouette) and weave them in, but do NOT fabricate hard specifications it never states — no invented measurements, fabric composition, care instructions, origin, or certifications, and no invented price. FORBIDDEN tokens: hashtags, emoji, @handles, URLs, phone numbers, prices/currency, stock-status claims ("in stock", "sold out", "restocking"), and any call to action ("DM to order", "link in bio", "shop now"). Empty string if not a product.',
  'price: extract ONLY if a price is explicitly written in the caption.',
  'categories: assign 1-2 BROAD, browsable categories per product — like the nav menu of a real shop (e.g. "dresses", "skirts", "tops", "sets", "bags", "accessories", "home", "mugs"). CONSISTENCY IS CRITICAL: across ALL posts use the SAME category name for similar items (always "dresses", never "dress" for one and "midi dress" for another). Use plural nouns. Do NOT use materials ("linen"), colours, sizes, occasions, or ultra-specific sub-types ("midi dress", "wrap skirt", "scrunchie") as categories — fold those into the broad category. Keep the whole shop to a small, coherent set of categories.',
  'When not a product, set branding_role to one of: lifestyle, announcement, branding, hero_candidate, logo_candidate, other.',
  'Return ONLY the JSON object with one entry per post index.',
].join(' ')

const BATCH_SCHEMA = {
  type: 'object',
  properties: {
    posts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          is_product: { type: 'boolean' },
          confidence: { type: 'number' },
          product_key: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string', maxLength: 500 },
          price: { type: 'number' },
          currency_guess: { type: 'string' },
          categories: { type: 'array', items: { type: 'string' } },
          branding_role: { type: 'string', enum: BRANDING_ROLE_ENUM },
          mood_keywords: { type: 'array', items: { type: 'string' } },
        },
        required: ['index', 'is_product'],
      },
    },
  },
  required: ['posts'],
}

export interface BatchPostInput {
  index: number
  caption: string
  mediaType: string
}

// Single text-only batched call: classify + group (via product_key) + write copy
// for all posts at once. Captions carry the product facts (price, material,
// sizes), so this is both cheapest (no image tokens) and avoids the attribution
// failure of interleaving many images in one multimodal call. Returns a map of
// post-index → AnalyzedPost, or null when Gemini is unavailable / errors.
export async function analyzeBatch(storeName: string, posts: BatchPostInput[]): Promise<Map<number, AnalyzedPost> | null> {
  const cfg = useRuntimeConfig()
  if (!cfg.geminiApiKey || !posts.length) return null
  try {
    const ai = new GoogleGenAI({ apiKey: cfg.geminiApiKey })
    const list = posts
      .map((p) => `Post ${p.index} (${p.mediaType}):\n${(p.caption || '(no caption)').slice(0, 800)}`)
      .join('\n\n')
    const prompt = `Shop: ${storeName}\nThere are ${posts.length} posts. Classify each, write copy, and group same-item posts via product_key.\n\n${list}`

    const res = await ai.models.generateContent({
      model: cfg.geminiModel || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { systemInstruction: BATCH_SYSTEM, responseMimeType: 'application/json', responseJsonSchema: BATCH_SCHEMA },
    })
    const text = res.text
    if (!text) return null
    return validateBatch(JSON.parse(text), posts)
  } catch (e) {
    console.error('[ig.analyzeBatch] failed', (e as Error)?.message)
    return null
  }
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function strArr(v: unknown, max: number, len: number): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim().slice(0, len))
    .filter(Boolean)
    .slice(0, max)
}

// Normalize a model product_key into a stable grouping slug.
export function normalizeProductKey(v: unknown): string {
  if (typeof v !== 'string') return ''
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// Validate one post object from the batch into a safe AnalyzedPost. Never throws.
export function validateBatchPost(raw: unknown): AnalyzedPost {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  // The model frequently omits confidence; default to a "confident enough" value so
  // a classified product isn't silently dropped by the product threshold.
  const rawConf = num(r.confidence)
  const confidence = rawConf != null ? Math.max(0, Math.min(1, rawConf)) : 0.8
  const priceRaw = num(r.price)
  const priceMinor = priceRaw != null && priceRaw >= 0 ? Math.round(priceRaw * 100) : null
  const title = (typeof r.title === 'string' ? r.title : '').trim().slice(0, 80)
  const isProduct = r.is_product === true
  const productKey = isProduct ? normalizeProductKey(r.product_key) : ''

  // Safety net over the model's own copy: strip any forbidden tokens (emoji,
  // hashtags, URLs, phone, price, CTA) it slipped in, but keep the trim generous
  // so well-formed 2-4 sentence merchandising copy is not chopped.
  let description = cleanCaption(typeof r.description === 'string' ? r.description : '', {
    maxSentences: 4,
    maxChars: DESCRIPTION_MAX,
  })
  const norm = (s: string) => s.replace(/[.!?\s]+$/, '').trim().toLowerCase()
  if (description && title && norm(description) === norm(title)) description = ''

  const role = typeof r.branding_role === 'string' && BRANDING_ROLE_ENUM.includes(r.branding_role) ? r.branding_role : null

  return {
    isProduct,
    confidence,
    productKey,
    productSummary: (productKey || title).slice(0, 200),
    title: title || 'Untitled',
    description,
    priceMinor,
    attributes: r.attributes && typeof r.attributes === 'object' ? (r.attributes as Record<string, unknown>) : {},
    suggestedCategories: strArr(r.categories, 2, 40),
    brandingRole: isProduct ? null : role,
    moodKeywords: strArr(r.mood_keywords, 6, 40),
    bestImageIndex: null,
    imageAltByUnit: {},
  }
}

// Map a batch response to index → AnalyzedPost. Indices the model omitted are left
// absent so the caller can fall back to the heuristic for those posts.
export function validateBatch(raw: unknown, inputs: BatchPostInput[]): Map<number, AnalyzedPost> {
  const valid = new Set(inputs.map((p) => p.index))
  const out = new Map<number, AnalyzedPost>()
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const arr = Array.isArray(r.posts) ? r.posts : []
  for (const item of arr) {
    const o = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const idx = num(o.index)
    if (idx == null || !valid.has(idx) || out.has(idx)) continue
    out.set(idx, validateBatchPost(o))
  }
  return out
}

// Deterministic alt fallback when no model alt exists. Title is already clean.
export function fallbackAlt(title: string, position: number): string {
  const base = (title || 'Product photo').slice(0, 100)
  return position === 0 ? base : `${base} — photo ${position + 1}`
}
