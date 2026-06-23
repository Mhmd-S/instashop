-- ============================================================
-- 0009 — product categories (multi-category, AI-suggested or manual)
--
-- New tables `categories` + `product_categories` (many-to-many). RLS mirrors
-- product_images: public read gated on (published product +) active store, staff
-- write via app.has_store_access(...,'staff'). Table grants are inherited from
-- the default privileges set in 0000_init.sql (select→anon/authenticated,
-- write→authenticated, all→service_role), so RLS is the real fence here.
-- ============================================================

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  slug        text not null,
  name        text not null,
  description text,
  position    integer not null default 0,
  source      text not null default 'manual' check (source in ('ai','manual')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (store_id, slug)
);
create index idx_categories_store on public.categories(store_id, position);

create table public.product_categories (
  product_id  uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  store_id    uuid not null references public.stores(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (product_id, category_id)
);
create index idx_product_categories_category on public.product_categories(category_id);
create index idx_product_categories_store    on public.product_categories(store_id);

alter table public.categories         enable row level security;
alter table public.product_categories enable row level security;

-- categories: readable on any active store (so empty categories still show in
-- admin via the authenticated path; storefront filters to non-empty in the API).
create policy "categories: public read" on public.categories for select to anon, authenticated
  using ( exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );
create policy "categories: staff all" on public.categories for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );

-- product_categories: public read only for published products on active stores.
create policy "product_categories: public read published" on public.product_categories for select to anon, authenticated
  using ( exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
          and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );
create policy "product_categories: staff all" on public.product_categories for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );

create trigger t_categories_updated before update on public.categories
  for each row execute function app.touch_updated_at();
