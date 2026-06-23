// Instagram API with Instagram Login (graph.instagram.com). App secret is used
// server-side only.

const AUTHORIZE = 'https://www.instagram.com/oauth/authorize'
const TOKEN_SHORT = 'https://api.instagram.com/oauth/access_token'
const GRAPH = 'https://graph.instagram.com'

export const IG_SCOPE = 'instagram_business_basic'

export interface IgChild {
  id: string
  media_type: string
  media_url?: string
  thumbnail_url?: string
}
export interface IgMedia {
  id: string
  caption?: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'
  media_url?: string
  thumbnail_url?: string
  permalink?: string
  timestamp?: string
  children?: { data: IgChild[] }
}

export function buildAuthorizeUrl(opts: { appId: string; redirectUri: string; state: string }): string {
  const q = new URLSearchParams({
    client_id: opts.appId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: IG_SCOPE,
    state: opts.state,
  })
  return `${AUTHORIZE}?${q}`
}

export async function exchangeCode(opts: {
  appId: string
  appSecret: string
  redirectUri: string
  code: string
}): Promise<{ accessToken: string; userId: string } | null> {
  const body = new URLSearchParams({
    client_id: opts.appId,
    client_secret: opts.appSecret,
    grant_type: 'authorization_code',
    redirect_uri: opts.redirectUri,
    code: opts.code,
  })
  const res = await fetch(TOKEN_SHORT, { method: 'POST', body })
  if (!res.ok) {
    console.error('[ig] code exchange failed', res.status, (await res.text()).slice(0, 300))
    return null
  }
  const j = (await res.json()) as { access_token: string; user_id: number | string }
  return { accessToken: j.access_token, userId: String(j.user_id) }
}

export async function getLongLivedToken(opts: {
  appSecret: string
  shortToken: string
}): Promise<{ accessToken: string; expiresIn: number } | null> {
  const q = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: opts.appSecret,
    access_token: opts.shortToken,
  })
  const res = await fetch(`${GRAPH}/access_token?${q}`)
  if (!res.ok) {
    console.error('[ig] long token failed', res.status, (await res.text()).slice(0, 300))
    return null
  }
  const j = (await res.json()) as { access_token: string; expires_in: number }
  return { accessToken: j.access_token, expiresIn: j.expires_in }
}

// Refresh a long-lived token (valid 60d). Works on tokens at least 24h old and
// not yet expired; returns a fresh 60-day token.
export async function refreshLongLivedToken(
  longToken: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const q = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: longToken })
  const res = await fetch(`${GRAPH}/refresh_access_token?${q}`)
  if (!res.ok) {
    console.error('[ig] token refresh failed', res.status, (await res.text()).slice(0, 300))
    return null
  }
  const j = (await res.json()) as { access_token: string; expires_in: number }
  return { accessToken: j.access_token, expiresIn: j.expires_in }
}

export interface IgProfile {
  id: string
  username: string
  account_type?: string
  profile_picture_url?: string
  media_count?: number
}
export async function getProfile(token: string): Promise<IgProfile | null> {
  const q = new URLSearchParams({
    fields: 'id,username,account_type,profile_picture_url,media_count',
    access_token: token,
  })
  const res = await fetch(`${GRAPH}/me?${q}`)
  if (!res.ok) return null
  return (await res.json()) as IgProfile
}

const MEDIA_FIELDS =
  'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{id,media_type,media_url,thumbnail_url}'

export interface GetMediaOpts {
  pageSize?: number // per-page IG `limit` (max ~100)
  maxPages?: number // safety cap on pages followed
  maxItems?: number // total cap on returned media
  stopAtMediaId?: string // incremental sync: stop once we hit an already-imported id
}

// Fetch recent media. Follows `paging.next` cursors up to the configured caps.
// Backward-compatible: getMedia(token, 25) fetches a single page of 25 (the old
// behavior). Pass an options object for paginated/incremental fetches.
export async function getMedia(token: string, opts: GetMediaOpts | number = {}): Promise<IgMedia[]> {
  const o: GetMediaOpts =
    typeof opts === 'number' ? { maxItems: opts, pageSize: opts, maxPages: 1 } : opts
  const pageSize = o.pageSize ?? 50
  const maxPages = o.maxPages ?? 4
  const maxItems = o.maxItems ?? 100

  const out: IgMedia[] = []
  let url: string | null = `${GRAPH}/me/media?${new URLSearchParams({
    fields: MEDIA_FIELDS,
    access_token: token,
    limit: String(pageSize),
  })}`
  let pages = 0

  while (url && pages < maxPages && out.length < maxItems) {
    const res = await fetch(url)
    if (!res.ok) {
      console.error('[ig] media fetch failed', res.status, (await res.text()).slice(0, 300))
      break
    }
    const j = (await res.json()) as { data?: IgMedia[]; paging?: { next?: string } }
    let stop = false
    for (const m of j.data ?? []) {
      if (o.stopAtMediaId && m.id === o.stopAtMediaId) {
        stop = true
        break
      }
      out.push(m)
      if (out.length >= maxItems) break
    }
    url = stop ? null : (j.paging?.next ?? null)
    pages++
  }

  return out.slice(0, maxItems)
}
