import { supabaseAdmin } from '~~/server/utils/supabaseAdmin'
import { exchangeCode, getLongLivedToken, getProfile } from '~~/server/utils/ig/client'
import { storeIgToken } from '~~/server/utils/ig/token'
import { maybeAutoGenerateTheme } from '~~/server/utils/theme/build'
import { safeReturnPath } from '~~/shared/utils/safeReturn'

// The registered OAuth redirect URI. Runs on the public (tunnel/prod) host, where
// the admin cookie may be absent — so trust is anchored on the single-use, expiring
// ig_oauth_states nonce (bound to store_id + user_id). Cookie check is best-effort.
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const cfg = useRuntimeConfig()

  const base = cfg.public.appBaseDomain
  const proto = base.includes('lvh.me') || base.startsWith('localhost') || base.startsWith('127.') ? 'http' : 'https'
  const adminUrl = (path: string) => `${proto}://app.${base}${path}`

  if (q.error) {
    return sendRedirect(event, adminUrl(`/dashboard?ig_error=${encodeURIComponent(String(q.error_description || q.error))}`))
  }
  const code = String(q.code ?? '')
  const state = String(q.state ?? '')
  if (!code || !state) throw createError({ statusCode: 400, statusMessage: 'Missing code/state' })

  const admin = supabaseAdmin(event)
  const { data: stRow } = await admin.from('ig_oauth_states').select('*').eq('nonce', state).maybeSingle()
  const st = stRow as
    | { store_id: string; user_id: string; used_at: string | null; expires_at: string; return_to: string | null }
    | null
  if (!st) throw createError({ statusCode: 403, statusMessage: 'Invalid state' })
  if (st.used_at || new Date(st.expires_at) < new Date()) {
    throw createError({ statusCode: 403, statusMessage: 'Expired or used state' })
  }
  const cookieNonce = getCookie(event, 'ig_state')
  if (cookieNonce && cookieNonce !== state) throw createError({ statusCode: 403, statusMessage: 'State mismatch' })

  // single-use
  await admin.from('ig_oauth_states').update({ used_at: new Date().toISOString() }).eq('nonce', state)

  // On any failure, surface ig_error to the seller (instead of falsely reporting
  // success). If the connect started in the onboarding wizard, return *there* with
  // the error shown inline — bouncing them to the standalone settings page mid-flow
  // is jarring and re-renders the wizard's own stepper. Otherwise fall back to the
  // IG settings page, which also renders ig_error.
  const retPath = safeReturnPath(st.return_to)
  const errTo = (code: string) =>
    retPath
      ? adminUrl(`${retPath}${retPath.includes('?') ? '&' : '?'}ig_error=${code}`)
      : adminUrl(`/stores/${st.store_id}/instagram?ig_error=${code}`)

  const short = await exchangeCode({
    appId: cfg.igAppId,
    appSecret: cfg.igAppSecret,
    redirectUri: cfg.igRedirectUri,
    code,
  })
  if (!short) return sendRedirect(event, errTo('token_exchange'))

  const long = await getLongLivedToken({ appSecret: cfg.igAppSecret, shortToken: short.accessToken })
  const token = long?.accessToken ?? short.accessToken
  const expiresIn = long?.expiresIn ?? 3600
  const profile = await getProfile(token)
  const igUserId = profile?.id ?? short.userId

  // One Instagram account maps to exactly one store (ig_accounts.ig_user_id is
  // unique). If this account is already linked to a *different* store, the upsert
  // below — which only resolves conflicts on store_id — fails the ig_user_id
  // constraint. Detect it up front so we return a clear message instead of the
  // silent failure that otherwise looks like "connect did nothing".
  const { data: clash } = await admin
    .from('ig_accounts')
    .select('store_id')
    .eq('ig_user_id', igUserId)
    .maybeSingle()
  if (clash && (clash as { store_id: string }).store_id !== st.store_id) {
    return sendRedirect(event, errTo('account_in_use'))
  }

  const secretId = await storeIgToken(event, token, `ig_${st.store_id}_${Date.now()}`)

  const { error: upsertError } = await admin.from('ig_accounts').upsert(
    {
      store_id: st.store_id,
      provider: 'instagram',
      ig_user_id: igUserId,
      ig_username: profile?.username ?? null,
      account_type: profile?.account_type ?? null,
      profile_picture_url: profile?.profile_picture_url ?? null,
      media_count: profile?.media_count ?? null,
      access_token_secret_id: secretId,
      scopes: ['instagram_business_basic'],
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      token_refreshed_at: new Date().toISOString(),
      token_status: 'active',
      connected_at: new Date().toISOString(),
      deauthorized_at: null,
    },
    { onConflict: 'store_id' },
  )
  // Without this check a failed write was swallowed and the seller was redirected
  // as if connected — landing back on a wizard that still showed "Connect".
  if (upsertError) {
    console.error('[ig] account upsert failed', upsertError)
    return sendRedirect(event, errTo(upsertError.code === '23505' ? 'account_in_use' : 'save_failed'))
  }

  await admin.from('audit_log').insert({
    store_id: st.store_id,
    actor_id: st.user_id,
    action: 'ig.connect',
    target: profile?.username ?? short.userId,
  })

  // First connect: derive an on-brand theme straight from the profile picture (the
  // logo) so the seller lands on a branded store with no clicks. Guarded + never
  // throws — if a brand theme already exists or theming fails, the connect is fine.
  await maybeAutoGenerateTheme(event, st.store_id)

  // If the connect started from the onboarding wizard, return there. Prefer the
  // path persisted on the state row (survives a cross-origin callback, e.g. the
  // dev tunnel); fall back to the best-effort same-origin cookie. Re-validated as
  // a local path; merge in connected=1.
  const returnTo = safeReturnPath(st.return_to) ?? safeReturnPath(getCookie(event, 'ig_return'))
  deleteCookie(event, 'ig_return', { path: '/' })
  if (returnTo) {
    const dest = `${returnTo}${returnTo.includes('?') ? '&' : '?'}connected=1`
    return sendRedirect(event, adminUrl(dest))
  }

  return sendRedirect(event, adminUrl(`/stores/${st.store_id}/instagram?connected=1`))
})
