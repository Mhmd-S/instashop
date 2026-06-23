-- ============================================================
-- 0007 — fix EXECUTE-grant hygiene on SECURITY DEFINER routines (security)
--
-- Migrations 0000/0003/0004/0005/0006 locked these functions down with
--     revoke all on function <fn> from anon, authenticated;
-- but never revoked Postgres's DEFAULT `EXECUTE TO PUBLIC` grant that every
-- function receives at creation. Because `public` schema USAGE is granted to
-- anon/authenticated (0000_init.sql:699), anon and authenticated still inherited
-- EXECUTE via PUBLIC and could call these SECURITY DEFINER routines directly over
-- PostgREST (POST /rest/v1/rpc/<fn>) with the public anon key:
--   * ig_store_token / ig_read_token / ig_update_token / ig_delete_token
--       -> anon could create / read / update / delete Vault secrets (the IG
--          access tokens). Confirmed: anon `ig_store_token` created a vault row.
--   * increment_stock / decrement_stock
--       -> anon could mutate any store's inventory (product_id + store_id are
--          public via the storefront API).
--   * transition_order_status / mark_order_paid_cod
--       -> anon could change order state / mark orders paid. These have NO
--          internal authorization (p_actor is caller-supplied; only the state
--          machine + store_id match are checked) — the GRANT was the only gate.
--   * is_store_member -> membership probe.
--
-- Every legitimate caller invokes these via the service_role client
-- (server `admin.rpc(...)`) or as an internal SECURITY DEFINER call (place_order
-- -> decrement_stock, transition_order_status -> increment_stock, which run as
-- the function owner). service_role already holds EXECUTE via
-- 0000_init.sql:704 (`grant all on all routines ... to service_role`), so the
-- correct grant for all of these is service_role only.
--
-- place_order and order_lookup are intentionally anon-callable (guest checkout +
-- token-gated order status) and are deliberately left untouched. is_store_member
-- keeps its explicit `authenticated` grant (intended client membership check);
-- only its PUBLIC/anon inheritance is removed.
--
-- Fix: revoke EXECUTE from public (and explicitly anon/authenticated) so only
-- service_role — and the owner, for internal definer calls — can run them.
-- 0001_auth_hook.sql already did this correctly (`revoke ... from ..., public`);
-- this migration brings the rest in line. revoke is a no-op for grants not held,
-- so listing all three roles is safe.
-- ============================================================

-- IG Vault wrappers -> service_role only
revoke execute on function public.ig_store_token(text, text)                from public, anon, authenticated;
revoke execute on function public.ig_read_token(uuid)                       from public, anon, authenticated;
revoke execute on function public.ig_update_token(uuid, text)               from public, anon, authenticated;
revoke execute on function public.ig_delete_token(uuid)                     from public, anon, authenticated;

-- inventory helpers -> service_role + internal definer calls only
revoke execute on function public.increment_stock(uuid, uuid, int)          from public, anon, authenticated;
revoke execute on function public.decrement_stock(uuid, uuid, int)          from public, anon, authenticated;

-- order mutators -> service_role only (server calls them via admin.rpc)
revoke execute on function public.transition_order_status(uuid, uuid, uuid, order_status) from public, anon, authenticated;
revoke execute on function public.mark_order_paid_cod(uuid, uuid, uuid)     from public, anon, authenticated;

-- membership probe -> drop PUBLIC/anon; keep the intended authenticated grant
revoke execute on function public.is_store_member(uuid)                     from public, anon;
