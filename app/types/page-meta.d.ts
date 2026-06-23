import 'vue-router'

// Custom page-meta keys used by the surface guard (app/middleware/surface-guard.global.ts).
declare module 'vue-router' {
  interface RouteMeta {
    surface?: 'admin' | 'store' | 'marketing'
    requiresAuth?: boolean
  }
}

export {}
