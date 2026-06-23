import { randomBytes } from 'node:crypto'
import { requireStoreAccess } from '~~/server/utils/auth'
import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { buildAuthorizeUrl } from '~~/server/utils/ig/client'
import { safeReturnPath } from '~~/shared/utils/safeReturn'

// Start the Instagram OAuth flow for a store. Called as a full-page navigation from
// the admin host (so the seller session cookie + requireStoreAccess apply here).
export default defineEventHandler(async (event) => {
  const storeId = String(getQuery(event).storeId ?? '')
  if (!storeId) throw createError({ statusCode: 400, statusMessage: 'Missing storeId' })
  const { user } = await requireStoreAccess(event, storeId, 'admin')

  const cfg = useRuntimeConfig()
  if (!cfg.igAppId || !cfg.igRedirectUri) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Instagram is not configured (set NUXT_IG_APP_ID + NUXT_IG_REDIRECT_URI)',
    })
  }

  // Where to land after OAuth completes (the onboarding wizard step). Validated to
  // a local path. Persisted on the state row so it survives a cross-origin callback
  // (tunnel/prod), and ALSO dropped in a best-effort same-origin cookie below.
  const returnTo = safeReturnPath(getQuery(event).return)

  const nonce = randomBytes(20).toString('hex')
  const admin = supabaseAdmin(event)
  const { error } = await admin
    .from('ig_oauth_states')
    .insert({ nonce, store_id: storeId, user_id: user.id, return_to: returnTo })
  if (error) {
    console.error('[ig] state insert', error)
    throw createError({ statusCode: 500, statusMessage: 'Could not start Instagram connect' })
  }

  // Best-effort CSRF cookie — only present if the callback lands on the same origin
  // (prod). In tunnelled dev the single-use DB nonce is the primary protection.
  setCookie(event, 'ig_state', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
  })

  // Same-origin fast path for the return target (mirrors ig_state). The state row
  // above is the cross-origin-safe carrier; this cookie just avoids a DB read when
  // the callback happens to land on the same origin.
  if (returnTo) {
    setCookie(event, 'ig_return', returnTo, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600,
      path: '/',
    })
  } else {
    // Clear any stale return from an abandoned wizard connect.
    deleteCookie(event, 'ig_return', { path: '/' })
  }

  return sendRedirect(event, buildAuthorizeUrl({ appId: cfg.igAppId, redirectUri: cfg.igRedirectUri, state: nonce }))
})
