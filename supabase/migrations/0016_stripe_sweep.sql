-- ============================================================
-- 0016 — Stripe abandoned-order sweep (M6 — phase 5)
-- Selector for stale Stripe orders that were never paid. Order-first checkout
-- decrements stock immediately (when track_inventory), so abandoned card orders
-- would otherwise hold inventory. The cron cancels each one via
-- transition_order_status(...,'cancelled'), which restocks idempotently.
-- ============================================================
create or replace function public.list_stale_stripe_orders(p_older_than interval)
returns table (order_id uuid, store_id uuid, pi text)
language sql security definer set search_path = '' as $$
  select o.id, o.store_id, o.stripe_payment_intent_id
  from public.orders o
  where o.payment_method = 'stripe'
    and o.payment_status in ('unpaid','pending')
    and o.status = 'pending'
    and o.placed_at < now() - p_older_than;
$$;
revoke all on function public.list_stale_stripe_orders(interval) from anon, authenticated;
