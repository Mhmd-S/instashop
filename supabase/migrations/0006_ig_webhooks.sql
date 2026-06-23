-- ============================================================
-- 0006 — Instagram webhooks: Vault secret cleanup + data-deletion tracking
-- Adds the missing half of the token lifecycle (delete) and a public-status
-- record for Meta-mandated data-deletion requests so the confirmation URL keeps
-- working after the ig_accounts row is gone.
-- ============================================================

-- Vault: hard-delete a stored token (used on disconnect / deauthorize / deletion).
create or replace function public.ig_delete_token(p_secret_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from vault.secrets where id = p_secret_id;
end; $$;

revoke all on function public.ig_delete_token(uuid) from anon, authenticated;

-- Tracks Meta data-deletion requests. We return { url, confirmation_code } to
-- Meta; the user (or Meta's review) can poll the status URL by code. Kept even
-- after the ig_account is purged, so it outlives the cascade.
create table if not exists public.ig_deletion_requests (
  confirmation_code text primary key,
  ig_user_id        text not null,
  store_id          uuid references public.stores(id) on delete set null,
  status            text not null default 'completed'
                      check (status in ('received','processing','completed')),
  detail            text,
  requested_at      timestamptz not null default now(),
  completed_at      timestamptz
);
create index if not exists idx_ig_deletion_requests_user on public.ig_deletion_requests (ig_user_id);

-- Locked down: no anon/authenticated policies. Reachable only via the service
-- role (the public status endpoint reads it server-side and exposes a redacted view).
alter table public.ig_deletion_requests enable row level security;
revoke all on table public.ig_deletion_requests from anon, authenticated;
