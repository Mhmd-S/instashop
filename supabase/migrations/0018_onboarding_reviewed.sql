-- ============================================================
-- 0018 — Onboarding review acknowledgements
-- The Instagram import auto-fills theme, products and branding; the wizard now
-- makes the seller explicitly review each inline before it counts as complete.
-- This jsonb map records which steps were acknowledged, e.g.
-- {"theme":true,"products":true,"branding":true}. Read by setup-status (admin/staff),
-- written only server-side. Not used by the storefront, so it stays out of the
-- tenant store cache (STORE_FIELDS).
-- ============================================================
alter table public.stores add column if not exists onboarding_reviewed jsonb not null default '{}'::jsonb;
