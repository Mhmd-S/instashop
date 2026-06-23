-- ============================================================
-- 0008 — activate product_images as the multi-image source of truth
--
-- product_images already exists (0000) but is barely used (the manual uploader
-- writes a single position-0 row). This migration makes it the gallery source:
--   * public_url: denormalized public URL alongside storage_path (storefront
--     galleries read many rows; avoid recomputing getPublicUrl per row).
--   * a fast primary-image lookup (position = 0).
--   * public.sync_primary_image(): mirrors the lowest-position image's public_url
--     into products.image_url. image_url STAYS as the denormalized primary —
--     place_order snapshots it into order_items.image_url_snapshot, and storefront
--     cards read it — so it must keep reflecting the gallery's primary image.
--   * products.locked_by_seller: set on first manual edit so the AI re-sync
--     (0009) never auto-attaches images to a seller-curated product.
-- ============================================================

alter table public.product_images add column if not exists public_url text;
alter table public.products add column if not exists locked_by_seller boolean not null default false;

create index if not exists idx_product_images_primary
  on public.product_images(product_id) where position = 0;

-- Backfill: the existing single-image manual flow set products.image_url to the
-- (only) image's public URL, so seed the position-0 row's public_url from it.
update public.product_images pi
   set public_url = p.image_url
  from public.products p
 where pi.product_id = p.id
   and pi.position = 0
   and pi.public_url is null
   and p.image_url is not null;

-- Mirror the lowest-position image's public_url into products.image_url. Called
-- by the server (service_role) after any image insert / reorder / delete. A
-- product with zero images resolves to image_url = null.
create or replace function public.sync_primary_image(p_product uuid, p_store uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_url text;
begin
  select pi.public_url into v_url
  from public.product_images pi
  where pi.product_id = p_product and pi.store_id = p_store
  order by pi.position asc, pi.created_at asc
  limit 1;
  update public.products set image_url = v_url where id = p_product and store_id = p_store;
end; $$;

-- service_role only (0007 grant hygiene: revoke the default PUBLIC execute too).
revoke execute on function public.sync_primary_image(uuid, uuid) from public, anon, authenticated;
