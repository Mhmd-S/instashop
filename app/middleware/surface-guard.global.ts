// Global guard: enforces which surface (host) a route may be served on, redirects
// the admin root to the dashboard, and gates protected admin pages on a session.
export default defineNuxtRouteMiddleware((to) => {
  const { surface } = useTenant()
  const s = surface.value
  const routeSurface = to.meta.surface

  // A route tagged for one surface must not be served on another host.
  if (routeSurface && routeSurface !== s) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  // Admin host: the bare root goes to the dashboard.
  if (s === 'admin' && to.path === '/') {
    return navigateTo('/dashboard')
  }

  if (routeSurface === 'admin') {
    const user = useSupabaseUser()
    // Already signed in → skip the auth screens.
    if ((to.path === '/login' || to.path === '/signup') && user.value) {
      return navigateTo('/dashboard')
    }
    // Protected pages require a session.
    if (to.meta.requiresAuth && !user.value) {
      return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
    }
  }
})
