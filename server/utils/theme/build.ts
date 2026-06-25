import type { H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DesignTokens, ThemeLogo } from '~~/shared/types/theme'
import { supabaseAdmin } from '../supabaseAdmin'
import sharp from 'sharp'
import { rehostToStorage } from '../ig/rehost'
import { extractBrandColor } from './logoColor'
import { derivePaletteFromBrand } from './derive'
import { generateThemeTokens, type ThemeImage } from './gemini'
import { persistTheme } from './persist'

export interface ManualLogo {
  buf: Buffer
  storagePath: string
  publicUrl: string
}

interface ResolvedLogo {
  buf: Buffer
  source: ThemeLogo['source']
  originalPath: string | null
  publicUrl: string | null
}

// The logo is the ONLY image fed to the theme model — convert the raw buffer into a
// Gemini image part, detecting its true format (png logos are common).
async function bufferToThemeImage(buf: Buffer): Promise<ThemeImage | null> {
  try {
    const fmt = (await sharp(buf).metadata()).format
    const mimeType =
      fmt === 'png' ? 'image/png' : fmt === 'webp' ? 'image/webp' : fmt === 'gif' ? 'image/gif' : 'image/jpeg'
    return { mimeType, data: buf.toString('base64') }
  } catch {
    return null
  }
}

async function downloadBuffer(admin: SupabaseClient, path: string): Promise<Buffer | null> {
  const { data, error } = await admin.storage.from('store-media').download(path)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

// Resolve the store's logo image. Precedence: an explicit manual upload, then a
// previously-uploaded manual logo carried on the active theme, then the IG profile
// picture (re-hosted, since CDN URLs expire). Null when no logo source exists.
async function resolveLogo(
  event: H3Event,
  storeId: string,
  activeThemeId: string | null,
  manual?: ManualLogo,
): Promise<ResolvedLogo | null> {
  const admin = supabaseAdmin(event)
  if (manual) {
    return { buf: manual.buf, source: 'manual', originalPath: manual.storagePath, publicUrl: manual.publicUrl }
  }

  if (activeThemeId) {
    const { data: t } = await admin.from('themes').select('logo').eq('id', activeThemeId).maybeSingle()
    const logo = (t as { logo?: ThemeLogo } | null)?.logo
    if (logo?.source === 'manual' && logo.originalPath) {
      const buf = await downloadBuffer(admin, logo.originalPath)
      if (buf) return { buf, source: 'manual', originalPath: logo.originalPath, publicUrl: null }
    }
  }

  const { data: ig } = await admin
    .from('ig_accounts')
    .select('profile_picture_url')
    .eq('store_id', storeId)
    .maybeSingle()
  const igUrl = (ig as { profile_picture_url?: string | null } | null)?.profile_picture_url
  if (igUrl) {
    const rehosted = await rehostToStorage(admin, `${storeId}/theme/logo`, igUrl)
    if (rehosted) {
      await admin
        .from('ig_accounts')
        .update({ profile_picture_storage_path: rehosted.storagePath })
        .eq('store_id', storeId)
      const buf = await downloadBuffer(admin, rehosted.storagePath)
      if (buf) return { buf, source: 'profile_picture', originalPath: rehosted.storagePath, publicUrl: rehosted.publicUrl }
    }
  }
  return null
}

function mergePalette(raw: unknown, palette: Partial<DesignTokens['palette']> | null): unknown {
  if (!palette) return raw
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const basePalette = base.palette && typeof base.palette === 'object' ? (base.palette as Record<string, unknown>) : {}
  return { ...base, palette: { ...basePalette, ...palette } }
}

// Aggregate the per-post mood words the importer already stored
// (ig_analysis.mood_keywords) into a frequency-ranked hint list for the art-direction
// model. These were computed at import time and, until now, discarded by theming —
// generateThemeTokens has always accepted moodHints; nothing ever passed them.
async function aggregateMoodHints(admin: SupabaseClient, storeId: string, max = 12): Promise<string[]> {
  const { data } = await admin.from('ig_analysis').select('mood_keywords').eq('store_id', storeId)
  const counts = new Map<string, number>()
  for (const row of (data ?? []) as Array<{ mood_keywords?: string[] | null }>) {
    for (const raw of row.mood_keywords ?? []) {
      const k = (raw || '').trim().toLowerCase()
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([k]) => k)
}

// Lifestyle/branding posts read the shop's vibe best; product shots add catalog feel.
const ROLE_PRIORITY: Record<string, number> = {
  hero_candidate: 0, lifestyle: 1, branding: 2, announcement: 3, other: 4, logo_candidate: 5,
}

// A small set of representative post images so the art-direction model reads the shop's
// actual photographic identity — not just its logo. All are our own Storage objects
// (downloaded via the admin client; no external fetch, no SSRF surface). Branding shots
// come first (role-prioritized); product photography tops up when branding is thin.
// Bounded so token cost/latency of the single Pro call stays sane.
async function gatherIdentityImages(admin: SupabaseClient, storeId: string, max = 5): Promise<ThemeImage[]> {
  const paths: string[] = []

  const { data: branding } = await admin
    .from('branding_assets')
    .select('storage_path, role')
    .eq('store_id', storeId)
    .not('storage_path', 'is', null)
  const brandingRows = ((branding ?? []) as Array<{ storage_path: string; role: string }>).sort(
    (a, b) => (ROLE_PRIORITY[a.role] ?? 9) - (ROLE_PRIORITY[b.role] ?? 9),
  )
  for (const r of brandingRows) paths.push(r.storage_path)

  if (paths.length < max) {
    const { data: prod } = await admin
      .from('product_images')
      .select('storage_path')
      .eq('store_id', storeId)
      .eq('is_video', false)
      .order('position', { ascending: true })
      .limit(max)
    for (const r of (prod ?? []) as Array<{ storage_path: string }>) paths.push(r.storage_path)
  }

  const out: ThemeImage[] = []
  for (const path of paths.slice(0, max)) {
    const buf = await downloadBuffer(admin, path)
    if (!buf) continue
    const img = await bufferToThemeImage(buf)
    if (img) out.push(img)
  }
  return out
}

// Build + persist a new theme version: logo-derived accessible palette + Gemini-
// chosen fonts/mood/style. The derived palette overrides whatever palette Gemini
// returns. Everything is validated/clamped by persistTheme (H6).
export async function buildAndPersistTheme(event: H3Event, storeId: string, manual?: ManualLogo) {
  const admin = supabaseAdmin(event)
  const { data: store } = await admin.from('stores').select('name, active_theme_id').eq('id', storeId).maybeSingle()
  const storeName = (store as { name?: string } | null)?.name ?? 'Shop'
  const activeThemeId = (store as { active_theme_id?: string | null } | null)?.active_theme_id ?? null

  // 1. logo → brand color → accessible derived palette
  const logo = await resolveLogo(event, storeId, activeThemeId, manual)
  let derivedPalette: Partial<DesignTokens['palette']> | null = null
  let bgIsTransparent = false
  if (logo) {
    const brand = await extractBrandColor(logo.buf)
    if (brand) {
      bgIsTransparent = brand.bgIsTransparent
      derivedPalette = derivePaletteFromBrand(brand, { bgIsTransparent })
    }
  }

  // 2. logo + a few representative post images + aggregated post mood words → the
  //    art-direction model (palette accents, fonts, mood, style, AND structure). The
  //    shop's own photography & vibe now shape the look — not just the logo. The
  //    derived palette (step 1) still overrides whatever palette the model returns.
  const images: ThemeImage[] = []
  if (logo) {
    const logoImg = await bufferToThemeImage(logo.buf)
    if (logoImg) images.push(logoImg)
  }
  const postImages = await gatherIdentityImages(admin, storeId)
  images.push(...postImages)
  const moodHints = await aggregateMoodHints(admin, storeId)
  const raw = await generateThemeTokens({ storeName, images, moodHints })

  // The model's one-sentence justification for the chosen art direction (display-only).
  const rationale =
    typeof (raw as { rationale?: unknown } | null)?.rationale === 'string'
      ? (raw as { rationale: string }).rationale.trim().slice(0, 280) || null
      : null

  // 3. merge derived palette over Gemini output; if neither exists → fallback theme
  const merged = derivedPalette || raw ? mergePalette(raw, derivedPalette) : null
  const cfg = useRuntimeConfig()
  const themeLogo: ThemeLogo | null = logo
    ? {
        source: logo.source,
        originalPath: logo.originalPath,
        processedPath: logo.originalPath,
        faviconPath: null,
        bgIsTransparent,
      }
    : null

  const theme = await persistTheme(
    event,
    storeId,
    merged,
    {
      model: raw ? cfg.geminiThemeModel || cfg.geminiModel || 'gemini-2.5-flash' : null,
      fallbackUsed: merged === null,
      sourceImageCount: images.length,
      source: 'generate',
      artDirectionRationale: rationale,
    },
    { logo: themeLogo },
  )

  return {
    theme,
    fallbackUsed: merged === null,
    sourceImageCount: images.length,
    postImageCount: postImages.length,
    moodHintCount: moodHints.length,
    logoSource: logo?.source ?? null,
    colorFromLogo: !!derivedPalette,
  }
}

// True once the store has a real brand theme — one derived from a logo, or one the
// seller hand-edited. Used to gate auto-generation so it only ever runs while the
// store is still on the default/fallback theme (never clobbers a customization).
export async function hasBrandedTheme(event: H3Event, storeId: string): Promise<boolean> {
  const admin = supabaseAdmin(event)
  const { data } = await admin.from('themes').select('logo, meta').eq('store_id', storeId)
  for (const t of (data ?? []) as Array<{ logo?: ThemeLogo | null; meta?: { source?: string } | null }>) {
    if (t.logo?.source) return true
    if (t.meta?.source === 'manual-edit') return true
  }
  return false
}

// Best-effort theme generation triggered on first Instagram connect: derive the
// palette from the freshly-saved profile picture (the company logo) so the seller
// lands on an on-brand store with zero clicks. No-ops if a brand theme already
// exists; never throws (a theming failure must not break the OAuth connect).
// Returns true only when a new theme was generated.
export async function maybeAutoGenerateTheme(event: H3Event, storeId: string): Promise<boolean> {
  try {
    if (await hasBrandedTheme(event, storeId)) return false
    await buildAndPersistTheme(event, storeId)
    return true
  } catch (e) {
    console.error('[theme] auto-generate on connect failed', (e as Error)?.message)
    return false
  }
}
