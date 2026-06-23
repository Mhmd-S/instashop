-- 0012 — batched analysis: cluster by a stable product key
--
-- The importer now classifies + groups + writes copy for all new posts in ONE
-- Gemini call (cheaper: one call with small thumbnails instead of N multimodal
-- calls with full-res frames; more accurate: holistic visual+text grouping).
-- Each post is assigned a `product_key` — a stable slug for the exact item — and
-- posts sharing a key merge into one product. Stored per-post so re-syncs reuse it
-- (no re-call) and a new post can join an existing product with the same key.

alter table public.ig_analysis add column if not exists product_key text;

create index if not exists idx_ig_analysis_product_key
  on public.ig_analysis(store_id, product_key) where product_key is not null;
