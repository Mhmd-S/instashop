-- ============================================================
-- 0010 — AI Instagram import: analysis cache + clustering links + branding
--
-- The importer becomes: analyze each post once (cached in ig_analysis), cluster
-- same-product posts into one product (product_ig_posts links every IG image-unit
-- to its product + gallery image), and route non-product posts to branding_assets.
-- Idempotency key for every IG image-unit = (store_id, ig_media_id, ig_child_id?).
--
-- A merged product spans several ig_media_ids, so the old products
-- unique(store_id, ig_media_id) no longer holds — idempotency now lives in
-- product_ig_posts.
-- ============================================================

alter table public.products drop constraint if exists products_store_id_ig_media_id_key;
alter table public.products add column if not exists needs_review boolean not null default false;

-- Links an IG image-unit (post, or one carousel child) to the product + gallery
-- image it became. The source of truth for "have we imported this unit?".
create table public.product_ig_posts (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores(id) on delete cascade,
  product_id       uuid not null references public.products(id) on delete cascade,
  ig_media_id      text not null,
  ig_child_id      text,
  product_image_id uuid references public.product_images(id) on delete set null,
  ig_permalink     text,
  ig_posted_at     timestamptz,
  created_at       timestamptz not null default now()
);
create unique index uq_product_ig_posts_unit on public.product_ig_posts (store_id, ig_media_id, coalesce(ig_child_id, ''));
create index idx_product_ig_posts_product on public.product_ig_posts (product_id);

-- Per-post AI analysis cache: each post is analyzed once, ever (re-sync reuses).
create table public.ig_analysis (
  id                   uuid primary key default gen_random_uuid(),
  store_id             uuid not null references public.stores(id) on delete cascade,
  ig_media_id          text not null,
  ig_child_id          text,
  is_product           boolean not null default false,
  confidence           numeric not null default 0,
  product_summary      text,
  title                text,
  price_minor          bigint,
  currency             char(3),
  attributes           jsonb not null default '{}'::jsonb,
  suggested_categories text[] not null default '{}',
  branding_role        text,
  mood_keywords        text[] not null default '{}',
  model                text,
  analyzed_at          timestamptz not null default now()
);
create unique index uq_ig_analysis_unit on public.ig_analysis (store_id, ig_media_id, coalesce(ig_child_id, ''));

-- Non-product posts captured to improve the site (branding imagery + mood words).
create table public.branding_assets (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  ig_media_id   text not null,
  ig_child_id   text,
  role          text not null default 'other'
                check (role in ('lifestyle','announcement','branding','hero_candidate','logo_candidate','other')),
  storage_path  text,
  public_url    text,
  caption       text,
  mood_keywords text[] not null default '{}',
  ig_permalink  text,
  ig_posted_at  timestamptz,
  used_as       text,
  created_at    timestamptz not null default now()
);
create unique index uq_branding_assets_unit on public.branding_assets (store_id, ig_media_id, coalesce(ig_child_id, ''));
create index idx_branding_assets_store on public.branding_assets (store_id);

alter table public.product_ig_posts enable row level security;
alter table public.ig_analysis      enable row level security;
alter table public.branding_assets  enable row level security;

-- All three are service-role-managed admin content. Staff can read (provenance /
-- review); writes happen only via the service-role importer (RLS-bypassing).
create policy "product_ig_posts: staff read" on public.product_ig_posts for select to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "ig_analysis: staff read" on public.ig_analysis for select to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "branding_assets: staff all" on public.branding_assets for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
-- A chosen hero/branding image (used_as set) may be served publicly on an active store.
create policy "branding_assets: public read used" on public.branding_assets for select to anon, authenticated
  using ( used_as is not null and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );
