-- ============================================================
-- 0021 — Simplify product status to a published boolean
-- The 3-state product_status enum (draft/published/archived) collapses to a single
-- `published` boolean: the only thing that matters is whether a product is live on
-- the storefront. 'published' -> true; both 'draft' and 'archived' -> false (hidden).
-- Hard delete already exists for permanent removal, so 'archived' carried no distinct
-- behaviour worth keeping.
-- After applying this migration, regenerate types:  pnpm db:types
-- ============================================================

-- (a) New column, backfilled from the old enum. Default false = new products start hidden.
alter table public.products
  add column if not exists published boolean not null default false;

update public.products set published = (status = 'published');

-- (b) Drop everything that referenced products.status before dropping the column:
--     the storefront read policies, the status indexes, then the column + enum type.
--     (place_order also reads status; it's a plpgsql body, late-bound, so it's safe to
--     recreate after the drop in step (e).)
drop policy if exists "products: public read published" on public.products;
drop policy if exists "images: public read published" on public.product_images;
drop policy if exists "variants: public read published" on public.product_variants;
drop policy if exists "product_categories: public read published" on public.product_categories;

drop index if exists public.idx_products_store_status;
drop index if exists public.idx_products_store_pub;

alter table public.products drop column status;
drop type if exists public.product_status;

-- (c) Recreate the partial index that keeps storefront listing queries cheap.
create index idx_products_store_pub on public.products(store_id) where published;

-- (d) Recreate the storefront read policies against `published`.
create policy "products: public read published" on public.products for select to anon, authenticated
  using ( published
          and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );
create policy "images: public read published" on public.product_images for select to anon, authenticated
  using ( exists (select 1 from public.products p where p.id = product_id and p.published)
          and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );
create policy "variants: public read published" on public.product_variants for select to anon, authenticated
  using ( exists (select 1 from public.products p where p.id = product_id and p.published) );
create policy "product_categories: public read published" on public.product_categories for select to anon, authenticated
  using ( exists (select 1 from public.products p where p.id = product_id and p.published)
          and exists (select 1 from public.stores s where s.id = store_id and s.status = 'active') );

-- (e) Recreate place_order so the line-item availability check uses `published`.
--     Body is identical to 0015 apart from that single predicate (existing grants are
--     preserved across create-or-replace).
create or replace function public.place_order(
  p_store          uuid,
  p_idem           text,
  p_contact        jsonb,            -- {email, phone, name}
  p_ship           jsonb,            -- {name,line1,line2,city,region,postcode,country}
  p_note           text,
  p_lines          jsonb,            -- [{product_id, qty}]
  p_payment_method payment_method default 'cod',
  p_custom         jsonb default '[]'::jsonb  -- [{key,label,type,value}] (pre-validated in TS)
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
  -- Stripe orders await payment ('pending'); COD is 'unpaid' until marked paid.
  v_pay_status public.payment_status := case when p_payment_method = 'stripe' then 'pending' else 'unpaid' end;
begin
  select * into v_store from public.stores where id = p_store and status = 'active';
  if not found then raise exception 'STORE_INACTIVE'; end if;

  -- Defense-in-depth: the RPC is granted to anon, so p_custom is attacker-reachable
  -- even though the TS handler is the real validator. Cap shape/size here.
  if p_custom is not null and (jsonb_typeof(p_custom) <> 'array' or jsonb_array_length(p_custom) > 100) then
    raise exception 'BAD_CUSTOM';
  end if;

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
    customer_note, payment_method, status, payment_status, subtotal_minor, total_minor,
    custom_fields
  ) values (
    p_store, v_cust_id, v_number, v_store.base_currency, p_idem, v_token,
    p_contact->>'email', p_contact->>'phone', p_contact->>'name',
    p_ship->>'name', p_ship->>'line1', p_ship->>'line2', p_ship->>'city',
    p_ship->>'region', p_ship->>'postcode', upper(left(coalesce(p_ship->>'country','  '),2)),
    p_note, p_payment_method, 'pending', v_pay_status, 0, 0,
    coalesce(p_custom, '[]'::jsonb)
  ) returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line->>'qty')::int;
    if v_qty < 1 then raise exception 'BAD_QTY'; end if;
    select * into v_prod from public.products
      where id = (v_line->>'product_id')::uuid and store_id = p_store and published;
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
