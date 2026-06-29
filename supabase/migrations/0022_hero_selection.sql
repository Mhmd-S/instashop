-- ============================================================
-- 0022 — Automatic hero selection
--
-- The storefront hero image is the single biggest "this is a real brand, not a
-- recolour" signal. Until now it was chosen MANUALLY from IG-imported branding
-- posts only (branding_assets.used_as='hero'), so a shop with no good lifestyle
-- post — or no Instagram at all — got no hero. This lets the hero be picked
-- AUTOMATICALLY (AI-scored) from branding posts OR a product photo, while a manual
-- choice stays sticky.
--
--  - ig_media_id becomes nullable so a product photo can back a branding_asset
--    (product-derived hero rows have source='product', no IG origin).
--  - source distinguishes IG-imported assets from product-derived/uploaded ones.
--  - hero_score / hero_reason / hero_scored_at record the AI's pick (shown in the
--    theme editor). The presence of hero_scored_at also marks an AUTO pick vs a
--    MANUAL one, so re-scoring never clobbers a hand-chosen hero, and a provisional
--    product-photo hero can be upgraded once real lifestyle posts arrive.
-- ============================================================

alter table public.branding_assets
  alter column ig_media_id drop not null;

alter table public.branding_assets
  add column if not exists source text not null default 'ig'
    check (source in ('ig', 'product', 'upload')),
  add column if not exists hero_score integer,
  add column if not exists hero_reason text,
  add column if not exists hero_scored_at timestamptz;

-- The existing public-read policy (used_as is not null + active store) already covers
-- product-derived hero rows, and the service-role importer/selector bypasses RLS, so
-- no policy changes are needed.
