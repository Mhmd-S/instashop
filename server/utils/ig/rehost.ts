import type { SupabaseClient } from '@supabase/supabase-js'

// IG/FB media (and profile pictures) are only ever served from these CDNs.
// Restricting re-host fetches to this allowlist (+ no redirects) is the H7 SSRF
// guard: a tampered URL can't point us at an internal address, and a redirect
// can't bounce us there either.
const IG_CDN_SUFFIXES = ['.cdninstagram.com', '.fbcdn.net']
const MAX_BYTES = 15 * 1024 * 1024
const FETCH_TIMEOUT_MS = 15_000

// Dev-only: lets the local fixture importer re-host real stock photos so the AI
// pipeline can be exercised without a live Instagram connection. Empty in
// production, so the SSRF allowlist is unchanged where it matters. These hosts are
// still constrained by https-only + redirect:'error' + the size/time caps below.
const DEV_EXTRA_HOSTS = process.env.NODE_ENV !== 'production' ? ['images.unsplash.com'] : []

export function isAllowedCdn(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return false
    if (IG_CDN_SUFFIXES.some((s) => u.hostname === s.slice(1) || u.hostname.endsWith(s))) return true
    return DEV_EXTRA_HOSTS.includes(u.hostname)
  } catch {
    return false
  }
}

// Fetch an IG/FB CDN image and return its bytes + content type. SSRF-guarded by
// the CDN allowlist + https-only + redirect:'error' + size/time caps. Returns
// null on any failure (caller treats as "no image").
export async function fetchCdnImage(url: string): Promise<{ buf: Buffer; type: string } | null> {
  try {
    if (!isAllowedCdn(url)) return null
    const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) return null
    const type = res.headers.get('content-type') || 'image/jpeg'
    if (!type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > MAX_BYTES) return null
    return { buf, type }
  } catch {
    return null
  }
}

export interface RehostResult {
  publicUrl: string
  storagePath: string
  contentType: string
}

// Upload already-fetched image bytes into the public store-media bucket. Lets a
// caller that already has the buffer (e.g. after hashing it) avoid a second CDN
// fetch. Reuses the same size guard and deterministic extension/path scheme.
export async function rehostBuffer(
  admin: SupabaseClient,
  pathNoExt: string,
  img: { buf: Buffer; type: string },
): Promise<RehostResult | null> {
  if (img.buf.length > MAX_BYTES) return null
  const sub = (img.type.split('/')[1] || 'jpg').toLowerCase()
  const ext = ({ jpeg: 'jpg', 'x-jpeg': 'jpg', 'svg+xml': 'svg' } as Record<string, string>)[sub] ?? (/^[a-z0-9]+$/.test(sub) ? sub : 'jpg')
  const storagePath = `${pathNoExt}.${ext}`
  const { error } = await admin.storage
    .from('store-media')
    .upload(storagePath, img.buf, { contentType: img.type, upsert: true })
  if (error) return null
  const publicUrl = admin.storage.from('store-media').getPublicUrl(storagePath).data.publicUrl
  return { publicUrl, storagePath, contentType: img.type }
}

// Re-host an IG CDN image (URLs expire) into the public store-media bucket.
// `pathNoExt` is the object path WITHOUT extension (extension is derived from the
// content-type). Returns the public URL + storage path, or null on any failure.
export async function rehostToStorage(
  admin: SupabaseClient,
  pathNoExt: string,
  url: string,
): Promise<RehostResult | null> {
  const img = await fetchCdnImage(url)
  if (!img) return null
  return rehostBuffer(admin, pathNoExt, img)
}
