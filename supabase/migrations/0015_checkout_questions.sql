-- ============================================================
-- 0015 — Configurable checkout questions
-- Store owners customize what buyers are asked at checkout:
--   * toggle/require/reorder the built-in fields (name, phone, address, note)
--   * add custom questions (short_text, long_text, single_select, yes_no)
-- Config: a single jsonb on stores, hydrated to the storefront via STORE_FIELDS.
-- Answers: a self-describing snapshot array on orders, written atomically inside
-- place_order. Authoritative required/type validation lives in TypeScript
-- (server/api/storefront/checkout.post.ts) — the RPC only persists. place_order
-- gains an 8th p_custom jsonb param (with a defensive shape guard for direct
-- anon RPC calls).
-- ============================================================

-- (a) Config + answers columns. The defaults make existing rows fall back in code:
--     stores.checkout_config = '{}'  -> mergeCheckoutConfig() yields today's form;
--     orders.custom_fields   = '[]'  -> no custom answers. No backfill needed.
alter table public.stores
  add column if not exists checkout_config jsonb not null default '{}'::jsonb;

alter table public.orders
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;

-- (b) Extend place_order atomically. The LIVE signature is the 7-arg form from 0014
--     (uuid,text,jsonb,jsonb,text,jsonb,payment_method). With a defaulted 8th arg
--     the 7-arg form would be ambiguous, so DROP the exact 0014 signature first
--     (same reasoning 0014 used to drop the original 6-arg form), then recreate.
drop function if exists public.place_order(uuid, text, jsonb, jsonb, text, jsonb, payment_method);

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

-- (c) Re-grant the NEW 8-arg signature to anon (guest checkout) + authenticated.
grant execute on function public.place_order(uuid,text,jsonb,jsonb,text,jsonb,payment_method,jsonb) to anon, authenticated;

-- Read paths need no change: admin order GET uses select('*'), and order_lookup
-- returns to_jsonb(v_order), so custom_fields flows to both surfaces automatically.
-- After applying this migration, regenerate types:  pnpm db:types
