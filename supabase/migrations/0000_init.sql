-- ============================================================
-- Insteshop initial schema — DDL + RLS + RPCs
-- Source of truth: docs/ARCHITECTURE.md §3 (security-corrected)
-- ============================================================

-- ------------------------------------------------------------
-- 00 extensions + schemas
-- ------------------------------------------------------------
create extension if not exists "pgcrypto";   -- gen_random_uuid, gen_random_bytes, digest, hmac
create extension if not exists "citext";
-- Supabase Vault is preinstalled on the platform + local CLI (used at runtime by Nitro,
-- not referenced in this migration). IG tokens are stored as vault secret UUIDs.

create schema if not exists app;
revoke all on schema app from anon, authenticated;

-- ------------------------------------------------------------
-- 01 enums
-- ------------------------------------------------------------
create type store_status            as enum ('pending','active','suspended','archived');
create type member_role             as enum ('owner','admin','staff');
create type global_role             as enum ('user','superadmin');
create type product_status          as enum ('draft','published','archived');
create type order_status            as enum ('pending','confirmed','fulfilled','cancelled','refunded');
create type fulfillment_status      as enum ('unfulfilled','partial','fulfilled');
create type payment_status          as enum ('unpaid','pending','paid','partially_refunded','refunded','failed');
create type payment_method          as enum ('cod','stripe');
create type payment_provider_status as enum ('requires_action','processing','succeeded','failed','refunded');

-- ------------------------------------------------------------
-- 02 profiles (1:1 with auth.users)
-- ------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        citext,
  full_name    text,
  avatar_url   text,
  global_role  global_role not null default 'user',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- L7: only copies name/avatar; global_role is NEVER taken from user metadata.
create or replace function app.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function app.handle_new_user();

-- H9: only service-role/superadmin may change global_role.
create or replace function app.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.global_role is distinct from old.global_role then
    if not (coalesce((auth.jwt() -> 'app_metadata' ->> 'global_role') = 'superadmin', false)
            or auth.role() = 'service_role') then
      raise exception 'global_role may only be changed by superadmin/service_role';
    end if;
  end if;
  return new;
end; $$;
create trigger trg_guard_profile_role
  before update on public.profiles for each row execute function app.guard_profile_role();

-- ------------------------------------------------------------
-- 03 stores + members
-- ------------------------------------------------------------
-- L2: reserved-subdomain denylist in the DB (defense-in-depth), mirrors shared/tenancy/reserved.ts
create table public.reserved_subdomains (name citext primary key);
insert into public.reserved_subdomains (name) values
  ('app'),('api'),('admin'),('www'),('assets'),('cdn'),('static'),
  ('mail'),('ftp'),('ns1'),('ns2'),('status'),('help'),('docs'),('blog'),('dashboard');

create table public.stores (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null references public.profiles(id) on delete restrict,
  subdomain        citext not null unique
                     check (subdomain ~ '^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$'),
  name             text not null,
  status           store_status not null default 'pending',
  base_currency    char(3) not null default 'USD',
  default_country  char(2),
  active_theme_id  uuid,                                   -- FK added after themes
  track_inventory      boolean not null default false,
  auto_confirm_on_paid boolean not null default false,
  next_order_seq       bigint  not null default 1,
  notify_email         text,
  payment_methods      payment_method[] not null default '{cod}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create or replace function app.guard_subdomain()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.reserved_subdomains r where r.name = new.subdomain) then
    raise exception 'subdomain "%" is reserved', new.subdomain;
  end if;
  return new;
end; $$;
create trigger trg_guard_subdomain
  before insert or update of subdomain on public.stores
  for each row execute function app.guard_subdomain();

create table public.store_members (
  store_id   uuid not null references public.stores(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       member_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);
create index idx_store_members_user on public.store_members(user_id);

create or replace function app.sync_store_owner_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.store_members (store_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (store_id, user_id) do update set role = 'owner';
  return new;
end; $$;
create trigger trg_store_owner_membership
  after insert on public.stores for each row execute function app.sync_store_owner_membership();

-- ------------------------------------------------------------
-- 04 ig_accounts (I/M1: Vault — store ONLY the secret UUID)
-- ------------------------------------------------------------
create table public.ig_accounts (
  id                     uuid primary key default gen_random_uuid(),
  store_id               uuid not null references public.stores(id) on delete cascade,
  provider               text not null default 'instagram'
                           check (provider in ('instagram','facebook')),
  ig_user_id             text not null,
  ig_username            text,
  name                   text,
  account_type           text,
  profile_picture_url          text,
  profile_picture_storage_path text,
  media_count            int,
  fb_page_id             text,
  access_token_secret_id uuid,                  -- -> vault.secrets.id
  token_type             text default 'bearer',
  scopes                 text[] not null default '{}',
  token_expires_at       timestamptz,
  token_refreshed_at     timestamptz,
  token_status           text not null default 'active'
                           check (token_status in ('active','expiring','expired','revoked','error')),
  last_sync_at           timestamptz,
  last_sync_cursor       text,
  last_sync_error        text,
  connected_at           timestamptz not null default now(),
  deauthorized_at        timestamptz,
  data_deletion_requested_at timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (store_id),     -- v1: one IG account per store
  unique (ig_user_id)
);
create index idx_ig_accounts_refresh on public.ig_accounts (token_status, token_expires_at);

-- 04b ig_oauth_states (H4: CSRF/state binding)
create table public.ig_oauth_states (
  nonce       text primary key,
  store_id    uuid not null references public.stores(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  provider    text not null default 'instagram',
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '10 minutes',
  used_at     timestamptz
);
create index idx_ig_oauth_states_expiry on public.ig_oauth_states (expires_at);

-- ------------------------------------------------------------
-- 05 catalog
-- ------------------------------------------------------------
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  source          text not null default 'manual' check (source in ('instagram','manual')),
  ig_media_id     text,
  ig_permalink    text,
  ig_posted_at    timestamptz,
  status          product_status not null default 'draft',
  title           text not null,
  slug            text not null,
  description     text,
  tags            text[] not null default '{}',
  price_minor     bigint not null default 0 check (price_minor >= 0),
  currency        char(3) not null default 'USD',
  stock           integer check (stock is null or stock >= 0),
  image_url       text,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (store_id, slug),
  unique (store_id, ig_media_id)
);
create index idx_products_store_status on public.products(store_id, status);
create index idx_products_store_pub    on public.products(store_id) where status = 'published';
create index idx_products_store_igtime on public.products(store_id, ig_posted_at desc) where source = 'instagram';

create table public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  store_id      uuid not null references public.stores(id) on delete cascade,
  storage_path  text not null,
  alt           text,
  position      integer not null default 0,
  is_video      boolean not null default false,
  video_url     text,
  created_at    timestamptz not null default now()
);
create index idx_product_images_product on public.product_images(product_id, position);
create index idx_product_images_store   on public.product_images(store_id);

create table public.product_variants (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  store_id      uuid not null references public.stores(id) on delete cascade,
  title         text not null,
  sku           text,
  price_minor   bigint check (price_minor is null or price_minor >= 0),
  stock         integer check (stock is null or stock >= 0),
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  unique (store_id, sku)
);
create index idx_variants_product on public.product_variants(product_id);

-- ------------------------------------------------------------
-- 06 themes (versioned; stores.active_theme_id points at the live one)
-- ------------------------------------------------------------
create table public.themes (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  version         integer not null,
  tokens          jsonb not null default '{}'::jsonb,
  logo            jsonb not null default '{}'::jsonb,
  meta            jsonb not null default '{}'::jsonb,
  source_post_ids text[] not null default '{}',
  model           text,
  generated_at    timestamptz not null default now(),
  unique (store_id, version)
);
create index idx_themes_store on public.themes(store_id);

alter table public.stores
  add constraint stores_active_theme_fk
  foreign key (active_theme_id) references public.themes(id) on delete set null;

-- ------------------------------------------------------------
-- 07 customers
-- ------------------------------------------------------------
create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references public.stores(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  email       citext,
  name        text,
  phone       text,
  created_at  timestamptz not null default now(),
  unique (store_id, email)
);
create index idx_customers_store on public.customers(store_id);
create index idx_customers_user  on public.customers(user_id);

-- ------------------------------------------------------------
-- 08 orders
-- ------------------------------------------------------------
create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  store_id           uuid not null references public.stores(id) on delete cascade,
  customer_id        uuid references public.customers(id) on delete set null,
  order_number       text not null,
  status             order_status not null default 'pending',
  fulfillment_status fulfillment_status not null default 'unfulfilled',
  payment_status     payment_status not null default 'unpaid',
  payment_method     payment_method not null default 'cod',
  currency           char(3) not null,
  subtotal_minor     bigint not null default 0 check (subtotal_minor >= 0),
  shipping_minor     bigint not null default 0 check (shipping_minor >= 0),
  discount_minor     bigint not null default 0 check (discount_minor >= 0),
  tax_minor          bigint not null default 0 check (tax_minor      >= 0),
  total_minor        bigint not null default 0 check (total_minor    >= 0),
  contact_email      citext,
  contact_phone      text,
  contact_name       text,
  ship_name          text,
  ship_line1         text,
  ship_line2         text,
  ship_city          text,
  ship_region        text,
  ship_postcode      text,
  ship_country       char(2),
  customer_note      text,
  access_token       text not null default encode(extensions.gen_random_bytes(24),'hex'),
  idempotency_key          text,
  stripe_session_id        text,
  stripe_payment_intent_id text,
  restocked_at       timestamptz,
  placed_at          timestamptz not null default now(),
  confirmed_at       timestamptz,
  fulfilled_at       timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint orders_number_uq unique (store_id, order_number),
  constraint orders_idem_uq   unique (store_id, idempotency_key)
);
create index idx_orders_store_status  on public.orders(store_id, status, placed_at desc);
create index idx_orders_store_payment on public.orders(store_id, payment_status);
create index idx_orders_customer      on public.orders(customer_id);

create table public.order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  store_id           uuid not null references public.stores(id) on delete cascade,
  product_id         uuid references public.products(id) on delete set null,
  variant_id         uuid references public.product_variants(id) on delete set null,
  title_snapshot     text not null,
  image_url_snapshot text,
  unit_price_minor   bigint not null check (unit_price_minor >= 0),
  quantity           integer not null check (quantity > 0),
  line_total_minor   bigint not null check (line_total_minor >= 0),
  created_at         timestamptz not null default now()
);
create index idx_order_items_order on public.order_items(order_id);
create index idx_order_items_store on public.order_items(store_id);

-- ------------------------------------------------------------
-- 09 payments (Stripe-ready)
-- ------------------------------------------------------------
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  store_id                 uuid not null references public.stores(id) on delete cascade,
  order_id                 uuid not null references public.orders(id) on delete cascade,
  method                   payment_method not null,
  provider_status          payment_provider_status,
  amount_minor             bigint not null check (amount_minor >= 0),
  currency                 char(3) not null,
  stripe_payment_intent_id text,
  stripe_charge_id         text,
  received_at              timestamptz,
  recorded_by              uuid references auth.users(id),
  raw                      jsonb,
  created_at               timestamptz not null default now()
);
create index idx_payments_order on public.payments(order_id);
create index idx_payments_store on public.payments(store_id);
create unique index payments_pi_uq on public.payments(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

-- ------------------------------------------------------------
-- 10 order_events + webhook_events
-- ------------------------------------------------------------
create table public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  store_id    uuid not null references public.stores(id) on delete cascade,
  actor_id    uuid references auth.users(id),
  kind        text not null,
  from_value  text,
  to_value    text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index idx_order_events_order on public.order_events(order_id, created_at);

create table public.webhook_events (
  id           text primary key,
  type         text not null,
  store_id     uuid,
  processed_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 11 audit_log
-- ------------------------------------------------------------
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid references public.stores(id) on delete set null,
  actor_id    uuid references auth.users(id),
  action      text not null,
  target      text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index idx_audit_store on public.audit_log(store_id, created_at desc);

-- ------------------------------------------------------------
-- 12 updated_at triggers
-- ------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger t_profiles_updated    before update on public.profiles    for each row execute function app.touch_updated_at();
create trigger t_stores_updated      before update on public.stores      for each row execute function app.touch_updated_at();
create trigger t_ig_accounts_updated before update on public.ig_accounts for each row execute function app.touch_updated_at();
create trigger t_products_updated    before update on public.products    for each row execute function app.touch_updated_at();
create trigger t_orders_updated      before update on public.orders      for each row execute function app.touch_updated_at();

-- ============================================================
-- 20 RLS helpers (private app schema)
-- ============================================================
create or replace function app.is_superadmin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'global_role') = 'superadmin', false);
$$;

create or replace function app.has_store_access(p_store_id uuid, p_min_role member_role default 'staff')
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store_id and m.user_id = (select auth.uid())
      and (case m.role when 'owner' then 3 when 'admin' then 2 else 1 end)
          >= (case p_min_role when 'owner' then 3 when 'admin' then 2 else 1 end)
  );
$$;

create or replace function public.is_store_member(p_store uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select app.has_store_access(p_store, 'staff');
$$;

revoke all on function app.is_superadmin()                        from anon, authenticated;
revoke all on function app.has_store_access(uuid, member_role)    from anon, authenticated;
grant execute on function app.is_superadmin()                     to authenticated;
grant execute on function app.has_store_access(uuid, member_role) to authenticated;
grant execute on function public.is_store_member(uuid)            to authenticated;

-- ============================================================
-- 30 RLS enable + policies
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.stores           enable row level security;
alter table public.store_members    enable row level security;
alter table public.ig_accounts      enable row level security;
alter table public.ig_oauth_states  enable row level security;
alter table public.products         enable row level security;
alter table public.product_images   enable row level security;
alter table public.product_variants enable row level security;
alter table public.themes           enable row level security;
alter table public.customers        enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.payments         enable row level security;
alter table public.order_events     enable row level security;
alter table public.audit_log        enable row level security;
-- reserved_subdomains, webhook_events: no RLS, service-role only.
revoke all on public.reserved_subdomains from anon, authenticated;
revoke all on public.webhook_events      from anon, authenticated;

-- profiles
create policy "profiles: self read"   on public.profiles for select to authenticated
  using ( (select auth.uid()) = id or app.is_superadmin() );
create policy "profiles: self update" on public.profiles for update to authenticated
  using ( (select auth.uid()) = id )
  with check ( (select auth.uid()) = id );

-- stores
create policy "stores: public active read" on public.stores for select to anon, authenticated
  using ( status = 'active' );
create policy "stores: member read"  on public.stores for select to authenticated
  using ( app.has_store_access(id,'staff') or app.is_superadmin() );
create policy "stores: admin update" on public.stores for update to authenticated
  using ( app.has_store_access(id,'admin') or app.is_superadmin() )
  with check ( app.has_store_access(id,'admin') or app.is_superadmin() );
-- store creation = service-role only (no INSERT policy). (H10)

-- store_members (H10)
create policy "members: read same store" on public.store_members for select to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "members: owner manage"    on public.store_members for all to authenticated
  using ( app.has_store_access(store_id,'owner') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'owner') or app.is_superadmin() );

-- ig_accounts (token never a column; admin-only read; writes service-role only)
create policy "ig: admin read" on public.ig_accounts for select to authenticated
  using ( app.has_store_access(store_id,'admin') or app.is_superadmin() );

-- ig_oauth_states: service-role only (no policies; verified server-side).

-- products
create policy "products: public read published" on public.products for select to anon, authenticated
  using ( status = 'published'
          and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );
create policy "products: staff read all" on public.products for select to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "products: staff write"    on public.products for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );

-- product_images / variants
create policy "images: public read published" on public.product_images for select to anon, authenticated
  using ( exists (select 1 from public.products p where p.id = product_id and p.status = 'published')
          and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );
create policy "images: staff all" on public.product_images for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "variants: public read published" on public.product_variants for select to anon, authenticated
  using ( exists (select 1 from public.products p where p.id = product_id and p.status = 'published') );
create policy "variants: staff all" on public.product_variants for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );

-- themes (public reads only the ACTIVE theme of an active store)
create policy "themes: public read active" on public.themes for select to anon, authenticated
  using ( exists (select 1 from public.stores s where s.active_theme_id = themes.id and s.status = 'active') );
create policy "themes: staff read all" on public.themes for select to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "themes: admin write"    on public.themes for all to authenticated
  using ( app.has_store_access(store_id,'admin') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'admin') or app.is_superadmin() );

-- customers (H10/forgotten-#8)
create policy "customers: staff all" on public.customers for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "customers: self read" on public.customers for select to authenticated
  using ( user_id = (select auth.uid()) );

-- orders (H3: NO anon INSERT; guest writes via place_order RPC only)
create policy "orders: staff all" on public.orders for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "orders: customer self read" on public.orders for select to authenticated
  using ( customer_id in (select c.id from public.customers c where c.user_id = (select auth.uid())) );

-- order_items (H3)
create policy "order_items: staff all" on public.order_items for all to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() )
  with check ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "order_items: customer self read" on public.order_items for select to authenticated
  using ( order_id in (
    select o.id from public.orders o join public.customers c on c.id = o.customer_id
    where c.user_id = (select auth.uid())) );

-- payments (service-role writes; staff read)
create policy "payments: staff read" on public.payments for select to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() );

-- order_events / audit_log (staff read)
create policy "order_events: staff read" on public.order_events for select to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() );
create policy "audit: staff read" on public.audit_log for select to authenticated
  using ( app.has_store_access(store_id,'staff') or app.is_superadmin() );

-- ============================================================
-- 50 RPCs (the secure write seams)
-- ============================================================

-- M3: atomic stock decrement; null stock = untracked.
create or replace function public.decrement_stock(p_product uuid, p_store uuid, p_qty int)
returns boolean language plpgsql security definer set search_path = '' as $$
declare ok boolean;
begin
  update public.products set stock = stock - p_qty
   where id = p_product and store_id = p_store
     and (stock is null or stock >= p_qty)
  returning true into ok;
  return coalesce(ok, false);
end; $$;
revoke all on function public.decrement_stock(uuid,uuid,int) from anon, authenticated;

-- H3/G7/M3/M9: THE ONLY guest write path. Reprices every line server-side.
create or replace function public.place_order(
  p_store      uuid,
  p_idem       text,
  p_contact    jsonb,   -- {email, phone, name}
  p_ship       jsonb,   -- {name,line1,line2,city,region,postcode,country}
  p_note       text,
  p_lines      jsonb    -- [{product_id, qty}]
) returns table (order_id uuid, order_number text, access_token text)
language plpgsql security definer set search_path = '' as $$
declare
  v_store      public.stores;
  v_existing   public.orders;
  v_line       jsonb;
  v_prod       public.products;
  v_qty        int;
  v_subtotal   bigint := 0;
  v_seq        bigint;
  v_order_id   uuid;
  v_number     text;
  v_token      text;
  v_cust_id    uuid;
begin
  select * into v_store from public.stores where id = p_store and status = 'active';
  if not found then raise exception 'STORE_INACTIVE'; end if;

  select * into v_existing from public.orders where store_id = p_store and idempotency_key = p_idem;
  if found then
    return query select v_existing.id, v_existing.order_number, v_existing.access_token; return;
  end if;

  if coalesce(p_contact->>'email','') <> '' then
    insert into public.customers (store_id, email, name, phone)
    values (p_store, p_contact->>'email', p_contact->>'name', p_contact->>'phone')
    on conflict (store_id, email) do update set name = excluded.name
    returning id into v_cust_id;
  end if;

  update public.stores set next_order_seq = next_order_seq + 1
   where id = p_store returning next_order_seq - 1 into v_seq;
  v_number := 'INS-' || v_seq;
  v_token  := encode(extensions.gen_random_bytes(24),'hex');

  insert into public.orders (
    store_id, customer_id, order_number, currency, idempotency_key, access_token,
    contact_email, contact_phone, contact_name,
    ship_name, ship_line1, ship_line2, ship_city, ship_region, ship_postcode, ship_country,
    customer_note, payment_method, status, payment_status, subtotal_minor, total_minor
  ) values (
    p_store, v_cust_id, v_number, v_store.base_currency, p_idem, v_token,
    p_contact->>'email', p_contact->>'phone', p_contact->>'name',
    p_ship->>'name', p_ship->>'line1', p_ship->>'line2', p_ship->>'city',
    p_ship->>'region', p_ship->>'postcode', upper(left(coalesce(p_ship->>'country','  '),2)),
    p_note, 'cod', 'pending', 'unpaid', 0, 0
  ) returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line->>'qty')::int;
    if v_qty < 1 then raise exception 'BAD_QTY'; end if;
    select * into v_prod from public.products
      where id = (v_line->>'product_id')::uuid and store_id = p_store and status = 'published';
    if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;

    if v_store.track_inventory then
      if not public.decrement_stock(v_prod.id, p_store, v_qty) then
        raise exception 'OUT_OF_STOCK';
      end if;
    end if;

    insert into public.order_items (
      order_id, store_id, product_id, title_snapshot, image_url_snapshot,
      unit_price_minor, quantity, line_total_minor
    ) values (
      v_order_id, p_store, v_prod.id, v_prod.title, v_prod.image_url,
      v_prod.price_minor, v_qty, v_prod.price_minor * v_qty
    );
    v_subtotal := v_subtotal + v_prod.price_minor * v_qty;
  end loop;

  update public.orders set subtotal_minor = v_subtotal, total_minor = v_subtotal
    where id = v_order_id;
  insert into public.order_events (order_id, store_id, actor_id, kind, to_value)
    values (v_order_id, p_store, null, 'created', 'pending');

  return query select v_order_id, v_number, v_token;
end; $$;
grant execute on function public.place_order(uuid,text,jsonb,jsonb,text,jsonb) to anon, authenticated;

-- M4: guest read-back by id + stored token (constant-time compare).
create or replace function public.order_lookup(p_order uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_order public.orders; v_items jsonb;
begin
  select * into v_order from public.orders where id = p_order;
  if not found then return null; end if;
  if not (extensions.digest(v_order.access_token,'sha256') = extensions.digest(p_token,'sha256')) then
    return null;
  end if;
  select coalesce(jsonb_agg(to_jsonb(i.*)),'[]') into v_items
    from public.order_items i where i.order_id = v_order.id;
  return to_jsonb(v_order) || jsonb_build_object('items', v_items);
end; $$;
grant execute on function public.order_lookup(uuid,text) to anon, authenticated;

-- COD mark-paid (state machine; M3). Stripe analog is added in M6.
create or replace function public.mark_order_paid_cod(p_order uuid, p_store uuid, p_actor uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v public.orders;
begin
  select * into v from public.orders where id = p_order and store_id = p_store for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.payment_status <> 'unpaid' then raise exception 'ILLEGAL_TRANSITION'; end if;
  update public.orders set payment_status = 'paid' where id = p_order;
  insert into public.payments (store_id, order_id, method, amount_minor, currency, received_at, recorded_by)
    values (p_store, p_order, 'cod', v.total_minor, v.currency, now(), p_actor);
  insert into public.order_events (order_id, store_id, actor_id, kind, from_value, to_value)
    values (p_order, p_store, p_actor, 'payment', 'unpaid', 'paid');
end; $$;
revoke all on function public.mark_order_paid_cod(uuid,uuid,uuid) from anon, authenticated;
grant execute on function public.mark_order_paid_cod(uuid,uuid,uuid) to authenticated;

-- ============================================================
-- 60 role grants
-- RLS governs which ROWS are visible; these table-level privileges are what
-- Supabase normally adds by default but did not auto-apply to this migration's
-- tables. Without them every role gets "permission denied" regardless of RLS.
-- ============================================================
grant usage on schema public to anon, authenticated, service_role;

-- service_role bypasses RLS and needs full access (server-side writes + cron jobs)
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines  in schema public to service_role;

-- anon + authenticated: table access; the RLS policies above restrict the rows
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- future tables/sequences inherit these (later migrations needn't repeat them)
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines  to service_role;
alter default privileges in schema public grant select on tables to anon, authenticated;
alter default privileges in schema public grant insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated;

-- service-role-only registries: keep anon/authenticated out at the GRANT level too
revoke all on public.reserved_subdomains from anon, authenticated;
revoke all on public.webhook_events      from anon, authenticated;
revoke all on public.ig_oauth_states     from anon, authenticated;
