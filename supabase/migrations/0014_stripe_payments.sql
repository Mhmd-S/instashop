-- ============================================================
-- 0014 — Stripe payments (M6 — pay half)
-- Order-first flow: place_order creates a 'pending' Stripe order (server-repriced,
-- authoritative amount); the webhook flips it to 'paid' via mark_order_paid_stripe.
-- All RPCs are SECURITY DEFINER with search_path='' and row locks, mirroring
-- mark_order_paid_cod. Service-role only except place_order (the guest write path).
-- ============================================================

-- (a) place_order gains p_payment_method. We DROP the old 6-arg overload first:
-- with a defaulted 7th arg, keeping both would make 6-arg calls ambiguous.
drop function if exists public.place_order(uuid, text, jsonb, jsonb, text, jsonb);

create or replace function public.place_order(
  p_store          uuid,
  p_idem           text,
  p_contact        jsonb,   -- {email, phone, name}
  p_ship           jsonb,   -- {name,line1,line2,city,region,postcode,country}
  p_note           text,
  p_lines          jsonb,   -- [{product_id, qty}]
  p_payment_method payment_method default 'cod'
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
    p_note, p_payment_method, 'pending', v_pay_status, 0, 0
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
grant execute on function public.place_order(uuid,text,jsonb,jsonb,text,jsonb,payment_method) to anon, authenticated;

-- (b) Stripe mark-paid (analog of mark_order_paid_cod). Idempotent: upserts the
-- payment row (PI is unique) and only flips the order/logs an event when still
-- non-terminal, so duplicate webhook deliveries are safe.
create or replace function public.mark_order_paid_stripe(
  p_order    uuid,
  p_store    uuid,
  p_pi       text,
  p_charge   text,
  p_amount   bigint,
  p_currency char(3),
  p_raw      jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare v public.orders;
begin
  select * into v from public.orders where id = p_order and store_id = p_store for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  insert into public.payments
    (store_id, order_id, method, provider_status, amount_minor, currency,
     stripe_payment_intent_id, stripe_charge_id, received_at, raw)
  values
    (p_store, p_order, 'stripe', 'succeeded', p_amount, p_currency,
     p_pi, p_charge, now(), p_raw)
  on conflict (stripe_payment_intent_id) where stripe_payment_intent_id is not null
    do update set provider_status = 'succeeded',
                  stripe_charge_id = excluded.stripe_charge_id,
                  amount_minor     = excluded.amount_minor,
                  received_at      = now(),
                  raw              = excluded.raw;

  if v.payment_status in ('unpaid','pending') then
    update public.orders
       set payment_status = 'paid',
           stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_pi)
     where id = p_order;
    insert into public.order_events (order_id, store_id, actor_id, kind, from_value, to_value)
      values (p_order, p_store, null, 'payment', v.payment_status::text, 'paid');
  end if;
end; $$;
revoke all on function public.mark_order_paid_stripe(uuid,uuid,text,text,bigint,char,jsonb) from anon, authenticated;

-- (c) Stripe payment failed (payment_intent.payment_failed). Never downgrades a
-- paid order; records/refreshes the failed payment row.
create or replace function public.mark_order_payment_failed_stripe(
  p_order    uuid,
  p_store    uuid,
  p_pi       text,
  p_amount   bigint,
  p_currency char(3),
  p_raw      jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare v public.orders;
begin
  select * into v from public.orders where id = p_order and store_id = p_store for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.payment_status = 'paid' then return; end if;

  insert into public.payments
    (store_id, order_id, method, provider_status, amount_minor, currency, stripe_payment_intent_id, raw)
  values (p_store, p_order, 'stripe', 'failed', p_amount, p_currency, p_pi, p_raw)
  on conflict (stripe_payment_intent_id) where stripe_payment_intent_id is not null
    do update set provider_status = 'failed', raw = excluded.raw;

  if v.payment_status <> 'failed' then
    update public.orders set payment_status = 'failed' where id = p_order;
    insert into public.order_events (order_id, store_id, actor_id, kind, from_value, to_value)
      values (p_order, p_store, null, 'payment', v.payment_status::text, 'failed');
  end if;
end; $$;
revoke all on function public.mark_order_payment_failed_stripe(uuid,uuid,text,bigint,char,jsonb) from anon, authenticated;

-- (d) Refund recorder — keeps the webhook (charge.refunded) as the single source of
-- truth even for refunds initiated from the Stripe dashboard. Sets refunded vs
-- partially_refunded from the cumulative refunded amount.
create or replace function public.record_stripe_refund(
  p_store          uuid,
  p_pi             text,
  p_refunded_total bigint,
  p_raw            jsonb
) returns void language plpgsql security definer set search_path = '' as $$
declare v public.orders; v_target public.payment_status;
begin
  select o.* into v from public.orders o
    where o.store_id = p_store and o.stripe_payment_intent_id = p_pi for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v.payment_status not in ('paid','partially_refunded') then return; end if;

  v_target := case when p_refunded_total >= v.total_minor then 'refunded' else 'partially_refunded' end;
  if v_target = v.payment_status then return; end if;

  update public.orders set payment_status = v_target where id = v.id;
  update public.payments set provider_status = 'refunded', raw = p_raw
    where stripe_payment_intent_id = p_pi;
  insert into public.order_events (order_id, store_id, actor_id, kind, from_value, to_value)
    values (v.id, p_store, null, 'payment', v.payment_status::text, v_target::text);
end; $$;
revoke all on function public.record_stripe_refund(uuid,text,bigint,jsonb) from anon, authenticated;
