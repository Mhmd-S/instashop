# M0 — implementation notes & deviations from the blueprint

M0 (foundation) is built and verified. These are the places reality differed from
`ARCHITECTURE.md`, discovered by actually running the stack. Carry them forward.

## Runtime: Node 22 required
`.nvmrc` pins **22**; use `nvm use` in this repo. Two things break on Node 20:
- `@supabase/realtime-js` needs a global `WebSocket` (Node 22+ only). Worked around with
  `server/plugins/ws-polyfill.ts` (uses the `ws` package) so the **app** also runs on
  Node 20 — the polyfill is a no-op on 22.
- `eslint` 10 + `@nuxt/eslint` need `Object.groupBy` (Node 21+). No polyfill — **lint
  requires Node 22.** (typecheck + dev + build are fine on 20 via the WS polyfill.)

## Dependency pins
- **`@pinia/nuxt` pinned to exact `0.11.0`** (no caret). 0.11.1+ has a regression under
  Nuxt 4: its `app:rendered` hook reads `nuxtApp.$pinia` which is undefined → SSR 500.
  Ref: https://github.com/vuejs/pinia/discussions/3067
- Added **`ws`** (+ `@types/ws`) purely for the WebSocket polyfill above.

## Database: table GRANTs were missing from the blueprint SQL
The blueprint's RLS section enables RLS + writes policies but never GRANTs table
privileges to `anon`/`authenticated`/`service_role`. RLS filters *rows*; you still need
the table-level grant or every role gets `permission denied` (even service_role, which
broke tenant resolution → every storefront 404'd). Fixed by **section 60 "role grants"**
at the end of `supabase/migrations/0000_init.sql` (+ `ALTER DEFAULT PRIVILEGES` so future
migrations inherit). Service-role-only registries (`reserved_subdomains`, `webhook_events`,
`ig_oauth_states`) are re-revoked from anon/authenticated after the blanket grant.

## Tooling: `supabase gen types --local` is broken in CLI 2.106
It throws `LegacyPlatformAuthRequiredError` even for local. Workaround baked into the
`db:types` script: `SUPABASE_ACCESS_TOKEN=local-dummy ... --db-url postgresql://postgres:postgres@127.0.0.1:54322/postgres`.

## Routing decision (M0)
Surfaces share one page tree via a **root dispatcher** (`app/pages/index.vue`) that renders
`MarketingHome` / `AdminHome` / `StorefrontHome` based on the resolved `surface`. Per-surface
sub-route trees (and any host→path strategy) arrive with real pages in M1–M2. The tenant
middleware throws 404 for unknown/inactive stores; apex/admin never hit the DB.

## Verified at end of M0
- Surfaces: `lvh.me` (marketing) / `app.lvh.me` (admin) / `acme.lvh.me` (store) → 200;
  unknown subdomain → 404.
- **H1**: forged `X-Forwarded-Host` does not change the resolved tenant.
- **RLS isolation** (anon): reads only published products + active stores; orders return `[]`.
- `pnpm typecheck` ✅, `pnpm lint` ✅ (Node 22), dev SSR with 0 errors, theme CSS vars
  injected SSR-side (no FOUC).

---

# M1 — auth + admin shell (notes)

Supabase email/password auth on `app.*`, the H9 access-token hook, admin layout + auth
pages, the global surface guard, and the service-role store-creation API. Notes/gotchas:

## Seeding `auth.users` — token columns must be `''` not NULL
GoTrue fails to scan a user row with `error finding user: ... column "confirmation_token":
converting NULL to string is unsupported`. The seed sets `confirmation_token, recovery_token,
email_change, email_change_token_new, phone_change, phone_change_token, reauthentication_token`
to `''`. (Symptom: every login returns 500 "Database error querying schema".)

## Access-token hook (H9)
`app.custom_access_token_hook` (migration 0001, `SECURITY INVOKER`) injects
`profiles.global_role` → `claims.app_metadata.global_role`. Requires, for `supabase_auth_admin`:
`usage on schema app`, `execute` on the function, `select on public.profiles`, **and an RLS
policy** `for select to supabase_auth_admin using (true)`. Enabled in
`config.toml [auth.hook.custom_access_token]`. Config changes need `supabase stop && start`;
new migrations need `db reset`. Verified: superadmin JWT carries `global_role: superadmin`.

## Routing model
One page tree. `app/middleware/surface-guard.global.ts` enforces host↔surface (admin routes
404 on non-admin hosts), redirects the admin root → `/dashboard`, and gates `requiresAuth`
pages → `/login`. Admin pages set `definePageMeta({ surface:'admin', ... })`. Custom meta keys
are typed in `app/types/page-meta.d.ts`.

## Cookie scoping (H8)
`nuxt.config` sets the Supabase cookie with **no `Domain`** → host-scoped to `app.*`, so a
storefront subdomain never receives the seller session. `secure` is prod-only (lvh.me is http).

## Security review (M1)
A 3-lens adversarial review ran on the auth/store-creation code (7 raw → 2 kept). Applied:
(1) store-creation no longer echoes raw DB errors — maps 23505→409, reserved→422, else 500;
(2) per-owner store cap (20) against loop-create abuse. The login `?redirect=` is also clamped
to relative paths (Nuxt already blocks external `navigateTo`). H8/H9/H10/H1 all passed.

## Verified at end of M1
Hook injects `global_role`; login/signup render on `app.*`; `/dashboard` unauth → 302 `/login`;
admin routes → 404 on store/apex hosts; `/api/admin/*` unauth → 401; **H10**: non-member
escalation → 403, cross-tenant reads → `[]`; seller sees only their store; reserved subdomain
rejected. `pnpm typecheck` ✅, `pnpm lint` ✅, 0 SSR errors.

Seed logins: `seller@acme.test` (owner of `acme`), `admin@insteshop.test` (superadmin),
password `password123`.

---

# M2 — products + storefront browse (notes)

Admin product CRUD + image upload, and the public storefront catalog/detail. Notes:

## Storage
Migration `0002_storage.sql` creates a **public** `store-media` bucket. Uploads go through
the server via service-role (bypasses storage RLS); product images get public URLs. Draft
images live at unguessable UUID paths and aren't linked publicly.

## API shape
- Admin: `/api/admin/stores/[storeId]/products` (GET/POST) and
  `/api/admin/stores/[storeId]/products/[productId]` (GET/PATCH/DELETE) + `.../image` (POST).
  All gated by `requireStoreAccess(event, storeId, 'staff')` (membership or superadmin) —
  authorization is explicit, not RLS-implicit (the public-read-published policy means a
  bare select would leak other stores' published rows).
- Storefront: `/api/storefront/products` and `/api/storefront/products/[slug]`. Anon client +
  RLS, scoped to `event.context.store` resolved from Host. Only published rows of the tenant.

## Routing
Storefront product pages tag `definePageMeta({ surface: 'store' })`; admin product pages live
under `/stores/[storeId]/products/*` (surface `admin`). No path collisions (`/products/[slug]`
storefront vs `/stores/.../products` admin).

## Slugs
`shared/utils/slug.ts` — NFKD + ASCII-only (drops diacritics: `Café`→`cafe`; non-Latin →
`item`), then a per-store uniqueness loop. The DB `unique (store_id, slug)` is the real guard.

## Verified
Storefront catalog/detail render seeded published products; bad slug → 404; **a draft product
is invisible** in catalog + detail (404); admin product write allowed for staff (201), denied
for a non-member (403). `typecheck` ✅, `lint` ✅, 0 SSR errors.

## M2 debt (hardening, not blocking)
- Image upload validates content-type + size (8MB) but doesn't yet **re-encode via sharp**
  (would strip EXIF + neutralize image bombs; blueprint H7 does this for IG re-hosting — apply
  the same here in a later pass).
- Deleting a product doesn't remove its storage objects (orphaned files; add a cleanup step).

---

# M3 — cart + manual checkout + orders (notes)

Guest cart → COD checkout → order, plus admin order management. Two real bugs caught here:

## Bug: Pinia is incompatible with Nuxt 4 → cart now uses `useState`
`@pinia/nuxt@0.11.0` requires Nuxt ^3.15 and **self-disables on Nuxt 4** (M1/M2 only worked
because nothing used a store). `0.11.1+` supports Nuxt 4 but had the M0 `$pinia` SSR error
(which was actually a symptom of the WebSocket crash, not Pinia). Rather than fight versions,
the cart is now a plain **`useState` composable** (`layers/storefront/app/composables/useCart.ts`,
wrapped in `reactive()` so consumers use `cart.items`/`cart.count` like a store). `@pinia/nuxt`
+ `pinia` were removed. localStorage persistence via `cart-persist.client.ts` (`watch`, not
`$subscribe`).

## Bug: pgcrypto functions must be schema-qualified in `search_path = ''` functions
pgcrypto lives in the **`extensions`** schema (citext is in `public`). `place_order` /
`order_lookup` run with `search_path = ''` (correct security practice) and called
`gen_random_bytes` / `digest` unqualified → `42883 function ... does not exist` → every
checkout 500'd. Fixed by qualifying as `extensions.gen_random_bytes` / `extensions.digest`
(also the `orders.access_token` default). Any future `search_path=''` function using pgcrypto
must do the same.

## Flow
- Checkout: `POST /api/storefront/checkout` → `place_order(p_store from Host, p_idem, ...)`.
  Server reprices every line; client never sends prices; `store_id` from `event.context.store`.
- Guest read-back: `GET /api/storefront/orders/[id]?token=` → `order_lookup` (constant-time
  token compare) + a tenant `store_id` check in the route.
- Admin: order routes under `/api/admin/stores/[storeId]/orders/*`, `requireStoreAccess`;
  status transitions validated against `ORDER_STATUS_TRANSITIONS`; `order_events`/`payments`
  written via service-role; `mark_order_paid_cod` RPC for COD.

## Verified
Guest order total is **server-computed** (2×$24 + $42 = $90.00, ignoring any client claim);
wrong read-back token → 404; idempotent replay returns the same order; COD mark-paid works and
a second attempt is rejected (illegal transition); seller sees the order + events via RLS, anon
sees none. `typecheck` ✅, `lint` ✅, 0 SSR errors.

## Security review (M3)
2-lens adversarial review (4 raw → 1 medium + 2 low). Fixed the medium: the admin status
transition was a non-atomic check-then-update over a service-role (RLS-bypassing) client →
TOCTOU state-machine bypass + double-restock. Replaced with an atomic
`transition_order_status` RPC (migration `0004`, `FOR UPDATE` lock) that validates the
transition, updates, writes the event, and restocks under one lock — verified
`pending→confirmed→fulfilled→refunded` legal, `fulfilled→pending` rejected. This subsumed the
low "missing store_id scope" finding (the RPC scopes by `p_store`). The order-token "timing"
finding was confirmed non-exploitable (compares SHA-256 hashes of 192-bit tokens; read-back is
tenant-scoped) — optional HMAC hardening noted for later (the `access_token_secret_id`/Vault
plumbing exists).

---

# M5 — theming pipeline (notes)

Per-store visual theme, rendered on the storefront and generated from images.

## Provider: Gemini (switched from Claude)
Theming uses **Gemini `gemini-2.5-flash`** via the **`@google/genai`** SDK with structured
output (`responseMimeType:'application/json'` + `responseJsonSchema`). Env: `NUXT_GEMINI_API_KEY`,
`NUXT_GEMINI_MODEL`. (Not `gemini-2.5-flash-image` — that's image generation with a JSON-mode bug.)
Verified live: returns a valid token object for a text prompt.

## Apply (Part A — no API key needed)
`server/middleware/00.tenant.ts` loads the store's active theme (`getActiveTheme`, cached in
Nitro storage by theme id) and attaches validated tokens to `event.context.themeTokens`.
`app/plugins/theme.server.ts` injects them as `--t-*` CSS vars + Google Font links into `<head>`
during SSR (no FOUC). Verified: acme renders its "earthy" palette; apex stays on the fallback.

## Generate (Part B)
`POST /api/admin/stores/[storeId]/theme/generate` (admin) gathers up to 8 published product
images (SSRF-guarded fetch — store-media URLs only, H7), calls Gemini, then **persistTheme**
writes a new immutable version and repoints `stores.active_theme_id`. M4 will add Instagram posts
as the image source. Falls back to a safe theme without a key.

## Safety: validate-on-write AND on-read (H6)
`server/utils/theme/validate.ts` `validateAndRepair()` is the single choke-point: invalid hexes →
fallback value, non-allowlist fonts/enums → defaults, mood filtered to the allowed set, and
fg/muted **contrast-fixed to AA** on bg (`contrast.ts`). It runs on persist AND on read
(`getActiveTheme`). Verified: a deliberately broken theme (`primary:"not-a-color"`, `fg:#EEEEEE`
on white, `heading:"Comic Sans MS"`) was sanitized to fallback primary, `#111111` fg, and Inter —
so malformed tokens can never inject CSS or fail contrast. `typecheck` ✅, `lint` ✅.

---

# M4 — Instagram import (notes — code-complete)

OAuth + import + the full compliance/lifecycle layer are built and verified e2e against local
Supabase. The only remaining work is Meta-side: registering the callback URLs, adding an Instagram
tester, and submitting for App Review (needs a live Professional account + public HTTPS host).

## OAuth (Instagram API with Instagram Login)
`/api/ig/connect?storeId=` (admin host, `requireStoreAccess` admin) → authorize at
`instagram.com/oauth/authorize` (scope `instagram_business_basic`) → `/api/ig/callback`
(the registered redirect URI) exchanges code → short token (`api.instagram.com/oauth/access_token`)
→ long-lived 60d (`graph.instagram.com/access_token?grant_type=ig_exchange_token`) → profile →
stores `ig_accounts` + token.

## Cross-host CSRF nonce (key design point)
The callback lands on the **public tunnel/prod host**, where the admin session cookie (host-scoped
to `app.*`, H8) is absent. So trust is anchored on the **single-use, expiring `ig_oauth_states`
nonce** (bound to `store_id` + `user_id`, created by an authed admin in `/connect`). The `ig_state`
cookie check is best-effort (works only when callback is same-origin as admin, i.e. prod).

## Token at rest = Vault
Migration `0005` adds `public.ig_store_token` / `ig_read_token` / `ig_update_token` SECURITY DEFINER
wrappers (vault schema isn't PostgREST-reachable). `ig_accounts` holds only `access_token_secret_id`.
Verified: store→read round-trip; no raw token column.

## Import
`POST /api/admin/stores/[storeId]/ig/sync` → `getMedia` → **draft** products, idempotent on
`(store_id, ig_media_id)`. Carousel/video → primary image picked; image re-hosted into `store-media`
(IG CDN URLs expire); price parsed from caption; per-store unique slug.

## Compliance + lifecycle (migration `0006` + `server/api/ig/*`, `server/utils/ig/*`)
Meta App Review requires deauthorize + data-deletion callbacks; tokens expire at 60d. All added and
verified locally (signed-request battery + DB assertions, see "Verified e2e" below):

- **Signed-request verify** (`server/utils/ig/signedRequest.ts`): Meta `signed_request` =
  `base64url(HMAC-SHA256(payload, app_secret)).base64url(json)`. Timing-safe compare, base64url
  padding handled, algorithm-confusion rejected. Also `verifyXHubSignature` for webhook POSTs
  (`X-Hub-Signature-256` over the **raw** body) and a deterministic `deletionCode`.
- **Deauthorize** (`/api/ig/deauthorize`): **soft** purge — keep the (now token-less) `ig_accounts`
  row as `token_status='revoked'`, free the Vault secret, keep imported products. Admin IG page shows
  a "Reconnect needed" state.
- **Data deletion** (`/api/ig/data-deletion`): **hard** purge — delete the account row + Vault secret
  + all `source='instagram'` products, write an `ig_deletion_requests` record, and return
  `{ url, confirmation_code }`. `/api/ig/deletion-status/[code]` serves a public, PII-free HTML status.
- **Webhooks** (`/api/ig/webhook`): `GET` verify handshake (`hub.verify_token` vs `igWebhookVerifyToken`);
  `POST` validates `X-Hub-Signature-256` then acks 200 (Meta disables subs that error).
- **Token refresh** (`server/utils/ig/refresh.ts` + `/api/ig/cron/refresh-tokens` GET): refreshes
  tokens inside a 7-day window via `ig_refresh_token`, round-tripping through Vault. Guarded by
  `Authorization: Bearer $NUXT_CRON_SECRET`. Scheduled by `vercel.json` cron (daily 03:00 UTC).
- **Vault cleanup**: `ig_delete_token` (migration `0006`) + `purgeIgAccount()` is the single
  teardown choke-point used by disconnect / deauthorize / data-deletion — no orphaned secrets.
- **H7 SSRF**: `rehost()` now restricts fetches to a `*.cdninstagram.com` / `*.fbcdn.net` allowlist
  with `redirect:'error'` + size/time caps (IG media only ever comes from those CDNs).

### Verified e2e (local Supabase, dev server)
Webhook verify (token match/mismatch), webhook POST bad-signature → 401, cron auth (401 without
secret; runs with it), deletion-status 404 for unknown code. With seeded test rows: deauthorize →
row kept/`revoked`, token nulled, **Vault secret deleted**, products **kept**, `ig.deauthorize`
audited; tampered signed_request → 400. Data-deletion → row/products/**Vault secret all gone**,
`ig_deletion_requests` `completed`, `ig.data_deletion` audited, status page renders "Completed"
without leaking the IG user id. Cron selects an expiring account, reads Vault, marks `error` on a
bad token. All test rows cleaned up afterward.

## Still Meta-side only (cannot be done from code)
- Register the 4 callback URLs in the Meta app dashboard (OAuth `/api/ig/callback`, Deauthorize
  `/api/ig/deauthorize`, Data deletion `/api/ig/data-deletion`, Webhooks `/api/ig/webhook` + verify token).
- Add the seller's IG (Professional/Creator) account as a tester; run the live OAuth once.
- Submit for App Review for `instagram_business_basic`. Needs a public HTTPS host (tunnel in dev,
  `*.insteshop.app` in prod).

## CRITICAL auth bug (found during M4 live testing)
`@nuxtjs/supabase`'s `serverSupabaseUser()` returns JWT **claims** (`auth.getClaims()`) — the user
id is **`sub`**, not `.id`. Every server route used `user.id` (via `requireUser`/`requireStoreAccess`),
so it was `undefined`, silently breaking three things at once: the **dashboard** (`store_members`
filtered by `user_id = undefined` → empty → "no stores"), **store creation** (`owner_id = null` →
23502 not-null violation), and **IG connect** (`ig_oauth_states.user_id = null` → 500 before the
redirect → no trace). Fixed centrally in `requireUser` → returns
`{ id: claims.sub, email, app_metadata, claims }`. It slipped through because every milestone was
verified with **raw JWTs against PostgREST/RLS**, never the **cookie-authenticated Nitro endpoints**.
Verified e2e by minting a real `@supabase/ssr` session cookie (cookie name `sb-127-auth-token`):
create store ✅, dashboard list ✅, `/api/ig/connect` → 302 to instagram.com ✅.
**Lesson:** add a cookie-session e2e smoke test to CI for the admin endpoints.

---

# UI — Nuxt UI v4 (full rebuild)

The whole UI was rebuilt on **Nuxt UI v4** (`@nuxt/ui`, free/unified). Setup: `modules: ['@nuxt/ui', ...]`,
`@import "tailwindcss"; @import "@nuxt/ui";` in `main.css`, `<UApp>` wraps `app.vue`, `app.config.ts` sets
`ui.colors` (primary violet, neutral slate). Dropped the manual `@tailwindcss/vite` plugin (Nuxt UI owns
Tailwind). Added `@iconify-json/lucide` for icons.

## Per-tenant theming integrated with Nuxt UI (key design)
Nuxt UI owns the global theme — **admin + marketing render in the default (violet) theme**. The **storefront
overrides Nuxt UI's `--ui-*` design tokens per seller**: `app/plugins/theme.server.ts` injects a `<style>` (only
when `surface==='store'` and the store has an active theme) setting `--ui-primary`, `--ui-bg`, `--ui-text`,
`--ui-text-muted`, `--ui-border`, `--ui-radius`, + the tenant fonts (`shared/theme/cssVars.ts` `tokensToCssVars`).
So every Nuxt UI component on the storefront automatically reflects that store's colors/fonts — no parallel theme
system. `main.css` no longer defines custom `--color-*` tokens (they clashed with Nuxt UI's `primary`/`muted`).
Verified: `acme.lvh.me` injects `--ui-primary:#b5563a` + Fraunces/Karla; `app.lvh.me/login` has no override (violet).

## Auth UX
Login/signup rebuilt with Nuxt UI (UCard/UFormField/UInput/UButton/UAlert). On success they do a
`window.location.href` full reload to the SSR'd destination — avoids the client-side guard race that bounced
back to /login before the auth state propagated.

Most admin/marketing/storefront page templates were rebuilt via two parallel agent workflows (logic preserved,
templates restyled), then typechecked + linted clean.

# Import + theming redesign (migrations 0008–0010)

Goal: brand-accurate, automated, nuanced import. Built in 5 verified phases.

## Multi-image products (0008)
`product_images` activated as the gallery source of truth: added `public_url`, a `position=0` primary index,
and `public.sync_primary_image(product, store)` (SECURITY DEFINER, **service_role only** — 0007 grant hygiene)
that mirrors the position-0 image into `products.image_url` (kept because `place_order` snapshots it). Admin
multi-image manager (upload/reorder/set-primary/delete); storefront PDP gallery. `products.locked_by_seller`
set on any manual edit. **Verified:** insert→URL_A, reorder→URL_B, delete-all→NULL.

## Logo-derived theming + manual editor (no migration — used existing `themes.logo`)
`server/utils/theme/logoColor.ts` (`sharp`, deterministic): drops transparent/near-white/near-black pixels,
picks the most-populous *saturated* bucket → a logo on a white card yields its ink color, not white.
`derive.ts` builds an accessible palette from that seed (HSL math + `contrast.ts`); `validateAndRepair` is the
final AA guard. `build.ts` orchestrates logo→color→palette + Gemini-for-fonts/mood, shared by `generate.post.ts`
and the manual-logo upload. **The theme is derived from the logo ONLY** — `build.ts` feeds Gemini just the logo
image (via `bufferToThemeImage`, format auto-detected by `sharp`); product photos / branding posts no longer
influence the look. **Auto-generated on first IG connect** (`callback.get.ts` → `maybeAutoGenerateTheme`, guarded
by `hasBrandedTheme` so it never clobbers a logo-derived or hand-edited theme) and the profile picture is
**refreshed on every sync** (`importer.ts` `refreshProfile`) so an IG logo change flows through to the next
regenerate. Manual editor (`theme.vue` + `PUT /theme`) routes through `persistTheme`.
**Verified:** red logo (solid / on-white / transparent) all → `#d62828`; derived fg/bg contrast 16–17:1;
logo buffer → Gemini mime (png/jpeg/webp correct, garbage → null).

## AI import pipeline (0009 categories, 0010 clustering)
Two-stage, accuracy-first: **Stage 1** `analyze.ts` — per-post Gemini (is_product+confidence, summary, price,
categories, branding role), cached in `ig_analysis` (analyzed once, ever). **Stage 2** `cluster.ts` — text-only
clustering, partitions posts into products, may attach to existing products only at `merge_confidence ≥ 0.8` and
never to a `locked_by_seller` product; `validateGroups` guarantees no post is lost + dedups. `importer.ts`
materializes: re-host all images (incl. carousel children) → `product_images` + `product_ig_posts`,
multi-`categories`, non-products → `branding_assets`. Idempotency key = `(media_id, child_id?)`; re-sync skips
materialized posts and reuses the analysis cache. Dropped `products unique(store_id, ig_media_id)` (merge breaks
1:1). Without a Gemini key → per-post heuristic. **Verified:** clustering partition/dedup/bogus-id/merge guards
+ analysis clamping all pass; RLS hides `ig_analysis` from anon.

## Branding → site (Phase 5)
Non-product posts are captured as `branding_assets` and surface as an optional storefront **hero** (admin
"Branding" page sets `used_as='hero'`; RLS public-reads only `used_as`-set rows on active stores). They no
longer influence the theme — theming is logo-only (see above).

All phases: `pnpm typecheck` + `pnpm lint` clean; all 11 migrations apply from scratch. The live AI/theming
end-to-end needs a connected IG account (Meta-side) — pure logic + schema/RLS verified locally.

# Generation refinement: descriptions + images (migrations 0011, 0012)

The naive importer dumped the raw IG caption as the product description and re-hosted every image
blindly. Refined:

## Analysis = one text-only batched call (migration 0012)
The original two-stage design (per-post multimodal analysis + a separate text-only clustering call) was
**replaced** by a SINGLE text-only batched Gemini call — chosen for two reasons found in testing:
- **Cost**: per-post multimodal sent up to 5 full-res images per post (N calls). Images are billed by
  resolution, so that dominated cost. Captions already carry the product facts (price, material, sizes),
  so a text-only call removes image-token cost entirely (~10x cheaper) and is one call, not N+1.
- **Accuracy**: interleaving ~13 images in one multimodal call made Gemini analyze the first post and
  **dismiss the rest** as "lifestyle". Text-only classifies every post independently.

`analyzeBatch` (`analyze.ts`) sends all (uncached) captions in one call and returns, per post:
`is_product`, a stable lowercase **`product_key`** (same key ⇒ same item ⇒ merge; a different
colour/size ⇒ different key ⇒ split), `title`, `description`, `price`, `categories`, `branding_role`.
The importer groups product posts by `product_key`; `loadExistingProductKeys` lets a new post join an
already-imported product with the same key. Posts the model omits / a failed call → per-post heuristic.
The product/branding split **trusts `is_product`**; `confidence` (defaulted to 0.8 when the model omits
it — it usually does) only gates the needs-review flag. `ANALYZE_BATCH_SIZE=24` per call. Images are
re-hosted full-res for the gallery but no longer sent to the model. `ig_analysis.product_key` (0012).

## Descriptions
- `server/utils/ig/cleanCaption.ts` — one pure, deterministic sanitizer (never throws). Strips emoji,
  hashtags, @mentions, URLs/bare-domains, emails, phone numbers, prices/currency, and CTA lines/phrases
  ("DM to order", "link in bio", bilingual EN/AR), then sentence-trims + hard-caps. Tuned so a legit
  sentence that merely *starts* with "Available/Shop/Order" is **not** nuked (those CTAs are caught
  mid-line), and "made to order" survives.
- Gemini returns a grounded `description` (1–3 sentences from caption facts, never invents
  material/size/fit). `validateBatchPost` **always re-runs `cleanCaption` over the model output** (model
  leaks emoji/CTAs even when told not to) and rejects a description that just echoes the title.
- `chooseDescription` (merged products): highest-confidence member wins, ties → longest; never
  concatenates (same SKU). Merge-into-existing never overwrites a description (seller-owned).
- No-Gemini heuristic path also cleans the caption (description **and** title).

## Images
- Images are re-hosted for the gallery but NOT analyzed (text-only analysis). Hero selection is
  heuristic and alt text is title-derived. (`ig_analysis.hero_unit_index`/`image_alts` columns from 0011
  remain for an optional future per-frame pass; the batch leaves them empty.)
- `server/utils/ig/phash.ts` — 16-hex average hash (aHash); **no BigInt** (build target is es2019).
  `attachGroupImages` de-dups near-identical photos across merged member posts (exact-URL via
  `origin+path`, then perceptual `isNearDup` ≤5), drops video/tiny frames unless that would empty the
  gallery, and **keeps the seller's original photo order** (member/carousel order, with video
  thumbnails pushed last — stable sort) so their lead photo stays the hero (geometry-based reordering
  was removed — it picked wrong heroes). Caps at `MAX_IMAGES_PER_PRODUCT=8`, re-hosts via `rehostBuffer`
  (fetch once), writes `alt` + `phash`. Position 0 mirrors to `products.image_url` via
  `sync_primary_image` (checkout snapshot).
- **Categories**: the batched call assigns 1–2 BROAD, consistent, browsable categories (shop-nav style:
  "dresses"/"skirts"/"bags", not "midi dress"/"wrap skirt"/materials), reusing the same name across
  similar items; `assignCategories` Title-Cases the display name. Verified live: apparel → 5 clean
  consistent categories (Dresses, Skirts, Bags, Sets, Accessories) vs 11 fragmented before.
- Merge-into-existing: new images append after the current max position; the existing hero (position 0)
  is preserved; existing `phash`es seed the dedup set.
- Idempotency unchanged: every member-post unit gets exactly one `product_ig_posts` row (image-backed or
  bare link), so a post is skipped on re-sync once it has any link.

## Testing without a live Instagram account
- **Dev fixture importer** — `server/utils/ig/fixtures/` holds 4 curated mock shops (apparel / jewelry /
  coffee / ceramics) with deliberately messy captions and ground-truth merge/branding expectations. The
  builder binds verified, stable `images.unsplash.com` photos (allowed via a dev-only entry in
  `rehost.ts` — empty in prod, still https + `redirect:'error'`). `POST /api/admin/.../ig/seed-fixture`
  (admin, **disabled in production**) runs the *real* `materializeImport` pipeline against fixture media.
  UI: the Instagram admin page shows a **"Load a test shop"** panel in dev (`import.meta.dev`).
- **Real account (fastest):** a throwaway IG **Creator** account (Settings → switch to professional →
  Creator → skip the Facebook Page), added under App Roles → **Instagram Testers**, invite **accepted**
  on instagram.com (Settings → Apps and Websites → Tester Invites). In Development mode `/me/media`
  returns full real data with **no App Review**. There is **no** Instagram sandbox/mock-user facility.

## Verified
- **Live AI path** (apparel fixture): one text-only batched call → **7 products / 5 branding** (gt 8/4;
  the 1 diff is a borderline unboxing video). The same-item pair **merged** into one product with 2
  re-hosted images (hero+alt); the colour-variant Aria **stayed separate**. Ceramics: same-item mug
  **merged**, two glaze-variant vases correctly **split**. Clean grounded descriptions, multi-category,
  branding routing all correct. **Re-run idempotent (0 new)**.
- Unit-tested: `cleanCaption`, `phash`, `validateBatch`/`validateBatchPost`/`normalizeProductKey`,
  fixture builder. `pnpm typecheck`+`pnpm lint` clean; migrations 0000–0012 apply from scratch.
- Bugs fixed during verification: `phash` BigInt literals (es2019 crash risk) → hex hashing;
  `createProduct` null-deref → clear error; multimodal-batch dismissal → text-only; the model omits
  `confidence` → default 0.8 + trust `is_product` for the product/branding split (was dumping all
  products into branding).
- Known limits: fixture stock photos are niche-appropriate but not per-caption-matched (cosmetic only
  now that analysis is text-only); >24 new posts split across batches won't cross-merge.
