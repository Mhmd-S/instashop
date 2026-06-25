-- 0020 — Platform commission becomes a single global, superadmin-managed value.
-- Singleton settings table (one row, id=1). Service-role only: the superadmin API
-- uses supabaseAdmin; sellers must never read or write it. Drops the per-store
-- override that was (incorrectly) seller-editable.
create table public.platform_settings (
  id          smallint primary key default 1 check (id = 1),
  fee_bps     int not null default 0 check (fee_bps >= 0 and fee_bps <= 10000),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

insert into public.platform_settings (id, fee_bps) values (1, 0)
  on conflict (id) do nothing;

alter table public.platform_settings enable row level security;
-- No policies: only service-role (supabaseAdmin) touches this table.

alter table public.stripe_accounts drop column if exists platform_fee_bps;
