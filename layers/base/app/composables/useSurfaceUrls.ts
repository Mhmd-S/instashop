// Build absolute cross-surface URLs (surfaces live on different hosts, so links
// between them can't be relative).
export function useSurfaceUrls() {
  const base = useRuntimeConfig().public.appBaseDomain
  const isLocal =
    base.includes('lvh.me') || base.startsWith('localhost') || base.startsWith('127.')
  const proto = isLocal ? 'http' : 'https'
  return {
    apex: `${proto}://${base}`,
    adminUrl: (path = '/') => `${proto}://app.${base}${path}`,
    storeUrl: (sub: string, path = '/') => `${proto}://${sub}.${base}${path}`,
  }
}
