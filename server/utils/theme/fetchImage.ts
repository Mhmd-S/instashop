// Fetch an image as base64 for the vision model. Anti-SSRF: only our own Supabase
// Storage public URLs are allowed (H7). Size + content-type guarded.
export async function fetchImageBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  const cfg = useRuntimeConfig()
  const base = cfg.public.supabaseUrl
  if (!base || !url.startsWith(base)) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const type = res.headers.get('content-type') || ''
    if (!type.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length > 6 * 1024 * 1024) return null
    return { mimeType: type, data: buf.toString('base64') }
  } catch {
    return null
  }
}
