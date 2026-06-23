-- ============================================================
-- 0001 — Custom Access Token Hook (H9)
-- Injects public.profiles.global_role into the JWT as
-- claims.app_metadata.global_role, so app.is_superadmin() + RLS can read it.
-- Configured in supabase/config.toml [auth.hook.custom_access_token].
-- ============================================================
create or replace function app.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_role   public.global_role;
  v_claims jsonb;
begin
  select global_role into v_role from public.profiles where id = (event->>'user_id')::uuid;

  v_claims := coalesce(event -> 'claims', '{}'::jsonb);
  if not (v_claims ? 'app_metadata') then
    v_claims := jsonb_set(v_claims, '{app_metadata}', '{}'::jsonb);
  end if;
  v_claims := jsonb_set(v_claims, '{app_metadata,global_role}', to_jsonb(coalesce(v_role, 'user')::text));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- GoTrue runs auth hooks as the supabase_auth_admin role.
grant usage   on schema app                                  to supabase_auth_admin;
grant execute on function app.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function app.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- The hook (SECURITY INVOKER) reads profiles as supabase_auth_admin, so it needs
-- SELECT + an RLS policy permitting that role (Supabase's documented pattern).
grant select on public.profiles to supabase_auth_admin;
create policy "auth_admin: read profiles for token hook"
  on public.profiles for select to supabase_auth_admin using (true);
