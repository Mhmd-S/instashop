-- ============================================================
-- 0005 — Instagram token at rest via Supabase Vault
-- ig_accounts stores only the secret UUID (access_token_secret_id); the token
-- itself lives encrypted in vault.secrets. These SECURITY DEFINER wrappers expose
-- create/read/update to the server (service-role only) since the vault schema
-- isn't reachable via PostgREST directly.
-- ============================================================
create or replace function public.ig_store_token(p_secret text, p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select vault.create_secret(p_secret, p_name, 'Instagram access token') into v_id;
  return v_id;
end; $$;

create or replace function public.ig_read_token(p_secret_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  select decrypted_secret into v from vault.decrypted_secrets where id = p_secret_id;
  return v;
end; $$;

create or replace function public.ig_update_token(p_secret_id uuid, p_secret text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform vault.update_secret(p_secret_id, p_secret);
end; $$;

revoke all on function public.ig_store_token(text, text) from anon, authenticated;
revoke all on function public.ig_read_token(uuid)        from anon, authenticated;
revoke all on function public.ig_update_token(uuid, text) from anon, authenticated;
