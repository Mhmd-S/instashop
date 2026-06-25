// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-06-01',
  future: { compatibilityVersion: 4 },
  devtools: { enabled: true },

  // Per-surface code lives in layers (see docs/ARCHITECTURE.md §8).
  extends: [
    './layers/base',
    './layers/marketing',
    './layers/admin',
    './layers/storefront',
  ],

  modules: ['@nuxtjs/supabase', '@nuxt/ui', '@nuxt/eslint'],

  // Global head defaults. Per-page SEO (title/description/OG) is set with
  // useSeoMeta (see the marketing landing); this just provides lang, favicons and a
  // sensible fallback title for surfaces that don't set their own.
  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Vendly',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', sizes: '32x32', href: '/favicon.ico' },
      ],
      meta: [
        { name: 'theme-color', content: '#4f46e5' },
      ],
    },
  },

  css: ['~/assets/css/main.css'],

  // Enforce light mode app-wide: disabling Nuxt UI's color-mode integration
  // stops the `.dark` class from ever being applied. The app has no color-mode
  // toggle and no `dark:` variants, so nothing depends on it.
  ui: {
    colorMode: false,
  },

  vite: {
    // dev only: allow any Host (we run behind a cloudflared tunnel for IG OAuth)
    server: { allowedHosts: true },
  },

  devServer: { host: '0.0.0.0', port: 3000 },

  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_KEY,
    serviceKey: process.env.NUXT_SUPABASE_SECRET_KEY,
    // We resolve auth/redirects ourselves (admin host only); don't let the module redirect.
    redirect: false,
    types: '~~/shared/types/database.types.ts',
    // H8: seller/admin cookie is HOST-scoped to app.* — never Domain=.insteshop.app
    cookieName: 'sb',
    cookieOptions: {
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 8,
    },
  },

  runtimeConfig: {
    // server-only secrets (override via NUXT_* env)
    supabaseSecretKey: '',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash', // per-post import classification (cheap, batched)
    geminiThemeModel: 'gemini-2.5-pro', // once-per-store art-direction call (thinking)
    igAppId: '',
    igAppSecret: '',
    igRedirectUri: '',
    igWebhookVerifyToken: '',
    igGraphVersion: 'v23.0',
    cronSecret: '', // guards /api/ig/cron/* (Vercel Cron sends it as a Bearer token)
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    resendApiKey: '',
    resendFrom: '',
    public: {
      supabaseUrl: '',
      // overridden in dev by NUXT_PUBLIC_APP_BASE_DOMAIN=lvh.me:3000
      appBaseDomain: 'insteshop.app',
      siteUrl: 'https://insteshop.app',
      stripePublishableKey: '', // pk_… — the platform key (Connect destination charges)
    },
  },

  nitro: {
    // dev/build auto-detect; set NITRO_PRESET=vercel for production (Node functions).
    preset: process.env.NITRO_PRESET || undefined,
    routeRules: { '/api/**': { cors: false } },
  },

  typescript: { typeCheck: false }, // vue-tsc runs in CI via `pnpm typecheck`
})
