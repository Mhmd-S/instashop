import type { H3Event } from 'h3'
import { supabaseAdmin } from '../supabaseAdmin'
import { analyzeBatch, heuristicAnalysis, type AnalyzedPost } from './analyze'
import type { IgMedia } from './client'
import { cleanCaption } from './cleanCaption'
import { assignCategories, uniqueProductSlug } from './importer'

// Manual, no-OAuth import: the seller pastes one post's caption (and optionally its
// permalink) and we mint a single draft product — reusing the exact same Gemini
// analyzer the live sync uses to write the title, description, price, and
// categories. Images are NOT fetched from Instagram here (that needs the Graph API
// and would breach IG's terms); the seller uploads their own photo afterwards via
// the normal product-image endpoint. This keeps onboarding friction near zero while
// staying fully within Instagram's terms.

export interface ManualImportInput {
  caption: string
  permalink: string | null
  title?: string | null // seller override; wins over the AI title when present
  priceMinor?: number | null // seller override; wins over any AI-extracted price
}

export interface ManualImportResult {
  id: string
  slug: string
  title: string
  usedAi: boolean
}

// Run the batched analyzer over the single pasted caption. Falls back to the same
// per-post heuristic the importer uses when Gemini is unavailable or errors.
async function analyzeCaption(storeName: string, caption: string): Promise<{ analysis: AnalyzedPost; usedAi: boolean }> {
  const batch = await analyzeBatch(storeName, [{ index: 0, caption, mediaType: 'IMAGE' }])
  if (batch?.has(0)) return { analysis: batch.get(0)!, usedAi: true }
  // heuristicAnalysis only reads id + caption off the media object.
  return { analysis: heuristicAnalysis({ id: 'manual', caption, media_type: 'IMAGE' } as IgMedia), usedAi: false }
}

export async function createManualProduct(event: H3Event, storeId: string, input: ManualImportInput): Promise<ManualImportResult> {
  const admin = supabaseAdmin(event)

  const { data: store } = await admin.from('stores').select('base_currency, name').eq('id', storeId).maybeSingle()
  const currency = (store as { base_currency?: string } | null)?.base_currency ?? 'USD'
  const storeName = (store as { name?: string } | null)?.name ?? 'Shop'

  const caption = input.caption.trim()
  const { analysis, usedAi } = caption
    ? await analyzeCaption(storeName, caption)
    : { analysis: heuristicAnalysis({ id: 'manual', caption: '', media_type: 'IMAGE' } as IgMedia), usedAi: false }

  // Seller-typed values take precedence; otherwise lean on the analyzer's copy.
  const title = (input.title?.trim() || analysis.title || 'Untitled product').slice(0, 140)
  const priceMinor = input.priceMinor ?? analysis.priceMinor ?? 0
  const description = (analysis.description || cleanCaption(caption, { maxSentences: 3, maxChars: 500 }) || null)?.slice(0, 5000) ?? null

  const slug = await uniqueProductSlug(admin, storeId, title)
  const { data, error } = await admin
    .from('products')
    .insert({
      store_id: storeId,
      source: 'instagram',
      status: 'draft',
      title,
      slug,
      description,
      price_minor: priceMinor,
      currency,
      // Seller is hand-curating this one, so it never needs the AI-review flag and
      // is locked so a later full IG sync won't auto-attach images or rewrite it.
      needs_review: false,
      locked_by_seller: true,
      ig_permalink: input.permalink,
    })
    .select('id, slug')
    .single()

  if (error || !data) {
    console.error('[ig.manual] product insert failed', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not create product' })
  }
  const product = data as { id: string; slug: string }

  // Only the AI suggests categories; a bare caption-less add gets none.
  if (analysis.suggestedCategories.length) {
    await assignCategories(admin, storeId, product.id, analysis.suggestedCategories)
  }

  return { id: product.id, slug: product.slug, title, usedAi }
}
