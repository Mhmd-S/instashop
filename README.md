# Insteshop

Turn an Instagram page into a hosted e-commerce storefront. A seller connects their
Instagram, we import their posts as products and auto-derive the store's visual "vibe"
from their posts; customers browse and buy; the seller manages products and orders.

**Multi-tenant SaaS** on one Nuxt 4 + Nitro deployment, three surfaces by Host header:

| Surface | Host (prod) | Host (local) |
|---|---|---|
| Marketing / apex | `insteshop.app` | `lvh.me:3000` |
| Admin dashboard | `app.insteshop.app` | `app.lvh.me:3000` |
| Storefront (per store) | `<store>.insteshop.app` | `<store>.lvh.me:3000` |

> `lvh.me` and `*.lvh.me` resolve to `127.0.0.1`, so subdomains work locally with no
> `/etc/hosts` edits.

The full, security-reviewed design is in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**
(data model + RLS, tenant resolution, Instagram OAuth, theming pipeline, checkout/orders,
roadmap). Reviews: [docs/reviews/](docs/reviews/).

## Stack

Nuxt 4 · Nitro · TypeScript · Tailwind v4 (CSS-variable theming) · Pinia ·
Supabase (Postgres + Auth + Storage + RLS) · `@anthropic-ai/sdk` (Claude vision for
theming) · Stripe (later) · Resend (email).

## Prerequisites

- Node (see `.nvmrc`; target **22**). Works on Node 20 via a `ws` WebSocket polyfill.
- pnpm
- Docker Desktop **running** (for local Supabase)

## Setup

```bash
pnpm install
cp .env.example .env            # local defaults already point at the local Supabase

pnpm db:start                   # start local Supabase (first run pulls Docker images)
pnpm db:reset                   # apply supabase/migrations + seed
pnpm db:types                   # generate shared/types/database.types.ts from the schema

pnpm dev                        # http://lvh.me:3000  (binds 0.0.0.0:3000)
```

Then open:
- `http://lvh.me:3000` — marketing
- `http://app.lvh.me:3000` — admin shell
- `http://acme.lvh.me:3000` — the seeded demo store (`Acme Goods`)

Seed dev logins (M1+): `seller@acme.test` / `admin@insteshop.test`, password `password123`.

## Scripts

| Script | Does |
|---|---|
| `pnpm dev` | Nuxt dev server (0.0.0.0:3000) |
| `pnpm db:start` / `db:stop` | Local Supabase stack up / down |
| `pnpm db:reset` | Re-apply migrations + seed |
| `pnpm db:types` | Regenerate DB types |
| `pnpm typecheck` | `vue-tsc --noEmit` |
| `pnpm lint` | ESLint |

## Project layout

```
app/                     root shell: surface dispatcher, error page, theme + tenant plugins
server/
  middleware/00.tenant.ts   Host → surface/store (H1-hardened: X-Forwarded-Host ignored)
  utils/                    parseHost, supabaseAdmin, tenantScoped (service-role choke-point)
  api/tenant/current        resolved tenant for the current host
layers/{base,marketing,admin,storefront}   per-surface UI
shared/
  tenancy/reserved.ts       reserved subdomains (mirrors DB)
  types/                     tenant, theme, orders, database.types (generated)
  theme/cssVars.ts           DesignTokens → CSS variables
supabase/migrations/0000_init.sql   schema + RLS + RPCs
supabase/seed.sql                   demo store/products/theme
docs/                     ARCHITECTURE.md + reviews
```

## Status

- **M0 — foundation ✅** scaffold, local Supabase schema (full DDL + RLS + secure RPCs),
  subdomain tenant resolution, per-tenant theme injection, three rendering surfaces.
- **M1 — auth + admin shell ✅** Supabase email/password auth on `app.*`, access-token hook
  (`global_role` claim, H9), admin layout + login/signup/onboarding/dashboard, global
  surface guard, service-role store creation (H10). Security-reviewed.
- **M2 — products + storefront browse ✅** admin product CRUD + image upload (store-media
  bucket), storefront catalog + product detail via anon+RLS. Draft products invisible to
  the public; cross-tenant/role writes denied.
- **M3 — cart + manual checkout + orders ✅** `useState` cart (persisted per subdomain),
  guest COD checkout via the `place_order` RPC (server-reprices, idempotent, token read-back),
  admin order list/detail + status state machine + COD mark-paid. Security-reviewed.
- **M5 — theming pipeline (Gemini) ✅** per-store theme rendered SSR with no FOUC; admin
  "generate from photos" via **Gemini** (`gemini-2.5-flash`, structured JSON output),
  validated/clamped to an accessible, allowlisted theme with a safe fallback.
  **Enhanced (migration 0008):** the theme is now **derived entirely from the logo** — `sharp`
  (deterministic — a logo on white yields its ink color) extracts the dominant brand color into a
  WCAG-accessible palette, and Gemini picks fonts/mood from the **logo image alone** (no product or
  other posts feed the look). Logo source = IG profile picture or manual upload. The theme is
  **auto-generated on first Instagram connect** (straight from the profile picture) and the profile
  picture is **refreshed on every sync**, so a logo change on Instagram flows through to the next
  regenerate. Full **manual theme editor** (color pickers + fonts/radius/mood) via a `PUT` that routes
  through the same validate/persist choke-point.

- **M4 — Instagram import ✅ (code-complete)** OAuth (Instagram Login) + token-at-rest in Vault +
  admin connect/import UI + the full Meta compliance/lifecycle layer (signed deauthorize +
  data-deletion, webhook verification, daily token-refresh cron, Vault cleanup, SSRF-guarded re-host).
  **AI import redesign (migrations 0009–0010):** posts are analyzed per-post by Gemini (cached in
  `ig_analysis`), **same-product posts auto-merged into one product with multiple images**
  (`product_images` + `product_ig_posts`, carousel children included), **multi-category** suggestions
  (`categories`/`product_categories`), and non-product posts captured as **branding assets** (feed the
  theme + an optional storefront hero). Idempotent re-sync; never overwrites seller-edited
  (`locked_by_seller`) products; degrades to a per-post heuristic without a Gemini key.
  **Generation refinement (migrations 0011–0012):** analysis is now **one cheap text-only batched
  Gemini call** (captions carry the product facts) that classifies + writes copy + groups same-item
  posts via a stable `product_key` — ~10× cheaper than the old per-post multimodal calls and more
  reliable (multimodal batching made the model dismiss all but the first post). Descriptions are
  **clean merchandised copy** re-scrubbed through a deterministic `cleanCaption` (strips
  hashtags/emoji/CTAs/prices/contact). Images: near-duplicate photos across merged posts are dropped
  (perceptual `aHash`), a hero is chosen and mirrored to `products.image_url`, and alt text is written.
  Verified live: correct merge/split, grounded descriptions, multi-category, idempotent. See
  [docs/M0-NOTES.md](docs/M0-NOTES.md).
  **Testing without a live account:** in dev, the Instagram admin page has a **"Load a test shop"**
  panel (4 curated mock shops) that runs the *real* analyze→cluster→materialize pipeline against fixture
  data — no Instagram connection needed (`POST /api/admin/stores/[storeId]/ig/seed-fixture`, disabled in
  production). For a real account, the fastest path is a throwaway IG **Creator** account added as an
  Instagram Tester (no App Review needed in Development mode) — see docs/M0-NOTES.md.
  **Remaining is Meta-side only:** register the 4 callback URLs, add an Instagram tester, and submit
  for App Review (needs a live Professional account + public HTTPS host).

  | Meta callback | Route |
  |---|---|
  | OAuth redirect | `/api/ig/callback` |
  | Deauthorize | `/api/ig/deauthorize` |
  | Data deletion | `/api/ig/data-deletion` |
  | Webhooks (+ verify token) | `/api/ig/webhook` |

Next: submit M4 for Meta App Review, then M6 Stripe, M7 deploy.
Roadmap: [docs/ARCHITECTURE.md §10](docs/ARCHITECTURE.md); build notes: [docs/M0-NOTES.md](docs/M0-NOTES.md).

Seed logins (dev): `seller@acme.test` / `admin@insteshop.test`, password `password123`
(note the **`.test`** domain). UI is built on **Nuxt UI v4**.

## Resuming a dev session

1. `nvm use` (Node **22** — required for lint + Supabase realtime; `.nvmrc` pins it)
2. `pnpm db:start` (Docker must be running) — local Supabase
3. `pnpm dev` → open `http://app.lvh.me:3000` (admin) / `http://acme.lvh.me:3000` (storefront)
4. **Instagram testing only:** start a tunnel and **re-register its redirect URI in Meta** (the
   `trycloudflare.com` URL is ephemeral and changes every run):
   ```
   cloudflared tunnel --url http://127.0.0.1:3000 --http-host-header localhost:3000
   ```
   then set `NUXT_IG_REDIRECT_URI=https://<new-tunnel>/api/ig/callback` in `.env`, restart `pnpm dev`,
   and add `https://<new-tunnel>/api/ig/callback` to the Meta app's Instagram business-login OAuth redirect URIs.

Build/debug notes + gotchas: [docs/M0-NOTES.md](docs/M0-NOTES.md).
