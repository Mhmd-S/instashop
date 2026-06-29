import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import sharp from 'sharp'
import { supabaseAdmin } from '../supabaseAdmin'

const BUCKET = 'store-media'

// How many candidate images we ever send to the vision model. Bounds token cost +
// latency of the single scoring call (mirrors gatherIdentityImages' cap in build.ts).
const MAX_CANDIDATES = 6

// Lifestyle/branding posts read as a hero best; product shots are the fallback.
const ROLE_PRIORITY: Record<string, number> = {
  hero_candidate: 0, lifestyle: 1, branding: 2, announcement: 3, other: 4, logo_candidate: 5,
}

interface Candidate {
  brandingId: string | null // existing branding_assets row (IG-sourced)
  productImageId: string | null
  storagePath: string
  publicUrl: string | null
  caption: string | null
  role: string
  source: 'ig' | 'product'
}

export interface HeroSelection {
  // selected   — a new hero was chosen and persisted
  // kept-manual — a hand-picked hero exists; left untouched
  // kept-auto   — an auto hero exists and didn't warrant re-scoring; left untouched
  // no-candidates — nothing to choose from
  // error       — selection failed (best-effort; caller ignores)
  status: 'selected' | 'kept-manual' | 'kept-auto' | 'no-candidates' | 'error'
  heroId: string | null
  source: 'ig' | 'product' | null
  score: number | null
  reason: string | null
  candidatesConsidered: number
}

async function downloadBuffer(admin: SupabaseClient, path: string): Promise<Buffer | null> {
  const { data, error } = await admin.storage.from(BUCKET).download(path)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

async function bufferToInline(buf: Buffer): Promise<{ mimeType: string; data: string } | null> {
  try {
    const fmt = (await sharp(buf).metadata()).format
    const mimeType =
      fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : fmt === 'gif' ? 'image/gif' : 'image/jpeg'
    return { mimeType, data: buf.toString('base64') }
  } catch {
    return null
  }
}

// Gather up to MAX_CANDIDATES hero candidates: IG branding posts first (role-priority),
// then product photos to top up — so a shop with no/weak lifestyle posts still gets an
// image-led hero. Deduped by storage_path.
async function gatherCandidates(admin: SupabaseClient, storeId: string): Promise<Candidate[]> {
  const out: Candidate[] = []
  const seen = new Set<string>()

  const { data: branding } = await admin
    .from('branding_assets')
    .select('id, storage_path, public_url, caption, role, source')
    .eq('store_id', storeId)
    .not('storage_path', 'is', null)
  // Exclude product-derived rows here (they're re-gathered fresh from product_images
  // below) so a stale provisional hero can't keep winning against new IG posts.
  const rows = ((branding ?? []) as Array<{
    id: string; storage_path: string; public_url: string | null; caption: string | null; role: string; source: string | null
  }>)
    .filter((r) => r.source !== 'product')
    .sort((a, b) => (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9))
  for (const r of rows) {
    if (seen.has(r.storage_path)) continue
    seen.add(r.storage_path)
    out.push({ brandingId: r.id, productImageId: null, storagePath: r.storage_path, publicUrl: r.public_url, caption: r.caption, role: r.role, source: 'ig' })
    if (out.length >= MAX_CANDIDATES) return out
  }

  // Top up from product photos (primary first, no video).
  const { data: prod } = await admin
    .from('product_images')
    .select('id, storage_path, public_url')
    .eq('store_id', storeId)
    .eq('is_video', false)
    .not('storage_path', 'is', null)
    .order('position', { ascending: true })
    .limit(MAX_CANDIDATES)
  for (const r of (prod ?? []) as Array<{ id: string; storage_path: string; public_url: string | null }>) {
    if (seen.has(r.storage_path)) continue
    seen.add(r.storage_path)
    out.push({ brandingId: null, productImageId: r.id, storagePath: r.storage_path, publicUrl: r.public_url, caption: null, role: 'product', source: 'product' })
    if (out.length >= MAX_CANDIDATES) break
  }
  return out
}

const SCORE_SYSTEM = [
  "You are an art director choosing the single best HERO image for an online shop's landing page.",
  'A great hero is a high-quality, in-focus lifestyle or product photograph with a clear subject and enough open space to overlay a headline.',
  'Penalise: logos, flat graphics, screenshots, text-heavy or announcement images, collages, blurry/low-resolution shots, and busy compositions with no focal point.',
  'Score each image 0-100 for how well it works as a hero, and pick the index of the single best one.',
  'Return ONLY the JSON object — no prose.',
].join(' ')

const SCORE_SCHEMA = {
  type: 'object',
  properties: {
    rankings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          heroScore: { type: 'number' },
          reason: { type: 'string' },
        },
        required: ['index', 'heroScore'],
      },
    },
    best: { type: 'number' },
  },
  required: ['rankings', 'best'],
}

type Part = { text: string } | { inlineData: { mimeType: string; data: string } }
interface ScoreResult { best: number; score: number | null; reason: string | null }

// AI-score the candidates and return the winning index + its score/reason. Falls back
// to index 0 (already role-prioritized) when Gemini is unavailable, refuses, or errors,
// and short-circuits the call entirely for 0–1 candidates (nothing to compare).
async function scoreCandidates(images: Array<{ mimeType: string; data: string }>): Promise<ScoreResult> {
  const cfg = useRuntimeConfig()
  const apiKey = cfg.geminiApiKey
  if (!apiKey || images.length <= 1) return { best: 0, score: null, reason: null }
  try {
    const ai = new GoogleGenAI({ apiKey })
    const parts: Part[] = [
      { text: `Score these ${images.length} candidate hero images (index 0 to ${images.length - 1}) and pick the best.` },
    ]
    images.forEach((img, i) => {
      parts.push({ text: `Image ${i}:` })
      parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
    })
    const res = await ai.models.generateContent({
      // Per-image scoring is a cheaper task than full art direction — use the import
      // model (flash) rather than the pro theme model to respect the spend budget.
      model: cfg.geminiModel || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts }],
      config: { systemInstruction: SCORE_SYSTEM, responseMimeType: 'application/json', responseJsonSchema: SCORE_SCHEMA },
    })
    const text = res.text
    if (!text) return { best: 0, score: null, reason: null }
    const parsed = JSON.parse(text) as { best?: number; rankings?: Array<{ index?: number; heroScore?: number; reason?: string }> }
    const rankings = (Array.isArray(parsed.rankings) ? parsed.rankings : []).filter(
      (r): r is { index: number; heroScore: number; reason?: string } =>
        typeof r.index === 'number' && r.index >= 0 && r.index < images.length && typeof r.heroScore === 'number',
    )
    let best = typeof parsed.best === 'number' ? parsed.best : NaN
    // Validate the model's chosen index; else take the top-scoring ranking; else 0.
    if (!(best >= 0 && best < images.length)) {
      const top = [...rankings].sort((a, b) => b.heroScore - a.heroScore)[0]
      best = top ? top.index : 0
    }
    const winning = rankings.find((r) => r.index === best)
    return {
      best,
      score: winning ? Math.max(0, Math.min(100, Math.round(winning.heroScore))) : null,
      reason: winning?.reason ? winning.reason.trim().slice(0, 280) : null,
    }
  } catch (e) {
    console.error('[hero] gemini scoring failed', (e as Error)?.message)
    return { best: 0, score: null, reason: null }
  }
}

// Persist the winning candidate as the store's single hero. Clears any prior hero,
// then either flags the existing IG branding row, or (for a product photo) copies the
// object into the store's branding space and replaces the single product-sourced row.
async function commitHero(
  admin: SupabaseClient,
  storeId: string,
  winner: Candidate,
  score: number | null,
  reason: string | null,
): Promise<string | null> {
  const heroPatch = { hero_score: score, hero_reason: reason, hero_scored_at: new Date().toISOString() }

  if (winner.source === 'ig' && winner.brandingId) {
    // At most one hero per store — clear any current flag, then flag the winner.
    await admin.from('branding_assets').update({ used_as: null }).eq('store_id', storeId).eq('used_as', 'hero')
    const { data } = await admin
      .from('branding_assets')
      .update({ used_as: 'hero', ...heroPatch })
      .eq('store_id', storeId)
      .eq('id', winner.brandingId)
      .select('id')
      .maybeSingle()
    return (data as { id: string } | null)?.id ?? null
  }

  // Product-photo fallback: copy the object into the store's branding prefix (so a
  // later product/image edit can't break the hero), then replace the single product-
  // sourced branding_asset pointing at the copy.
  const ext = winner.storagePath.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const dest = `${storeId}/branding/hero-product.${ext}`
  let storagePath = winner.storagePath
  let publicUrl = winner.publicUrl
  try {
    await admin.storage.from(BUCKET).remove([dest]) // best-effort; copy fails if dest exists
    const { error: copyErr } = await admin.storage.from(BUCKET).copy(winner.storagePath, dest)
    if (!copyErr) {
      // store-media is public, so the destination's public URL is valid the moment the
      // copy succeeds — derive it deterministically (same pattern as image.post.ts).
      storagePath = dest
      publicUrl = admin.storage.from(BUCKET).getPublicUrl(dest).data.publicUrl
    }
  } catch (e) {
    console.warn('[hero] product image copy failed; referencing original', (e as Error)?.message)
  }

  // Never publish an invisible hero: the storefront query filters out public_url IS
  // NULL, so if we have no usable URL, abort WITHOUT clearing the working hero.
  if (!publicUrl) {
    console.warn('[hero] no usable public_url for product winner; keeping existing hero')
    return null
  }

  // Only now that a usable replacement is guaranteed do we clear the prior hero and
  // keep exactly one provisional product hero per store.
  await admin.from('branding_assets').update({ used_as: null }).eq('store_id', storeId).eq('used_as', 'hero')
  await admin.from('branding_assets').delete().eq('store_id', storeId).eq('source', 'product')
  const { data } = await admin
    .from('branding_assets')
    .insert({
      store_id: storeId,
      ig_media_id: null,
      ig_child_id: null,
      role: 'hero_candidate',
      source: 'product',
      storage_path: storagePath,
      public_url: publicUrl,
      caption: null,
      used_as: 'hero',
      ...heroPatch,
    })
    .select('id')
    .maybeSingle()
  return (data as { id: string } | null)?.id ?? null
}

export interface SelectHeroOptions {
  force?: boolean // re-pick even if a hero is already set (manual "re-pick" action)
}

// Pick (and persist) the storefront hero image automatically, AI-scoring candidate
// images for hero-suitability. Best-effort: NEVER throws — a hero-selection failure
// must not break an import or theme generation.
//
// Stickiness rules (unless `force`):
//   • a manually-chosen hero (no hero_scored_at) is always kept,
//   • an auto IG-sourced hero is kept (we don't re-score every sync — cost),
//   • a provisional product-photo hero is upgraded once real IG branding posts exist.
export async function selectHero(event: H3Event, storeId: string, opts: SelectHeroOptions = {}): Promise<HeroSelection> {
  const admin = supabaseAdmin(event)
  const none = (status: HeroSelection['status'], heroId: string | null = null, source: HeroSelection['source'] = null): HeroSelection => ({
    status, heroId, source, score: null, reason: null, candidatesConsidered: 0,
  })
  try {
    const { data: current } = await admin
      .from('branding_assets')
      .select('id, source, hero_scored_at')
      .eq('store_id', storeId)
      .eq('used_as', 'hero')
      .maybeSingle()
    const cur = current as { id: string; source: string | null; hero_scored_at: string | null } | null

    if (cur && !opts.force) {
      if (!cur.hero_scored_at) return none('kept-manual', cur.id, (cur.source as 'ig' | 'product') ?? null)
      if (cur.source !== 'product') return none('kept-auto', cur.id, 'ig')
      // Provisional product hero — upgrade it only when a NEW IG branding post (created
      // after our last scoring) arrives. A one-shot upgrade, not a re-score every sync:
      // without this freshness check a product hero would re-download + re-score (Gemini
      // spend) on every import as long as any IG post existed.
      const { data: latestIg } = await admin
        .from('branding_assets')
        .select('created_at')
        .eq('store_id', storeId)
        .eq('source', 'ig')
        .not('storage_path', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const latestIgAt = (latestIg as { created_at: string } | null)?.created_at ?? null
      if (!latestIgAt || new Date(latestIgAt).getTime() <= new Date(cur.hero_scored_at).getTime())
        return none('kept-auto', cur.id, 'product')
    }

    const candidates = await gatherCandidates(admin, storeId)
    if (!candidates.length) return none('no-candidates')

    const images: Array<{ mimeType: string; data: string }> = []
    const scored: Candidate[] = []
    for (const c of candidates) {
      const buf = await downloadBuffer(admin, c.storagePath)
      if (!buf) continue
      const inline = await bufferToInline(buf)
      if (!inline) continue
      images.push(inline)
      scored.push(c)
    }
    if (!scored.length) return none('no-candidates')

    const { best, score, reason } = await scoreCandidates(images)
    const winner = scored[best] ?? scored[0]!
    const heroId = await commitHero(admin, storeId, winner, score, reason)
    // commitHero returns null when it couldn't produce a usable hero (e.g. a product
    // winner with no public URL) — it left the existing hero untouched, so report a
    // failure rather than a false 'selected'.
    if (!heroId) return none('error')
    return { status: 'selected', heroId, source: winner.source, score, reason, candidatesConsidered: scored.length }
  } catch (e) {
    console.error('[hero] selectHero failed', (e as Error)?.message)
    return none('error')
  }
}
