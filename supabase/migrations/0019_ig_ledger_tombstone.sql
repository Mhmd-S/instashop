-- ============================================================
-- 0019 — keep the IG import ledger as a tombstone when a product is deleted
--
-- product_ig_posts is the source of truth for "have we already imported this IG
-- post?": the importer's dedup set reads ig_media_id from it (loadMaterializedIds)
-- and skips any post already there. The product_id FK was ON DELETE CASCADE, so
-- deleting a product ALSO erased its ledger rows — and the next IG sync re-imported
-- the very post the seller just deleted ("it keeps popping up").
--
-- Switch to ON DELETE SET NULL: the ledger row survives with product_id = null as a
-- tombstone, so re-syncs keep skipping the post, while it no longer dangles at a
-- deleted product. The importer's product_key merge already ignores null-product_id
-- rows, and the dedup set only cares about ig_media_id.
-- ============================================================

alter table public.product_ig_posts
  drop constraint if exists product_ig_posts_product_id_fkey;

alter table public.product_ig_posts
  alter column product_id drop not null;

alter table public.product_ig_posts
  add constraint product_ig_posts_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;
