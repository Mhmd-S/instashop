-- ============================================================
-- 0003 — increment_stock (restock when an order is cancelled)
-- Only adjusts tracked products (stock is not null). Service-role only.
-- ============================================================
create or replace function public.increment_stock(p_product uuid, p_store uuid, p_qty int)
returns void language sql security definer set search_path = '' as $$
  update public.products
     set stock = coalesce(stock, 0) + p_qty
   where id = p_product and store_id = p_store and stock is not null;
$$;
revoke all on function public.increment_stock(uuid, uuid, int) from anon, authenticated;
