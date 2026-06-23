# Insteshop — Cross-Subsystem Consistency Review

I have the canonical reference. The theming subsystem's Claude usage is accurate. Now I'll complete the consistency review.

## Verification of theming-pipeline's Claude usage (all confirmed correct)

- `claude-opus-4-8` — $5/$25 per MTok, 1M context, vision-capable, adaptive thinking only. ✓
- `claude-sonnet-4-6` — $3/$15 per MTok, vision-capable. ✓
- Structured outputs via `output_config.format` with `json_schema` — correct (the deprecated form is `output_format`). ✓
- Prompt caching via `cache_control: {type: "ephemeral"}` on the system block — correct. ✓
- Removed params: `temperature` and `budget_tokens` 400 on Opus 4.8; **prefills removed** (last-assistant-turn prefills 400) — all correctly stated. ✓
- One minor correction for the theming team: it references "JSON schema can't enforce `minLength`/`pattern`" — correct, and it also can't enforce numerical constraints; server-side zod validation is the right call. ✓
- `output_config` is also where `effort` lives if they want cost control — not currently used, fine.

The theming design's Claude integration is internally sound. Now the cross-subsystem seams.

---

# Cross-Subsystem Consistency Review — Insteshop

Subsystems reviewed: ig-graph-api, multitenancy, data-model, theming-pipeline, nuxt-structure, checkout-orders. Findings are grouped; each has a **canonical resolution** to adopt. A unified convention set follows at the end.

## A. THEME TABLE — three different table names + two different column schemas (BLOCKER)

The single largest mismatch. The theme store is named and shaped three different ways:

| Subsystem | Table name | Pointer/structure |
|---|---|---|
| data-model | **`themes`** (versioned rows) + `stores.active_theme_id` FK pointer | `tokens jsonb`, `logo_path text`, `source_post_ids text[]`, `model`, unique `(store_id, version)` |
| theming-pipeline | **`store_theme`** (one active row, unique `store_id`) + separate `store_theme_versions` history | `tokens jsonb`, `logo jsonb`, `meta jsonb`, `version int`, `is_active bool` |
| multitenancy | reads **`stores.theme jsonb`** (inline column on the stores row!) | a single `theme` jsonb blob, no separate table at all |
| nuxt-structure | reads "the store row" `theme` / returns `tokens.cssVars` from `/api/tenant/current` | implies inline-ish |

So we have: a versioned side table with a FK pointer (data-model), a single-active-row table with a parallel history table (theming), AND an inline `stores.theme` jsonb column (multitenancy/nuxt). These cannot all be true.

**Canonical resolution — adopt data-model's shape, with theming's richer jsonb payload:**
- One table **`themes`** (plural, matches data-model and the unified table-naming convention). Immutable versioned rows: `id, store_id, version, tokens jsonb, logo jsonb, meta jsonb, source_post_ids text[], model text, generated_at`, unique `(store_id, version)`.
- `stores.active_theme_id uuid references themes(id) on delete set null` is the single live pointer. **Drop `stores.theme` jsonb entirely** — multitenancy must resolve the active theme via the `active_theme_id` join, not an inline column.
- **Drop theming's separate `store_theme_versions` table** — versioning is already provided by immutable `themes` rows + the FK pointer (data-model's model is better here; it makes "revert" a pointer update, not a row copy). Theming's "revert" = `update stores set active_theme_id = <older themes.id>`.
- Adopt theming's payload split: `tokens jsonb` (the `DesignTokens`), `logo jsonb` (the `ThemeLogo`), `meta jsonb`. Map data-model's `logo_path text` → into the `logo` jsonb's `processedPath`. Map data-model's `tokens` to theming's `DesignTokens` (theming owns this type).
- Multitenancy's `lookupStoreBySubdomain` must `select id, subdomain, name, status, active_theme_id` and then join/fetch the active `themes` row (or do a two-table select). Its `ResolvedStore.theme` field becomes the resolved `themes.tokens`+`logo`.

## B. THEME TOKEN SHAPE — `cssVars` is invented by nuxt-structure; theming never produces it (BLOCKER)

nuxt-structure's `theme.client.ts` does:
```ts
for (const [k, v] of Object.entries(tokens.cssVars)) root.style.setProperty(k, v)
```
It expects a `tokens.cssVars` object. But theming's `DesignTokens` has **no `cssVars` field** — it has `palette`, `typography`, `radius`, `density`, etc., and a server-side `tokensToCssVars()` function that *derives* the `--t-*` vars. There is no `cssVars` property on the stored token blob.

Also: nuxt-structure applies the vars **client-side in a `.client.ts` plugin** (causes FOUC), while theming explicitly applies them **server-side via SSR-inlined `<style>` to avoid FOUC**, and uses `--t-*` var names with a Tailwind `@theme` indirection (`--color-primary: var(--t-primary)`). nuxt-structure instead sets `--color-brand-500` directly and uses different default token names (`--color-brand-50/500/900`, `--color-surface`, `--color-ink`).

So three conflicts: (1) `cssVars` field doesn't exist, (2) client vs server application, (3) different CSS variable naming (`--t-primary`/`--color-primary` vs `--color-brand-500`/`--color-ink`).

**Canonical resolution — theming owns the token→CSS contract; nuxt-structure consumes it:**
- The CSS variable convention is theming's: runtime tokens are `--t-*` (e.g. `--t-primary`), and `main.css` `@theme` maps `--color-*: var(--t-*, fallback)`. nuxt-structure must adopt theming's `main.css` (the `--color-brand-*`/`--color-ink` version is dropped).
- Application is **server-side SSR-inlined** per theming §6b (no client `.client.ts` setProperty loop — delete nuxt-structure's `theme.client.ts` setProperty approach to avoid FOUC). nuxt-structure's `/api/tenant/current` can still return the theme for client-side rendering of name/logo, but the CSS vars are injected in the SSR head, not applied on hydration.
- The shared type is theming's `DesignTokens` in `shared/types/theme.ts` (theming owns it). nuxt-structure's `shared/types/theme.ts` `DesignTokens` must be theming's, and there is no `cssVars` field — the server computes vars from tokens via `tokensToCssVars()`.
- Reconcile file location: theming says `shared/types/theme.ts`; nuxt-structure says `shared/types/theme.ts`. Same — good. Keep `shared/types/theme.ts`.

## C. THEMING'S MEDIA SOURCE — references `media_items` + `stores.profile_picture_url`, which no one defines (GAP + mismatch)

theming's interface seam #1 reads `media_items(store_id, media_url, media_type, thumbnail_url, taken_at)` and `stores.profile_picture_url`. But:
- data-model has **no `media_items` table** — IG posts become **`products`** (drafts) with images in **`product_images`**. There is no separate media-items table.
- `stores` has **no `profile_picture_url` column** in data-model. The profile picture lives on **`ig_accounts.profile_picture_url`** (last-seen CDN url) and **`ig_accounts.profile_picture_storage_path`** (re-hosted), per ig-graph-api §4.
- ig-graph-api re-hosts post images to `product_images.storage_path`, not to a `media_items.media_url`.

**Canonical resolution — theming reads the re-hosted copies, not a phantom table:**
- Theming's post-image source = **`product_images.storage_path`** (joined via `products` where `source='instagram'`, ordered by `products.ig_posted_at desc`, take recent N). It must read the **re-hosted Supabase Storage objects**, NOT `media_url` (which is the expiring IG CDN url and may not even be stored — data-model has no `media_url` column on products). This also resolves theming's "RISK — IG media_url expiry" — the re-hosted copies never expire.
- Theming's profile-picture source = **`ig_accounts.profile_picture_storage_path`** (re-hosted by ig-graph-api). Fallback to `profile_picture_url` only on a fresh connect before re-host completes.
- Theming's selector (`media_type IN ('IMAGE','CAROUSEL_ALBUM')`) can't run against `products` (no `media_type` column). Resolution: ig-graph-api's import already expands carousels into multiple `product_images` rows and stores video stills, so theming just reads `product_images.storage_path` rows for instagram-sourced products — no `media_type` filter needed. **Needs-decision:** add `product_images.is_video bool` + skip videos in theming (ig-graph-api §5B already proposes `is_video`/`video_url` columns — data-model must add them; see finding H).
- Theming feeds Claude **base64 of the downscaled re-hosted images** (its §4 already does server-side download+downscale) — correct and unaffected.

## D. SERVICE-ROLE CLIENT — four different factory names/locations (DUPLICATED DECISION)

The RLS-bypassing service-role client is defined four ways:

| Subsystem | Factory | Location | Key env var |
|---|---|---|---|
| multitenancy | `useServiceRoleClient()` | `server/utils/supabase.ts` | `SUPABASE_SERVICE_ROLE_KEY` |
| nuxt-structure | `supabaseAdmin(event)` wrapping `serverSupabaseServiceRole(event)` | `server/utils/supabaseAdmin.ts` | `NUXT_SUPABASE_SECRET_KEY` (new `sb_secret_` key) via `@nuxtjs/supabase` |
| data-model | "service_role key" (conceptual) | server routes | `SUPABASE_SERVICE_ROLE_KEY` |
| checkout-orders | `serviceRoleClient()` | `checkout.post.ts` only | `SUPABASE_SERVICE_ROLE_KEY` |

Also a key-naming conflict: nuxt-structure uses the **new Supabase publishable/secret keys** (`sb_publishable_`/`sb_secret_`, env `NUXT_PUBLIC_SUPABASE_KEY`/`NUXT_SUPABASE_SECRET_KEY`) read by the `@nuxtjs/supabase` module; everyone else assumes legacy `SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`.

**Canonical resolution — one client factory, one key convention, `@nuxtjs/supabase` is the source of truth:**
- nuxt-structure owns the Supabase wiring (it's the scaffold). Adopt its `@nuxtjs/supabase` module + the **new keys** (`sb_publishable_`/`sb_secret_`). Env names are nuxt-structure's: `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY` (publishable/anon), `NUXT_SUPABASE_SECRET_KEY` (secret/service-role).
- The service-role factory is **one** function: `supabaseAdmin(event)` from `server/utils/supabaseAdmin.ts` (nuxt-structure's, since it correctly uses `serverSupabaseServiceRole`). multitenancy's `useServiceRoleClient()`, checkout's `serviceRoleClient()`, and data-model's conceptual service-role all become this single function.
- The anon/user clients: storefront reads use `serverSupabaseClient(event)` (request-scoped, RLS as user); public/guest reads where there's no JWT go through `supabaseAdmin(event)` with explicit `store_id` scoping. multitenancy's separate `useAnonClient()` singleton is redundant — use the module's clients.
- The `tenantScoped(event)` choke-point helper (multitenancy §4.2) is **kept** as the mandatory wrapper for service-role tenant-table access, but it wraps `supabaseAdmin(event)` not `useServiceRoleClient()`. checkout's `serviceRoleClient()` in `checkout.post.ts` must route through `tenantScoped` or an equivalent store-id-forcing wrapper (checkout already hard-codes `store.id`, so this aligns).

## E. TENANT CONTEXT KEY — `event.context.store` vs `event.context.tenant`; `.surface` exists in two places (mismatch)

| Subsystem | Context key | Surface concept |
|---|---|---|
| multitenancy | `event.context.store` (a `ResolvedStore`), `event.context.hostInfo` | `hostInfo.kind: 'apex'|'reserved'|'store'|'foreign'` |
| nuxt-structure | `event.context.tenant` + `event.context.surface` (`'marketing'|'admin'|'store'`) | explicit `surface` |
| theming | reads `useState('store')` / event context | — |
| checkout | `event.context.store` (`{id, slug, currency}`) | — |

So checkout and theming agree with multitenancy (`event.context.store`), but nuxt-structure uses `event.context.tenant` and adds a `surface` field multitenancy folds into `hostInfo.kind`. Also: multitenancy's `ResolvedStore` has `{id, subdomain, name, status, theme}`; checkout expects `{id, slug, currency, track_inventory, default_country, payment_methods}` — different field set (`slug` vs `subdomain`, plus `currency` which multitenancy's ResolvedStore lacks).

**Canonical resolution:**
- Context key is **`event.context.store`** (3 of 4 agree; it's also clearer). nuxt-structure renames `event.context.tenant` → `event.context.store`.
- Surface is **`event.context.surface`** as a first-class field (`'marketing'|'admin'|'store'`), set by the tenant middleware alongside `store`. multitenancy's `hostInfo.kind` maps: `apex→marketing`, `reserved→admin` (for `app.`) / other reserved, `store→store`, `foreign→` (404/marketing). Keep `event.context.hostInfo` too for the raw parse. So both exist: `surface` (the routing decision) derived from `hostInfo.kind`.
- The middleware file is **one** file: `server/middleware/00.tenant.ts` (both name it identically — good). It must set `store`, `surface`, and `hostInfo`. multitenancy owns the resolution logic; nuxt-structure owns the wiring stub. Reconcile the two `00.tenant.ts` sketches into one.
- **`ResolvedStore` canonical fields:** `{ id, subdomain, name, status, base_currency, active_theme_id }`. Resolve `currency` from **`stores.base_currency`** (data-model's column) — checkout's `store.currency` = `store.base_currency`. **`slug` does not exist** — it's `subdomain` everywhere (see finding F). track_inventory/payment_methods/default_country are additional `stores` columns checkout needs (finding H).

## F. `stores.subdomain` vs `stores.slug` — checkout uses `slug`, everyone else uses `subdomain` (mismatch)

data-model and multitenancy define **`stores.subdomain citext unique`**. checkout-orders consistently references **`stores.slug`** (`store.slug`, `success_url: https://${store.slug}.insteshop.app/...`, cart key `insteshop:cart:<storeSlug>`). There is no `slug` column.

**Canonical resolution:** Single column **`stores.subdomain`**. checkout replaces every `slug`/`storeSlug` with `subdomain`. The Stripe `success_url` uses `${store.subdomain}.insteshop.app`. The cart localStorage key becomes `insteshop:cart:<subdomain>`. (If a human-friendly display slug distinct from the DNS label is ever wanted, that's a future `stores.display_slug` — not now.)

## G. ORDERS/PAYMENTS — money column names, enum values, and customer model diverge (multiple mismatches)

checkout-orders and data-model both define `orders`/`order_items`/`payments`, and they disagree:

**G1. Currency representation — both use integer minor units (good!), but different column names:**
- data-model: `price_cents`, `subtotal_cents`, `total_cents`, `unit_price_cents`, `amount_cents` ("cents")
- checkout: `price_minor`, `subtotal_minor`, `total_minor`, `unit_price_minor`, `amount_minor` ("minor"), plus `shipping_minor`, `discount_minor`, `tax_minor`
- **Resolution:** adopt **`*_minor`** naming (checkout's) — "minor units" is currency-correct (the store may be EGP/fils, not cents). Apply across ALL money columns in `products`, `orders`, `order_items`, `payments`. So data-model's `products.price_cents` → `products.price_minor`, etc. The type is `bigint` (checkout) not `integer` (data-model) — adopt **`bigint`** to be safe on totals. Theming/IG price parsing (ig-graph-api §5B `products.price`) writes to `price_minor`.

**G2. `order_status` enum values differ:**
- data-model: `('pending','confirmed','fulfilled','cancelled','refunded')`
- checkout: `('pending','confirmed','fulfilled','cancelled','refunded')` — **these match.** ✓ Good.

**G3. `payment_status` enum values differ:**
- data-model: `('unpaid','pending','paid','refunded','failed')`
- checkout: `('unpaid','paid','refunded','partially_refunded')`
- **Resolution:** adopt the **union that the state machine needs**: `('unpaid','pending','paid','partially_refunded','refunded','failed')`. checkout's state machine drives `unpaid→paid→{refunded,partially_refunded}`; data-model's `pending`/`failed` are useful for Stripe in-flight states. Keep all six; checkout's transition map adds `pending` and `failed` for the Stripe path.

**G4. `payment_method` enum values differ:**
- data-model: text+CHECK `('manual','stripe')`
- checkout: enum `('cod','stripe')`
- **Resolution:** the manual/COD method must have ONE name. Adopt **`('cod','stripe')`** as a real Postgres **enum** `payment_method` (checkout's, since COD is the precise v1 term and checkout owns the order flow). data-model's `orders.payment_method` and `payments.provider` CHECK align to `cod`/`stripe`. Note data-model also had a separate `payments.provider text check ('manual','stripe')` — unify: `payments.method payment_method` (enum) per checkout; drop the separate `provider` text column, or keep `provider` as an alias = method. Canonical: use checkout's `payments.method payment_method`.

**G5. Stripe linkage columns differ:**
- data-model `payments`: `provider_payment_intent_id`, unique `(provider, provider_payment_intent_id)`
- checkout `orders`: `stripe_session_id`, `stripe_payment_intent_id`; `payments`: `stripe_payment_intent_id`, `stripe_charge_id`, unique on `stripe_payment_intent_id`
- **Resolution:** adopt checkout's explicit `stripe_*` columns (clearer, and checkout owns the Stripe seam). `orders.stripe_session_id`, `orders.stripe_payment_intent_id`, `payments.stripe_payment_intent_id`, `payments.stripe_charge_id`. Add `payments.provider_status payment_provider_status` enum (checkout's) for Stripe states.

**G6. Customer model conflict — `customers` table vs order-snapshot fields:**
- data-model: full **`customers`** table (`store_id, user_id, email, name, phone`, unique `(store_id, email)`), `orders.customer_id` FK.
- checkout: also references `customers(id, store_id, email, phone, name)` and find-or-creates — **matches data-model.** ✓ But checkout ALSO stores contact/shipping snapshot fields directly on `orders` (`contact_email`, `ship_name`, `ship_line1`, etc.), and data-model ALSO has order snapshot fields (`contact_email`, `ship_address_line1`, etc.). Column names differ: data-model `ship_address_line1/line2/city/region/postal_code/country`; checkout `ship_line1/line2/city/region/postcode/country` + `ship_name`.
- **Resolution:** keep both the `customers` table AND order snapshots (correct pattern — snapshot is immutable, customer row mutable). Adopt **one snapshot column set** — checkout's is more complete (`ship_name`, `customer_note`): `contact_email, contact_phone, contact_name, ship_name, ship_line1, ship_line2, ship_city, ship_region, ship_postcode, ship_country char(2), customer_note`. data-model's `ship_address_line1`→`ship_line1`, `ship_postal_code`→`ship_postcode`, `notes`→`customer_note`.

**G7. Guest order read-back token:**
- data-model: `orders.access_token text default encode(gen_random_bytes(24),'hex')` (stored token) + a `place_order` RPC.
- checkout: HMAC `order_token` (signed, not stored) via `ORDER_TOKEN_SECRET` + a `place_order` RPC.
- **Resolution:** **needs-decision (D-G7)** — two valid approaches. Recommend checkout's **HMAC signed token** (no DB column, no per-order secret storage, revocable by rotating the secret) OR data-model's stored `access_token` (simpler, individually revocable). Pick ONE. If HMAC: drop `orders.access_token`. If stored: drop `ORDER_TOKEN_SECRET`. Recommend **stored `access_token`** for individual revocability + so a guest link survives secret rotation; lighter cognitive load. Either way, BOTH subsystems propose a `place_order` SECURITY DEFINER RPC that recomputes prices server-side — **converge on one `place_order` signature** (checkout's is more detailed: `place_order(p_store, p_idem, p_contact, p_ship, p_note, p_currency, p_subtotal, p_total, p_lines, p_track_inventory)`).

**G8. `order_number` generation:**
- data-model: `order_number text`, unique `(store_id, order_number)`, no generation strategy stated.
- checkout: per-store sequence `stores.next_order_seq` → `INS-<seq>`.
- **Resolution:** adopt checkout's per-store sequence. data-model must add `stores.next_order_seq bigint not null default 1`, advanced inside `place_order`. Format `INS-<seq>`.

## H. `stores` COLUMNS — checkout & theming need columns data-model doesn't define (GAP)

Columns referenced but not in data-model's `stores`:
- checkout: `stores.track_inventory bool`, `stores.next_order_seq`, `stores.notify_email`, `stores.auto_confirm_on_paid bool`, `stores.payment_methods`, `stores.default_country`
- ig-graph-api / theming: profile picture lives on `ig_accounts` not `stores` (already resolved in C) — but theming's `stores.profile_picture_url` reference is wrong; remove.
- `products` columns ig-graph-api needs that data-model must include: `source` ✓ (has it), `ig_media_id` ✓, `ig_permalink` ✓, `ig_posted_at` (data-model has `ig_media_id`+`ig_permalink` but **not `ig_posted_at`** — add it), and `product_images.is_video`/`video_url` (data-model's `product_images` has `storage_path, alt, position` but **not `is_video`/`video_url`** — add them per ig-graph-api §5B).
- ig-graph-api's `ig_accounts` token column: ig-graph-api §4 names it `access_token_encrypted bytea` (pgcrypto), but **data-model chose Supabase Vault** → `access_token_secret_id uuid` pointing at `vault.secrets.id`. This is a direct conflict (finding I).

**Canonical resolution — data-model owns `stores`/`products`/`product_images`/`ig_accounts`; add the missing columns:**
- `stores`: add `track_inventory bool not null default false`, `next_order_seq bigint not null default 1`, `notify_email text`, `auto_confirm_on_paid bool not null default false`, `default_country char(2)`. **Needs-decision (D-H1):** `payment_methods` — array/enum of enabled methods; recommend `payment_methods payment_method[] not null default '{cod}'`.
- `products`: add `ig_posted_at timestamptz`. (`source`, `ig_media_id`, `ig_permalink`, `price_minor`, `currency` already covered.)
- `product_images`: add `is_video bool not null default false`, `video_url text`.

## I. IG TOKEN STORAGE — pgcrypto vs Supabase Vault (CONFLICT; both flagged it as needs-decision)

- ig-graph-api §4: `ig_accounts.access_token_encrypted bytea` via pgcrypto `pgp_sym_encrypt`, key `IG_TOKEN_ENC_KEY`. Flags D2 (pgcrypto vs Vault), leans Vault.
- data-model: **decides Vault** — `ig_accounts.access_token_secret_id uuid` → `vault.secrets.id`, no encrypted column, no `IG_TOKEN_ENC_KEY`.

Both flagged it; data-model made the call. They must converge.

**Canonical resolution — adopt data-model's Supabase Vault decision (D2 → Vault):**
- `ig_accounts.access_token_secret_id uuid` (pointer to `vault.secrets`). **Drop `access_token_encrypted bytea` and `IG_TOKEN_ENC_KEY` env var.** ig-graph-api's refresh task decrypts via `vault.decrypted_secrets` and rotates by updating the vault secret. ig-graph-api's other token columns (`token_expires_at`, `token_status`, `token_scopes`, `last_sync_cursor`, etc.) are kept — they're metadata, not secrets. **Caveat data-model itself flagged:** verify Vault works in local Supabase CLI stack; if not, a dev-only env-encrypted fallback behind a flag (don't let it diverge the prod schema).
- Column-name reconciliation on `ig_accounts`: ig-graph-api uses `username`/`name`; data-model uses `ig_username` (no `name`). Adopt **`ig_username`** (data-model, namespaced) + add `name text` (ig-graph-api needs the display name). `profile_picture_url` + `profile_picture_storage_path` (ig-graph-api) must be **added to data-model's `ig_accounts`** (data-model omitted them). `token_status`, `token_scopes`→ data-model has `scopes text[]`; rename to align — adopt **`scopes`** (data-model) and add ig-graph-api's `token_status text`, `token_expires_at`, `last_sync_cursor`, `last_sync_error`, `deauthorized_at`, `data_deletion_requested_at`.
- **Unique constraint conflict:** data-model has `unique(store_id)` AND `unique(ig_user_id)` (one IG account per store). ig-graph-api has `unique(store_id, ig_user_id)` (allows multiple per store in future). Adopt data-model's **`unique(store_id)`** for v1 (1:1 enforced), keep `unique(ig_user_id)` globally. Both flagged the >1 future case; drop `unique(store_id)` later.

## J. IG LOGIN STRATEGY — Instagram Login (ig-graph-api D1) vs Facebook Login (nuxt-structure env + LOCKED DECISION) (mismatch + needs-ratification)

- LOCKED DECISION + nuxt-structure: **Facebook Login** — env `NUXT_IG_APP_ID`/`NUXT_IG_APP_SECRET`, route `/api/ig/callback` "FB Login start", references the Meta app secret.
- ig-graph-api: recommends **Instagram Login** (graph.instagram.com, no FB Page) as primary, FB Login as fallback (D1), explicitly flagged for ratification. Env `IG_APP_ID`/`IG_APP_SECRET`/`IG_REDIRECT_URI`/`IG_WEBHOOK_VERIFY_TOKEN`.

This is a genuine open decision ig-graph-api correctly surfaced rather than silently changing.

**Canonical resolution:**
- **Needs-decision (D-J1, escalate to platform):** ratify Instagram Login primary (ig-graph-api's recommendation) vs the literal Facebook Login in LOCKED DECISIONS. ig-graph-api's schema supports both via `ig_accounts.provider ('instagram'|'facebook')`, so the data model is unaffected either way — only scopes, the auth dialog, and `fb_page_id` usage change.
- Regardless of D-J1: **env var names must converge.** nuxt-structure uses `NUXT_`-prefixed (`NUXT_IG_APP_ID`, etc., required by Nuxt `runtimeConfig`); ig-graph-api uses bare `IG_APP_ID`. Adopt nuxt-structure's **`NUXT_IG_*`** convention (the Nuxt runtimeConfig mechanism requires it) and add the ones ig-graph-api needs that nuxt-structure omits: `NUXT_IG_WEBHOOK_VERIFY_TOKEN`. Drop `IG_TOKEN_ENC_KEY` (finding I). `IG_GRAPH_VERSION`/`NUXT_IG_GRAPH_VERSION` only needed if FB-Login fallback is enabled.
- Route paths: both agree on `/api/ig/connect`, `/api/ig/callback`. ig-graph-api adds `/api/ig/sync`, `/api/ig/disconnect`, `/api/ig/webhook`, `/api/ig/deauthorize`, `/api/ig/data-deletion`; nuxt-structure has `/api/ig/import.post.ts`. **Reconcile:** ig-graph-api's `/api/ig/sync.post.ts` == nuxt-structure's `/api/ig/import.post.ts` — pick **`/api/ig/sync`** (ig-graph-api owns the import logic). nuxt-structure updates its stub.

## K. STORAGE BUCKETS — three different bucket layouts (mismatch)

| Subsystem | Bucket(s) | Path |
|---|---|---|
| ig-graph-api | `store-media` | `{store_id}/products/{ig_media_id}/{i}.jpg`, profile pic too |
| theming | `store-assets` | `{store_id}/logo/...`, `{store_id}/theme/source/...` |
| data-model | suggests `product-images` AND `store-assets` | `{store_id}/...` prefix |
| nuxt-structure | (env) `SUPABASE_STORAGE_BUCKET=store-media` | — |

So: ig-graph-api + nuxt-structure say `store-media`; theming + data-model say `store-assets` (data-model also floats `product-images`). Product images and logos/theme-source land in different buckets depending on who you ask.

**Canonical resolution — two buckets, clear ownership:**
- **`store-media`** — IG-imported product images + re-hosted profile picture. Owner: ig-graph-api. Path `{store_id}/products/{ig_media_id}/{i}.jpg` and `{store_id}/profile/...`. (nuxt-structure's env already names this.)
- **`store-assets`** — theming-generated logo variants + theme source snapshots + any seller-uploaded brand assets. Owner: theming. Path `{store_id}/logo/...`, `{store_id}/theme/source/...`.
- Both buckets: writes by service-role only; reads RLS-scoped by `{store_id}` path prefix (data-model's storage RLS must mirror the table RLS). Drop data-model's `product-images` name — product images live in `store-media`.
- `product_images.storage_path` and `themes.logo` jsonb paths must record **bucket + object path** (or assume the bucket per column convention: `storage_path` always in `store-media`, `logo` paths always in `store-assets`). Recommend storing bare object path and knowing the bucket by column. Env: keep `SUPABASE_STORAGE_BUCKET` only if a single default is needed; better to have both bucket names as constants.

## L. RLS HELPER FUNCTION — `is_store_member()` vs `app.has_store_access()` (mismatch)

- data-model: `app.has_store_access(store_id, min_role)` + `app.is_superadmin()` in a private `app` schema, role-ranked.
- multitenancy: `is_store_member(store_id)` (public, boolean) — `is_store_member(target)`.
- checkout: assumes `is_store_member(p_store uuid)` "provided by multitenancy."

Two names for the membership check, in two schemas, with different signatures (boolean vs role-ranked).

**Canonical resolution — adopt data-model's `app.has_store_access()` as the canonical, role-aware helper:**
- data-model owns RLS. The canonical helpers are `app.has_store_access(p_store_id uuid, p_min_role member_role default 'staff')` and `app.is_superadmin()`, in the private `app` schema (correctly not exposed to PostgREST).
- For subsystems that only need a boolean "is this user any-role staff of the store" (multitenancy, checkout), that's `app.has_store_access(store_id, 'staff')`. Provide a thin alias `is_store_member(store_id) := app.has_store_access(store_id, 'staff')` if checkout/multitenancy prefer the shorter name, but canonical policies use `app.has_store_access`. checkout's order RLS policies (`is_store_member(store_id)`) → `app.has_store_access(store_id, 'staff')`.
- Member roles: data-model `member_role ('owner','admin','staff')`. multitenancy mentioned `('owner','admin','staff')` ✓ and also `store_members(user_id, store_id, role)`. checkout mentioned `('owner','admin','staff')` ✓. All agree — good. PK `(store_id, user_id)` (data-model) — multitenancy says PK same. ✓

## M. SUPERADMIN ROLE SOURCE — JWT `app_metadata.global_role` vs membership (consistent, but note the seam)

data-model uses `app_metadata.global_role='superadmin'` (non-user-editable JWT claim) for superadmin bypass, with `profiles.global_role` as durable source-of-truth synced via a Custom Access Token Hook. No other subsystem contradicts this, but **nuxt-structure/auth must own the token hook** that sets `app_metadata.global_role` — currently no subsystem explicitly owns it.

**Canonical resolution:** data-model defines `profiles.global_role`. The **auth wiring (Custom Access Token Hook or `auth.admin.updateUserById`) is a GAP** — assign to nuxt-structure (it owns Supabase auth config) or a dedicated auth subsystem. Until then, superadmin checks fail silently (claim never set). Flag as build-order dependency.

---

## UNOWNED RESPONSIBILITIES (GAPS — no subsystem owns these)

1. **Migrations ownership.** nuxt-structure puts `supabase/migrations/` in the tree and says "authored by data-model + RLS subsystems." data-model provides the DDL but doesn't own the migration files/numbering. checkout, theming, ig all add tables/columns. **Resolution:** data-model owns the migration directory and merges all subsystems' DDL into ordered migrations. One canonical schema, one migration history. All `*_minor`/`themes`/etc. renames land here.

2. **Background jobs / cron.** ig-graph-api needs a daily token-refresh task (its D3, undecided host). checkout needs an abandoned-Stripe-session sweep (future) + new-order Realtime/poll. theming has no cron but generation is long-running. **No subsystem owns the scheduler.** **Resolution + needs-decision (D-CRON):** pick the cron host once (Nitro `scheduledTasks` needs always-on Node; serverless → Supabase `pg_cron` + Edge Function or Vercel Cron). This couples to the deploy-target decision (multitenancy recommends Vercel; nuxt-structure recommends Node preset for the Anthropic SDK + service-role). **These two recommendations conflict** — see deploy-target below.

3. **Image re-hosting from IG.** Owned by ig-graph-api (§5C) ✓ — but theming was about to re-hit the CDN; finding C reassigns theming to read ig-graph-api's re-hosted copies. Re-hosting is ig-graph-api's job alone.

4. **Email sending.** checkout introduces Resend (`RESEND_API_KEY`, `RESEND_FROM`) for new-order notifications. No other subsystem mentions email; ig-graph-api's data-deletion confirmation and auth's magic-links/confirmations also need email. **Resolution:** checkout's Resend choice becomes the platform email transport. A small `server/utils/email.ts` owns it; auth emails go through Supabase Auth's own email (separate). Flag: don't duplicate transactional-email providers.

5. **Deploy target.** multitenancy: **Vercel Pro** (wildcard + nameservers). nuxt-structure: **Node preset / Vercel Node functions** (so the Anthropic SDK + service-role run in Node, not edge). These are compatible IF Vercel functions use the Node runtime (not edge) — **but must be stated as one decision.** **Resolution + needs-decision (D-DEPLOY):** Vercel Pro with **Node runtime** functions for `/api/**` (satisfies both wildcard TLS and Node-only SDKs); cron via Vercel Cron hitting a secret-protected `/api/ig/_cron/refresh`. This resolves ig-graph-api's D3 and the cron gap simultaneously.

6. **Cross-subdomain auth cookie.** nuxt-structure flags it (module lacks `cookieOptions.domain`); recommends store-scoped customer sessions separate from seller auth. No conflict, but **unowned decision.** **Resolution:** adopt nuxt-structure's rec — sellers auth on `app.` only; customers get store-scoped lightweight accounts (matches data-model's `customers.user_id` nullable + `customers` self-read RLS). Confirm with auth subsystem.

---

## BUILD-ORDER DEPENDENCIES

1. **data-model migrations** (schema + RLS + helpers `app.has_store_access`, `app.is_superadmin`, `place_order` RPC, `decrement_stock`, `themes`/`stores`/`ig_accounts`/orders with `*_minor`) — must exist first; everything reads these tables.
2. **nuxt-structure scaffold** (Nuxt 4 + `@nuxtjs/supabase` + Tailwind v4 + `shared/types/database.types.ts` generated from #1 + `supabaseAdmin()` + theming's `main.css`) — provides the app shell, env contract, and the one service-role factory.
3. **multitenancy** (`00.tenant.ts` setting `store`/`surface`/`hostInfo`, `tenantScoped`, `lookupStoreBySubdomain` resolving `active_theme_id`) — every other server route depends on `event.context.store`.
4. **ig-graph-api** (connect/callback/sync, Vault token storage, re-host to `store-media`) — produces `products` + `product_images` + re-hosted profile pic that theming consumes.
5. **theming-pipeline** (reads ig's re-hosted images from `store-media`/`product_images`, writes `themes` row, repoints `stores.active_theme_id`) — depends on #4's images.
6. **checkout-orders** (reads `products.price_minor`, writes `orders`/`order_items`/`payments` via `place_order`) — depends on #1 schema + #3 tenant context.
7. **Auth token hook** (sets `app_metadata.global_role`) + **cron host** + **email transport** — cross-cutting, wire alongside #2.

---

## RECOMMENDED UNIFIED CONVENTION SET

**Table names (plural, snake_case):** `stores`, `store_members`, `profiles`, `ig_accounts`, `products`, `product_images`, `product_variants`, `themes` (NOT `store_theme`/`store_theme_versions`), `customers`, `orders`, `order_items`, `payments`, `order_events`, `webhook_events`. Versioning via immutable `themes` rows + `stores.active_theme_id` FK (no parallel `_versions` table; no inline `stores.theme`).

**IDs:** `uuid` PKs via `gen_random_uuid()` everywhere. External IDs as `text` (`ig_user_id`, `ig_media_id`, `stripe_payment_intent_id`). Human refs: `orders.order_number` = `INS-<per-store seq>`.

**Money:** integer **minor units**, column suffix **`_minor`**, type **`bigint`**. Always paired with a `currency char(3)` (ISO 4217). Per-store single currency = `stores.base_currency`; `orders.currency`/`products.currency` inherit it.

**Tenant column:** **`store_id uuid not null references stores(id)`** on every tenant-scoped table (denormalized onto `product_images`, `order_items`, `payments`, etc. for RLS perf). DNS label = **`stores.subdomain`** (citext, unique) — never `slug`.

**Server context:** `event.context.store` (`ResolvedStore`: `{id, subdomain, name, status, base_currency, active_theme_id}`), `event.context.surface` (`'marketing'|'admin'|'store'`), `event.context.hostInfo`. Set by `server/middleware/00.tenant.ts`.

**Route prefixes:** `/api/ig/*` (connect, callback, sync, disconnect, webhook, deauthorize, data-deletion), `/api/theme/*` (generate, tokens, logo, revert), `/api/storefront/*` (cart/price, checkout, orders/:id, orders/:id/cancel), `/api/admin/*` (orders, orders/:id, …), `/api/webhooks/stripe`, `/api/tenant/current`. Host split: `app.<base>`=admin surface, `<sub>.<base>`=store surface, apex=marketing.

**Supabase clients:** `serverSupabaseClient(event)` (user/RLS), `supabaseAdmin(event)` (service-role/RLS-bypass, ONLY via `tenantScoped(event)` for tenant tables). New keys: `NUXT_PUBLIC_SUPABASE_KEY` (publishable), `NUXT_SUPABASE_SECRET_KEY` (secret).

**RLS helpers:** `app.has_store_access(store_id, min_role)`, `app.is_superadmin()` in private `app` schema. Superadmin via JWT `app_metadata.global_role`, durable in `profiles.global_role`. Roles: `member_role('owner','admin','staff')`.

**Enums:** `order_status('pending','confirmed','fulfilled','cancelled','refunded')`, `payment_status('unpaid','pending','paid','partially_refunded','refunded','failed')`, `payment_method('cod','stripe')`, `payment_provider_status`, `product_status('draft','published','archived')`, `store_status('pending','active','suspended','archived')`. `products.source` text+CHECK `('instagram','manual')`.

**Theme CSS:** runtime vars `--t-*` injected SSR-side into `<head>`; Tailwind `@theme` maps `--color-*: var(--t-*, fallback)`; `data-density`/`data-btn`/`data-shadow` on `<html>`. Token type = theming's `DesignTokens` in `shared/types/theme.ts`. No `cssVars` field.

**Storage:** `store-media` (IG product images + profile pic, owner ig-graph-api), `store-assets` (logo + theme source, owner theming). Path prefix `{store_id}/`. Service-role writes, RLS-scoped reads.

**Models (Claude):** `claude-opus-4-8` (theme gen, $5/$25), `claude-sonnet-4-6` (cost-down, $3/$15), via `output_config.format` json_schema + `cache_control` ephemeral on system. No `temperature`/`budget_tokens`/prefills.

**Env prefix:** Nuxt `runtimeConfig` requires `NUXT_` (secrets) / `NUXT_PUBLIC_` (public). Canonical: `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`, `NUXT_SUPABASE_SECRET_KEY`, `NUXT_PUBLIC_APP_BASE_DOMAIN`, `NUXT_CLAUDE_API_KEY`, `NUXT_CLAUDE_MODEL`, `NUXT_IG_APP_ID`, `NUXT_IG_APP_SECRET`, `NUXT_IG_REDIRECT_URI`, `NUXT_IG_WEBHOOK_VERIFY_TOKEN`, `NUXT_STRIPE_SECRET_KEY`, `NUXT_STRIPE_WEBHOOK_SECRET`, `NUXT_RESEND_API_KEY`, `NUXT_RESEND_FROM`, `NUXT_ORDER_TOKEN_SECRET` (only if HMAC guest tokens chosen). Dropped: `IG_TOKEN_ENC_KEY` (Vault), bare-prefixed `IG_*`/`SUPABASE_*` duplicates.

## OPEN NEEDS-DECISION REGISTER (escalate)

- **D-J1:** Instagram Login vs Facebook Login primary (ig-graph-api's D1; contradicts LOCKED DECISION wording). Schema supports both.
- **D-DEPLOY:** Vercel Pro + Node-runtime functions (reconciles multitenancy's Vercel rec with nuxt-structure's Node-preset need + ig's cron host D3).
- **D-CRON:** cron mechanism (resolved to Vercel Cron → `/api/ig/_cron/refresh` if D-DEPLOY=Vercel).
- **D-G7:** guest order read-back — stored `access_token` (recommended) vs HMAC `order_token`. Affects whether `orders.access_token` column or `NUXT_ORDER_TOKEN_SECRET` exists.
- **D-H1:** `stores.payment_methods` representation (recommend `payment_method[]`).
- **D2 (resolved → Vault):** confirm Supabase Vault works in local CLI dev; define dev fallback that doesn't fork the schema.
- **Auth token hook owner:** who sets `app_metadata.global_role` (recommend nuxt-structure/auth).
- **Cross-subdomain cookie:** confirm store-scoped customer sessions ≠ seller sessions with the auth subsystem.