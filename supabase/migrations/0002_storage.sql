-- ============================================================
-- 0002 — storage buckets
-- store-media: product images + (later) re-hosted IG media.
-- Public read (product images are public commerce content); writes go through the
-- server via service-role, which bypasses storage RLS. Draft images live at
-- unguessable UUID paths and are not linked publicly.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('store-media', 'store-media', true)
on conflict (id) do nothing;
