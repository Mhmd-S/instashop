import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { supabaseAdmin } from '../supabaseAdmin'
import { getMedia, getProfile, type IgMedia } from './client'
import { readIgToken } from './token'
import { fetchCdnImage, rehostBuffer, rehostToStorage } from './rehost'
import {
  analyzeBatch,
  fallbackAlt,
  heuristicAnalysis,
  imageUnits,
  pickPrimaryUrl,
  type AnalyzedPost,
  type BatchPostInput,
} from './analyze'
import { cleanCaption } from './cleanCaption'
import { aHash, isNearDup } from './phash'
import { slugify } from '~~/shared/utils/slug'

const REVIEW_CONFIDENCE = 0.7 // below → product flagged needs_review
const MAX_ITEMS = 100
const BRANDING_ROLES = ['lifestyle', 'announcement', 'branding', 'hero_candidate', 'logo_candidate', 'other']
const ANALYZE_BATCH_SIZE = 24 // posts per batched Gemini call (keeps one call small enough)

// Image-pipeline tuning.
const MAX_IMAGES_PER_PRODUCT = 8 // gallery cap per product after dedup
const MIN_IMAGE_DIMENSION = 320 // px; smaller images are skipped when avoidable
const KEEP_VIDEO_THUMBS = false // skip video thumbnails when the product has other images

export interface ImportResult {
  total: number
  imported: number // new products created
  merged: number // posts attached to existing products
  branding: number // non-product posts captured
  skipped: number // already-imported posts
  needsReview: number
  usedAi: boolean
}

// --- helpers ------------------------------------------------------------------

async function loadMaterializedIds(admin: SupabaseClient, storeId: string): Promise<Set<string>> {
  const out = new Set<string>()
  const { data: p } = await admin.from('product_ig_posts').select('ig_media_id').eq('store_id', storeId)
  for (const r of (p ?? []) as { ig_media_id: string }[]) out.add(r.ig_media_id)
  const { data: b } = await admin.from('branding_assets').select('ig_media_id').eq('store_id', storeId)
  for (const r of (b ?? []) as { ig_media_id: string }[]) out.add(r.ig_media_id)
  return out
}

interface AnalysisRow {
  ig_media_id: string
  is_product: boolean
  confidence: number
  product_key: string | null
  product_summary: string | null
  title: string | null
  description: string | null
  price_minor: number | null
  attributes: Record<string, unknown> | null
  suggested_categories: string[] | null
  branding_role: string | null
  mood_keywords: string[] | null
  hero_unit_index: number | null
  image_alts: Record<string, string> | null
}

// jsonb image_alts comes back string-keyed; restore the number-keyed unit map.
function altMapFromJson(v: Record<string, string> | null | undefined): Record<number, string> {
  const out: Record<number, string> = {}
  for (const [k, val] of Object.entries(v ?? {})) {
    const n = Number(k)
    if (Number.isInteger(n) && n >= 0 && typeof val === 'string' && val) out[n] = val
  }
  return out
}

async function loadAnalysisCache(admin: SupabaseClient, storeId: string): Promise<Map<string, AnalyzedPost>> {
  const { data } = await admin
    .from('ig_analysis')
    .select(
      'ig_media_id, is_product, confidence, product_key, product_summary, title, description, price_minor, attributes, suggested_categories, branding_role, mood_keywords, hero_unit_index, image_alts',
    )
    .eq('store_id', storeId)
    .is('ig_child_id', null)
  const map = new Map<string, AnalyzedPost>()
  for (const r of (data ?? []) as AnalysisRow[]) {
    map.set(r.ig_media_id, {
      isProduct: r.is_product,
      confidence: Number(r.confidence),
      productKey: r.product_key ?? '',
      productSummary: r.product_summary ?? r.title ?? '',
      title: r.title ?? 'Untitled',
      description: r.description ?? '',
      priceMinor: r.price_minor ?? null,
      attributes: r.attributes ?? {},
      suggestedCategories: r.suggested_categories ?? [],
      brandingRole: r.branding_role ?? null,
      moodKeywords: r.mood_keywords ?? [],
      bestImageIndex: r.hero_unit_index ?? null,
      imageAltByUnit: altMapFromJson(r.image_alts),
    })
  }
  return map
}

// Batched Stage-1 analysis over uncached posts: classify + group (via product_key)
// + write copy in ONE text-only Gemini call per chunk (captions carry the product
// facts). Posts the model omits or a failed call fall back to the per-post heuristic.
async function analyzeFresh(storeName: string, posts: IgMedia[]): Promise<Map<string, AnalyzedPost>> {
  const out = new Map<string, AnalyzedPost>()
  for (let start = 0; start < posts.length; start += ANALYZE_BATCH_SIZE) {
    const chunk = posts.slice(start, start + ANALYZE_BATCH_SIZE)
    const inputs: BatchPostInput[] = chunk.map((m, i) => ({ index: i, caption: m.caption ?? '', mediaType: m.media_type }))
    const res = await analyzeBatch(storeName, inputs)
    for (let i = 0; i < chunk.length; i++) {
      const m = chunk[i]!
      out.set(m.id, res?.get(i) ?? heuristicAnalysis(m))
    }
  }
  return out
}

async function persistAnalysis(
  admin: SupabaseClient,
  storeId: string,
  m: IgMedia,
  a: AnalyzedPost,
  currency: string,
  model: string | null,
) {
  await admin.from('ig_analysis').insert({
    store_id: storeId,
    ig_media_id: m.id,
    ig_child_id: null,
    is_product: a.isProduct,
    confidence: a.confidence,
    product_key: a.productKey || null,
    product_summary: a.productSummary,
    title: a.title,
    description: a.description || null,
    price_minor: a.priceMinor,
    currency,
    attributes: a.attributes,
    suggested_categories: a.suggestedCategories,
    branding_role: a.brandingRole,
    mood_keywords: a.moodKeywords,
    hero_unit_index: a.bestImageIndex,
    image_alts: a.imageAltByUnit,
    model,
  })
}

// Map an existing product_key (from a prior import's analysis) → its live product,
// so a new post sharing that key joins the product instead of duplicating it.
async function loadExistingProductKeys(
  admin: SupabaseClient,
  storeId: string,
): Promise<Map<string, { productId: string; locked: boolean }>> {
  const out = new Map<string, { productId: string; locked: boolean }>()
  const { data: links } = await admin.from('product_ig_posts').select('ig_media_id, product_id').eq('store_id', storeId)
  const linkRows = (links ?? []) as { ig_media_id: string; product_id: string }[]
  if (!linkRows.length) return out
  const mediaToProduct = new Map<string, string>()
  for (const r of linkRows) if (!mediaToProduct.has(r.ig_media_id)) mediaToProduct.set(r.ig_media_id, r.product_id)

  const { data: prods } = await admin
    .from('products')
    .select('id, locked_by_seller')
    .eq('store_id', storeId)
    .eq('source', 'instagram')
    .neq('status', 'archived')
  const lockedById = new Map<string, boolean>()
  for (const p of (prods ?? []) as { id: string; locked_by_seller: boolean }[]) lockedById.set(p.id, p.locked_by_seller)

  const { data: ia } = await admin
    .from('ig_analysis')
    .select('ig_media_id, product_key')
    .eq('store_id', storeId)
    .is('ig_child_id', null)
    .not('product_key', 'is', null)
    .order('ig_media_id', { ascending: true }) // deterministic resolution per key
  for (const r of (ia ?? []) as { ig_media_id: string; product_key: string | null }[]) {
    const key = r.product_key
    if (!key) continue
    const pid = mediaToProduct.get(r.ig_media_id)
    if (!pid || !lockedById.has(pid)) continue // post not materialized into a live product
    const locked = lockedById.get(pid)!
    const prev = out.get(key)
    // First (deterministic) match wins, but always prefer an UNLOCKED product so a
    // colliding key (a locked product + a new draft of the same item) resolves to
    // the editable draft on later syncs — bounding any duplication to one product.
    if (!prev || (prev.locked && !locked)) out.set(key, { productId: pid, locked })
  }
  return out
}

async function createProduct(
  admin: SupabaseClient,
  storeId: string,
  o: { title: string; priceMinor: number; currency: string; description: string | null; needsReview: boolean; m: IgMedia },
): Promise<string> {
  const title = (o.title || 'Imported product').slice(0, 80)
  const base = slugify(title) || 'product'
  let slug = base
  for (let i = 2; i < 200; i++) {
    const { data: clash } = await admin.from('products').select('id').eq('store_id', storeId).eq('slug', slug).maybeSingle()
    if (!clash) break
    slug = `${base}-${i}`
  }
  const { data, error } = await admin
    .from('products')
    .insert({
      store_id: storeId,
      source: 'instagram',
      status: 'draft',
      title,
      slug,
      description: o.description ? o.description.slice(0, 5000) : null,
      price_minor: o.priceMinor,
      currency: o.currency,
      needs_review: o.needsReview,
      ig_media_id: o.m.id,
      ig_permalink: o.m.permalink ?? null,
      ig_posted_at: o.m.timestamp ?? null,
    })
    .select('id')
    .single()
  if (error || !data) {
    throw createError({ statusCode: 500, statusMessage: `Product insert failed: ${error?.message ?? 'no row returned'}` })
  }
  return (data as { id: string }).id
}

// Best clean description for a (possibly merged) product group. Highest-confidence
// member wins; ties → longest description. Never concatenates captions (members are
// the same SKU). Falls back to a deterministically cleaned caption, then null.
function chooseDescription(memberPosts: IgMedia[], analyses: Map<string, AnalyzedPost>): string | null {
  const ranked = memberPosts
    .map((m) => ({ m, a: analyses.get(m.id) }))
    .sort(
      (x, y) =>
        (y.a?.confidence ?? 0) - (x.a?.confidence ?? 0) ||
        (y.a?.description?.length ?? 0) - (x.a?.description?.length ?? 0),
    )
  for (const { a } of ranked) if (a?.description) return a.description
  const fallback = cleanCaption(ranked[0]?.m.caption, { maxSentences: 3, maxChars: 400 })
  return fallback || null
}

interface LinkUnit {
  mediaId: string
  childId: string | null
  permalink: string | null
  postedAt: string | null
}
interface CandidateUnit extends LinkUnit {
  unitIndex: number
  url: string
  isVideo: boolean
}
interface KeptUnit extends CandidateUnit {
  buf: Buffer
  type: string
  w: number
  h: number
  phash: string | null
  alt: string | null
}

// Identity for exact-URL dedup: IG CDN URLs carry volatile signed-token query
// params, so identify by origin+path but keep the full URL for fetching.
function urlKey(u: string): string {
  try {
    const x = new URL(u)
    return x.origin + x.pathname
  } catch {
    return u
  }
}

async function insertLink(admin: SupabaseClient, storeId: string, productId: string, l: LinkUnit, imageId: string | null = null) {
  await admin.from('product_ig_posts').insert({
    store_id: storeId,
    product_id: productId,
    ig_media_id: l.mediaId,
    ig_child_id: l.childId,
    product_image_id: imageId,
    ig_permalink: l.permalink,
    ig_posted_at: l.postedAt,
  })
}

// Attach all images of a (possibly merged) product group: fetch each unit once,
// perceptual-hash dedup, drop video/tiny frames when avoidable, KEEP the seller's
// original photo order (their lead photo stays the hero) with video thumbnails last,
// cap, re-host, and write alt text. Every member-post unit gets a product_ig_posts
// link (image-backed or bare) so re-syncs skip it. When appending to an existing
// product (merge) positions start after its current max and the existing hero
// (position 0) is preserved.
async function attachGroupImages(
  admin: SupabaseClient,
  storeId: string,
  productId: string,
  memberPosts: IgMedia[],
  analyses: Map<string, AnalyzedPost>,
  productTitle: string,
) {
  // Existing images (merge case): seed dedup hashes + start after the current max.
  const { data: existing } = await admin.from('product_images').select('position, phash').eq('product_id', productId)
  let startPos = 0
  const hashes: string[] = []
  for (const r of (existing ?? []) as { position: number; phash: string | null }[]) {
    startPos = Math.max(startPos, r.position + 1)
    if (r.phash) hashes.push(r.phash)
  }

  // Collect candidate units across all members, exact-URL-deduped. A unit whose URL
  // was already seen (same asset reposted across member posts) still gets a bare
  // link via urlDupes so every member-post unit keeps exactly one provenance row.
  const seenUrl = new Set<string>()
  const candidates: CandidateUnit[] = []
  const urlDupes: LinkUnit[] = []
  for (const m of memberPosts) {
    imageUnits(m).forEach((u, unitIndex) => {
      const k = urlKey(u.url)
      if (seenUrl.has(k)) {
        urlDupes.push({ mediaId: m.id, childId: u.childId, permalink: m.permalink ?? null, postedAt: m.timestamp ?? null })
        return
      }
      seenUrl.add(k)
      candidates.push({
        mediaId: m.id,
        childId: u.childId,
        unitIndex,
        url: u.url,
        isVideo: u.isVideo,
        permalink: m.permalink ?? null,
        postedAt: m.timestamp ?? null,
      })
    })
  }

  const kept: KeptUnit[] = []
  const linkOnly: LinkUnit[] = []
  for (const c of candidates) {
    const img = await fetchCdnImage(c.url)
    if (!img) {
      linkOnly.push(c)
      continue
    }
    const ph = await aHash(img.buf)
    if (ph != null && hashes.some((p) => isNearDup(p, ph))) {
      linkOnly.push(c) // near-duplicate of an image we already kept
      continue
    }
    if (ph != null) hashes.push(ph)
    const meta = await sharp(img.buf, { failOn: 'none' }).metadata().catch(() => null)
    const w = meta?.width ?? 0
    const h = meta?.height ?? 0
    const a = analyses.get(c.mediaId)
    kept.push({
      ...c,
      buf: img.buf,
      type: img.type,
      w,
      h,
      phash: ph,
      alt: a?.imageAltByUnit?.[c.unitIndex] ?? null,
    })
  }

  // Prefer real, large-enough photos, but never empty the gallery.
  const useful = kept.filter((u) => !u.isVideo && Math.max(u.w, u.h) >= MIN_IMAGE_DIMENSION)
  const gallery = (KEEP_VIDEO_THUMBS ? kept : useful).length ? (KEEP_VIDEO_THUMBS ? kept : useful) : kept.slice()
  const filtered = kept.filter((u) => !gallery.includes(u))

  // Keep the seller's original photo order (gallery is already in member/carousel
  // order); only push video thumbnails to the end. Array.sort is stable, so
  // same-isVideo units retain their original order → the lead photo stays hero.
  gallery.sort((a, b) => (a.isVideo ? 1 : 0) - (b.isVideo ? 1 : 0))
  const finalUnits = gallery.slice(0, MAX_IMAGES_PER_PRODUCT)
  const capped = gallery.slice(MAX_IMAGES_PER_PRODUCT)

  let pos = startPos
  for (const u of finalUnits) {
    const stored = await rehostBuffer(admin, `${storeId}/ig/${u.mediaId}_${u.childId ?? '0'}`, { buf: u.buf, type: u.type })
    if (!stored) {
      linkOnly.push(u)
      continue
    }
    const alt = (u.alt && u.alt.trim()) || fallbackAlt(productTitle, pos)
    const { data: imgRow } = await admin
      .from('product_images')
      .insert({
        product_id: productId,
        store_id: storeId,
        storage_path: stored.storagePath,
        public_url: stored.publicUrl,
        alt,
        position: pos,
        is_video: u.isVideo,
        video_url: u.isVideo ? u.url : null,
        phash: u.phash,
      })
      .select('id')
      .single()
    await insertLink(admin, storeId, productId, u, (imgRow as { id: string } | null)?.id ?? null)
    pos++
  }

  // Link every non-image unit (deduped / filtered / capped / rehost-failed / URL-dup)
  // so the post still counts as imported and re-syncs skip it.
  for (const l of [...linkOnly, ...filtered, ...capped, ...urlDupes]) await insertLink(admin, storeId, productId, l)

  // A member post that produced NO units at all (no candidate and no URL-dup) still
  // needs a bare link so it counts as imported.
  for (const m of memberPosts) {
    const covered = candidates.some((c) => c.mediaId === m.id) || urlDupes.some((d) => d.mediaId === m.id)
    if (!covered) {
      await insertLink(admin, storeId, productId, { mediaId: m.id, childId: null, permalink: m.permalink ?? null, postedAt: m.timestamp ?? null })
    }
  }
}

// Title-case a category name for consistent display ("accessories" -> "Accessories",
// "hair accessories" -> "Hair Accessories").
function titleCaseCategory(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
    .slice(0, 60)
}

async function assignCategories(admin: SupabaseClient, storeId: string, productId: string, names: string[]) {
  for (const name of names) {
    const slug = slugify(name)
    if (!slug) continue
    const { data: existing } = await admin
      .from('categories')
      .select('id')
      .eq('store_id', storeId)
      .eq('slug', slug)
      .maybeSingle()
    let catId = (existing as { id: string } | null)?.id
    if (!catId) {
      const { data: created } = await admin
        .from('categories')
        .insert({ store_id: storeId, slug, name: titleCaseCategory(name), source: 'ai', position: 0 })
        .select('id')
        .maybeSingle()
      catId = (created as { id: string } | null)?.id
    }
    if (catId) {
      await admin
        .from('product_categories')
        .upsert({ product_id: productId, category_id: catId, store_id: storeId }, { onConflict: 'product_id,category_id', ignoreDuplicates: true })
    }
  }
}

async function createBrandingAsset(admin: SupabaseClient, storeId: string, m: IgMedia, a: AnalyzedPost) {
  const primary = pickPrimaryUrl(m)
  let storagePath: string | null = null
  let publicUrl: string | null = null
  if (primary) {
    const stored = await rehostToStorage(admin, `${storeId}/branding/${m.id}`, primary)
    if (stored) {
      storagePath = stored.storagePath
      publicUrl = stored.publicUrl
    }
  }
  const role = a.brandingRole && BRANDING_ROLES.includes(a.brandingRole) ? a.brandingRole : 'other'
  await admin.from('branding_assets').insert({
    store_id: storeId,
    ig_media_id: m.id,
    ig_child_id: null,
    role,
    storage_path: storagePath,
    public_url: publicUrl,
    caption: m.caption ?? null,
    mood_keywords: a.moodKeywords,
    ig_permalink: m.permalink ?? null,
    ig_posted_at: m.timestamp ?? null,
  })
}

// Refresh cached IG profile fields on every sync. The profile-picture URL expires
// and the picture itself can change — keeping it current means the next theme
// regenerate derives the palette from the up-to-date logo. Best-effort.
async function refreshProfile(admin: SupabaseClient, storeId: string, token: string) {
  try {
    const profile = await getProfile(token)
    if (!profile) return
    const patch: Record<string, unknown> = {}
    if (profile.profile_picture_url) patch.profile_picture_url = profile.profile_picture_url
    if (profile.username) patch.ig_username = profile.username
    if (profile.account_type) patch.account_type = profile.account_type
    if (typeof profile.media_count === 'number') patch.media_count = profile.media_count
    if (Object.keys(patch).length) await admin.from('ig_accounts').update(patch).eq('store_id', storeId)
  } catch (e) {
    console.warn('[ig] profile refresh failed', (e as Error)?.message)
  }
}

// --- orchestrator -------------------------------------------------------------

export async function runImport(event: H3Event, storeId: string): Promise<ImportResult> {
  const admin = supabaseAdmin(event)

  const { data: acct } = await admin
    .from('ig_accounts')
    .select('access_token_secret_id')
    .eq('store_id', storeId)
    .maybeSingle()
  const secretId = (acct as { access_token_secret_id?: string | null } | null)?.access_token_secret_id
  if (!secretId) throw createError({ statusCode: 400, statusMessage: 'Instagram is not connected' })
  const token = await readIgToken(event, secretId)
  if (!token) throw createError({ statusCode: 500, statusMessage: 'Could not read Instagram token' })

  // Keep the stored logo URL fresh so the next theme regenerate uses the current
  // Instagram profile picture (a logo change on IG flows through here).
  await refreshProfile(admin, storeId, token)

  const media = await getMedia(token, { maxItems: MAX_ITEMS, maxPages: 4, pageSize: 50 })
  return materializeImport(event, storeId, media)
}

// Run analyze -> cluster -> materialize over an explicit media list. Shared by the
// live sync (runImport) and the dev fixture importer, so fixtures exercise the
// exact same code path as a real Instagram import.
export async function materializeImport(event: H3Event, storeId: string, media: IgMedia[]): Promise<ImportResult> {
  const admin = supabaseAdmin(event)
  const cfg = useRuntimeConfig()
  const usedAi = !!cfg.geminiApiKey
  const model = usedAi ? cfg.geminiModel || 'gemini-2.5-flash' : null

  const { data: store } = await admin.from('stores').select('base_currency, name').eq('id', storeId).maybeSingle()
  const currency = (store as { base_currency?: string } | null)?.base_currency ?? 'USD'
  const storeName = (store as { name?: string } | null)?.name ?? 'Shop'

  const materialized = await loadMaterializedIds(admin, storeId)
  const newPosts = media.filter((m) => !materialized.has(m.id))
  const skipped = media.length - newPosts.length

  // Stage 1 — batched analysis over uncached posts (reuse cache; robust to partial runs).
  const cached = await loadAnalysisCache(admin, storeId)
  const analyses = new Map<string, AnalyzedPost>()
  const toAnalyze: IgMedia[] = []
  for (const m of newPosts) {
    const a = cached.get(m.id)
    if (a) analyses.set(m.id, a)
    else toAnalyze.push(m)
  }
  if (toAnalyze.length) {
    const fresh = await analyzeFresh(storeName, toAnalyze)
    for (const m of toAnalyze) {
      const a = fresh.get(m.id) ?? heuristicAnalysis(m)
      analyses.set(m.id, a)
      await persistAnalysis(admin, storeId, m, a, currency, model)
    }
  }

  // Trust the model's is_product classification for the product/branding split;
  // confidence only gates the needs-review flag below.
  const productPosts = newPosts.filter((m) => analyses.get(m.id)!.isProduct)
  const productSet = new Set(productPosts.map((m) => m.id))
  const nonProductPosts = newPosts.filter((m) => !productSet.has(m.id))

  // Stage 2 — group by product_key (empty key → its own product). A new post sharing
  // a key with an already-imported product joins that product.
  const existingKeys = await loadExistingProductKeys(admin, storeId)
  const groupsByKey = new Map<string, IgMedia[]>()
  const groups: { key: string; members: IgMedia[] }[] = []
  for (const m of productPosts) {
    const key = analyses.get(m.id)!.productKey
    if (!key) {
      groups.push({ key: '', members: [m] })
      continue
    }
    let members = groupsByKey.get(key)
    if (!members) {
      members = []
      groupsByKey.set(key, members)
      groups.push({ key, members })
    }
    members.push(m)
  }

  let imported = 0
  let merged = 0
  let needsReview = 0
  for (const g of groups) {
    const memberPosts = g.members
    if (!memberPosts.length) continue
    // Highest-confidence member drives the product's title/price.
    let bestA = analyses.get(memberPosts[0]!.id)!
    for (const m of memberPosts) {
      const a = analyses.get(m.id)!
      if (a.confidence > bestA.confidence) bestA = a
    }
    const groupTitle = bestA.title

    let productId: string | null = null
    const existing = g.key ? existingKeys.get(g.key) : undefined
    if (existing && !existing.locked) {
      productId = existing.productId
      merged++
    }
    if (!productId) {
      // A locked product already owns this key: don't disturb the seller's curated
      // product — create a separate draft and flag it for review as a likely dup.
      const lockedCollision = !!existing?.locked
      const review = lockedCollision || bestA.confidence < REVIEW_CONFIDENCE
      productId = await createProduct(admin, storeId, {
        title: groupTitle,
        priceMinor: bestA.priceMinor ?? 0,
        currency,
        description: chooseDescription(memberPosts, analyses),
        needsReview: review,
        m: memberPosts[0]!,
      })
      imported++
      if (review) needsReview++
    }

    await attachGroupImages(admin, storeId, productId, memberPosts, analyses, groupTitle)
    await admin.rpc('sync_primary_image', { p_product: productId, p_store: storeId })

    const cats = new Set<string>()
    for (const m of memberPosts) for (const c of analyses.get(m.id)!.suggestedCategories) cats.add(c)
    if (cats.size) await assignCategories(admin, storeId, productId, [...cats])
  }

  let branding = 0
  for (const m of nonProductPosts) {
    await createBrandingAsset(admin, storeId, m, analyses.get(m.id)!)
    branding++
  }

  await admin
    .from('ig_accounts')
    .update({ last_sync_at: new Date().toISOString(), last_sync_error: null })
    .eq('store_id', storeId)

  return { total: media.length, imported, merged, branding, skipped, needsReview, usedAi }
}
