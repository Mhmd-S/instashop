// Parse + validate a public Instagram permalink (post / reel / IGTV) without any
// API call. Used by the manual "add from a link" import: the URL is kept only as
// provenance (we never fetch media from it — the seller supplies their own photo),
// so this just has to recognise a genuine IG post link and normalise it.

export type IgUrlKind = 'post' | 'reel' | 'tv'

export interface ParsedIgUrl {
  shortcode: string // the post's short code, e.g. "C1a2B3c4D5e"
  kind: IgUrlKind
  permalink: string // canonical https://www.instagram.com/<seg>/<shortcode>/
}

// Hosts Instagram serves post permalinks from (incl. the legacy short domain).
const HOSTS = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com', 'instagr.am'])
// Path segment that introduces a shortcode → the kind it denotes. "reels" (plural)
// is an alias Instagram uses interchangeably with "reel".
const KIND_BY_SEGMENT: Record<string, IgUrlKind> = { p: 'post', reel: 'reel', reels: 'reel', tv: 'tv' }
const SEGMENT_BY_KIND: Record<IgUrlKind, string> = { post: 'p', reel: 'reel', tv: 'tv' }
// IG shortcodes are URL-safe base64-ish; don't pin a length (it has grown over time).
const SHORTCODE_RE = /^[A-Za-z0-9_-]{1,64}$/

// Returns the parsed/normalised link, or null when the input is not a recognisable
// Instagram post/reel/tv URL. Tolerant of a missing scheme, a username-scoped path
// (instagram.com/<user>/p/<code>), trailing slashes, and query/hash noise.
export function parseIgUrl(input: string): ParsedIgUrl | null {
  const raw = (input ?? '').trim()
  if (!raw) return null

  let u: URL
  try {
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  if (!HOSTS.has(u.hostname.toLowerCase())) return null

  const segments = u.pathname.split('/').filter(Boolean)
  // Find the "/p|reel|reels|tv/<shortcode>" pair anywhere in the path so both
  // canonical (/p/<code>) and username-scoped (/<user>/p/<code>) links resolve.
  for (let i = 0; i < segments.length - 1; i++) {
    const kind = KIND_BY_SEGMENT[segments[i]!.toLowerCase()]
    if (!kind) continue
    const shortcode = segments[i + 1]!
    if (!SHORTCODE_RE.test(shortcode)) return null
    return { shortcode, kind, permalink: `https://www.instagram.com/${SEGMENT_BY_KIND[kind]}/${shortcode}/` }
  }
  return null
}
