-- 0011 — product-generation refinements (descriptions + images)
--
-- The IG importer now (a) generates clean merchandised descriptions instead of
-- dumping the raw caption, and (b) analyzes every carousel frame to pick a hero
-- image, write alt text, and de-duplicate near-identical photos across merged
-- posts. These columns let the per-post analysis cache (ig_analysis) carry that
-- extra signal across re-syncs, and give product_images a perceptual hash so a
-- merge run can avoid re-attaching a duplicate of an image the product already has.

-- Cached, cleaned description so a cache-hit post keeps its AI copy on re-sync.
alter table public.ig_analysis add column if not exists description text;

-- Hero frame + per-frame alt text, both keyed in imageUnits() index space.
-- image_alts is a { "<unitIndex>": "alt" } map.
alter table public.ig_analysis add column if not exists hero_unit_index integer;
alter table public.ig_analysis add column if not exists image_alts jsonb not null default '{}'::jsonb;

-- 64-bit average hash (16 hex chars) of the stored image, for near-duplicate
-- detection when appending images to an existing product during a merge.
alter table public.product_images add column if not exists phash text;
