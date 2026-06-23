-- ============================================================
-- 0004 — atomic order status transition
-- Closes the TOCTOU race in the admin status-change handler: the state-machine
-- check, the update, the event, and the (idempotent) restock all happen under a
-- single row lock. Mirrors ORDER_STATUS_TRANSITIONS in shared/types/orders.ts.
-- ============================================================
create or replace function public.transition_order_status(
  p_order  uuid,
  p_store  uuid,
  p_actor  uuid,
  p_target order_status
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v        public.orders;
  v_track  boolean;
  v_item   record;
begin
  select * into v from public.orders where id = p_order and store_id = p_store for update;
  if not found then raise exception 'NOT_FOUND'; end if;

  if not (case v.status
            when 'pending'   then p_target in ('confirmed','cancelled')
            when 'confirmed' then p_target in ('fulfilled','cancelled')
            when 'fulfilled' then p_target in ('refunded')
            else false
          end) then
    raise exception 'ILLEGAL_TRANSITION';
  end if;

  update public.orders set
    status       = p_target,
    confirmed_at = case when p_target = 'confirmed' then now() else confirmed_at end,
    fulfilled_at = case when p_target = 'fulfilled' then now() else fulfilled_at end,
    cancelled_at = case when p_target = 'cancelled' then now() else cancelled_at end
  where id = p_order;

  insert into public.order_events (order_id, store_id, actor_id, kind, from_value, to_value)
    values (p_order, p_store, p_actor, 'status_change', v.status::text, p_target::text);

  -- restock on cancel, idempotent under the same lock
  if p_target = 'cancelled' and v.restocked_at is null then
    select track_inventory into v_track from public.stores where id = p_store;
    if v_track then
      for v_item in
        select product_id, quantity from public.order_items
        where order_id = p_order and store_id = p_store
      loop
        if v_item.product_id is not null then
          perform public.increment_stock(v_item.product_id, p_store, v_item.quantity);
        end if;
      end loop;
    end if;
    update public.orders set restocked_at = now() where id = p_order;
  end if;
end; $$;
revoke all on function public.transition_order_status(uuid, uuid, uuid, order_status) from anon, authenticated;
grant execute on function public.transition_order_status(uuid, uuid, uuid, order_status) to authenticated;
