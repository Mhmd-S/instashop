// https://nuxt.com/docs/api/configuration/nuxt-config
import { existsSync, readdirSync, cpSync } from 'node:fs'
import { join } from 'node:path'

// --- sharp / libvips runtime fix -------------------------------------------
// sharp 0.35 splits its native addon (@img/sharp-<plat>, the `sharp.node`) from
// its libvips runtime (@img/sharp-libvips-<plat>, which ships libvips-cpp.so).
// The addon links the .so at the *ELF* level (a DT_NEEDED entry) and never
// `require()`s the libvips package in JS — so Nitro's dependency tracer
// (@vercel/nft, JS-only) bundles the addon but DROPS the .so. Production then
// dies with `ERR_DLOPEN_FAILED: libvips-cpp.so... cannot open shared object
// file` (lovell/sharp#4543). Under pnpm the libvips package isn't hoisted to a
// resolvable location either, so `nitro.externals.traceInclude` can't reach it
// and nft's `module.exports = __dirname` heuristic doesn't emit the .so anyway.
//
// Fix: after the build, find whichever @img/sharp-libvips-* the install
// produced (pnpm only installs the one matching the build platform — glibc x64
// on Railway) and copy it into the server bundle next to the addon nft kept.
function findInstalledLibvips(): Array<{ name: string; src: string }> {
  const nm = join(process.cwd(), 'node_modules')
  const found: Array<{ name: string; src: string }> = []
  const seen = new Set<string>()
  const add = (name: string, src: string) => {
    if (!seen.has(name) && existsSync(src)) { seen.add(name); found.push({ name, src }) }
  }
  // npm / hoisted layout: node_modules/@img/sharp-libvips-<plat>
  const hoisted = join(nm, '@img')
  if (existsSync(hoisted)) {
    for (const d of readdirSync(hoisted)) {
      if (d.startsWith('sharp-libvips-')) add(`@img/${d}`, join(hoisted, d))
    }
  }
  // pnpm isolated layout: node_modules/.pnpm/@img+sharp-libvips-<plat>@x/node_modules/@img/sharp-libvips-<plat>
  const pnpmDir = join(nm, '.pnpm')
  if (existsSync(pnpmDir)) {
    for (const e of readdirSync(pnpmDir)) {
      if (!e.startsWith('@img+sharp-libvips-')) continue
      const name = e.slice('@img+'.length).split('@')[0] // sharp-libvips-linux-x64
      add(`@img/${name}`, join(pnpmDir, e, 'node_modules', '@img', name))
    }
  }
  return found
}

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
    hooks: {
      // Runs after .output/server/node_modules is fully traced. Copy in the
      // libvips package nft can't see (see findInstalledLibvips above).
      compiled(nitro) {
        const libs = findInstalledLibvips()
        if (libs.length === 0) {
          nitro.logger.warn('[sharp] no @img/sharp-libvips-* found in node_modules — sharp (og-image) will fail at runtime')
          return
        }
        for (const { name, src } of libs) {
          const dest = join(nitro.options.output.serverDir, 'node_modules', name)
          cpSync(src, dest, { recursive: true, dereference: true })
          nitro.logger.success(`[sharp] bundled ${name} into server output`)
        }
      },
    },
  },

  typescript: { typeCheck: false }, // vue-tsc runs in CI via `pnpm typecheck`
})
