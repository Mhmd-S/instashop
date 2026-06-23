import { lookupStoreBySubdomain, parseHost } from '../utils/tenant'
import { getActiveTheme } from '../utils/theme/active'

// Resolves the tenant for every request from the Host header (H1) and attaches
// surface / store / hostInfo to the event context (Blueprint §4).
export default defineEventHandler(async (event) => {
  const p = event.path || ''
  if (p.startsWith('/_') || p.startsWith('/__')) return // build assets / devtools

  const info = parseHost(event)
  event.context.hostInfo = info

  if (info.kind === 'apex') {
    event.context.surface = 'marketing'
    event.context.store = null
    return
  }

  if (info.kind === 'reserved') {
    // Only `app.*` is the admin surface; other reserved labels fall back to marketing.
    event.context.surface = info.subdomain === 'app' ? 'admin' : 'marketing'
    event.context.store = null
    return
  }

  if (info.kind === 'foreign' || !info.subdomain) {
    event.context.surface = 'marketing'
    event.context.store = null
    return
  }

  // kind === 'store'
  event.context.surface = 'store'
  const store = await lookupStoreBySubdomain(event, info.subdomain)
  if (!store || store.status !== 'active') {
    throw createError({
      statusCode: 404,
      statusMessage: 'Store not found',
      data: { code: 'STORE_NOT_FOUND', subdomain: info.subdomain },
    })
  }
  event.context.store = store
  const active = await getActiveTheme(event, store)
  event.context.themeTokens = active?.tokens ?? null
  // The brand logo, ready for the storefront to render (URL + whether it has a
  // transparent background, which decides avatar-style vs. contained rendering).
  event.context.themeLogo = active?.logoUrl
    ? { url: active.logoUrl, transparent: active.logo?.bgIsTransparent ?? false }
    : null
})
