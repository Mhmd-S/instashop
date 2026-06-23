-- ============================================================
-- 0013 — Stripe Connect (Express) connected accounts (M6 — onboarding half)
-- One connected account per store (mirrors ig_accounts). We store ONLY the
-- connected-account id (acct_…), never a secret: destination charges run on the
-- PLATFORM account, so the platform secret key is all the server ever needs.
-- Per-store application fee in basis points (null ⇒ platform default).
-- ============================================================
create table public.stripe_accounts (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references public.stores(id) on delete cascade,
  stripe_account_id text not null,                 -- acct_… (NOT a secret)
  details_submitted boolean not null default false,
  charges_enabled   boolean not null default false,
  payouts_enabled   boolean not null default false,
  platform_fee_bps  int check (platform_fee_bps is null
                               or (platform_fee_bps >= 0 and platform_fee_bps <= 10000)),
  requirements      jsonb,                         -- last account.requirements snapshot
  connected_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (store_id),                               -- v1: one Stripe account per store
  unique (stripe_account_id)
);
create index idx_stripe_accounts_acct on public.stripe_accounts (stripe_account_id);

create trigger t_stripe_accounts_updated
  before update on public.stripe_accounts
  for each row execute function app.touch_updated_at();

-- Admin-only read (mirrors ig_accounts); all writes are service-role only.
alter table public.stripe_accounts enable row level security;
create policy "stripe: admin read" on public.stripe_accounts for select to authenticated
  using ( app.has_store_access(store_id,'admin') or app.is_superadmin() );

-- Defense in depth: 0000's default privileges grant select to anon on future
-- tables — keep anon out at the grant level too (RLS already blocks it).
revoke all on public.stripe_accounts from anon;
