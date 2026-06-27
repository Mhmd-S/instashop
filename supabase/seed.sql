-- Local seed — applied by `supabase db reset`. DEV-ONLY credentials.
-- Login (M1+): seller@acme.test / admin@insteshop.test  ·  password: password123

-- ---- Users (auth.users; app.handle_new_user() creates the matching profiles) ----
-- NOTE: the token columns must be '' (not NULL) or GoTrue fails to scan the row.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change,
  email_change_token_new, phone_change, phone_change_token, reauthentication_token
) values
  ('00000000-0000-0000-0000-000000000000',
   '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'seller@acme.test',
   crypt('password123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Acme Seller"}'::jsonb,
   '', '', '', '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000',
   '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'admin@insteshop.test',
   crypt('password123', gen_salt('bf')),
   now(), now(), now(),
   '{"provider":"email","providers":["email"]}'::jsonb,
   '{"full_name":"Platform Admin"}'::jsonb,
   '', '', '', '', '', '', '')
on conflict (id) do nothing;

-- Superadmin global_role. The guard trigger blocks this without a service-role JWT,
-- so disable it just for the seed.
alter table public.profiles disable trigger trg_guard_profile_role;
update public.profiles set global_role = 'superadmin'
  where id = '22222222-2222-2222-2222-222222222222';
alter table public.profiles enable trigger trg_guard_profile_role;

-- ---- Store (owner membership added by trigger) ----
insert into public.stores (id, owner_id, subdomain, name, status, base_currency, default_country)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'acme', 'Acme Goods', 'active', 'USD', 'US'
) on conflict (id) do nothing;

-- ---- Products (published, visible on the storefront) ----
insert into public.products (store_id, source, published, title, slug, description, price_minor, currency, position)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','manual',true,'Hand-thrown Mug','hand-thrown-mug','A cozy ceramic mug, glazed by hand.',2400,'USD',0),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','manual',true,'Linen Apron','linen-apron','Natural stonewashed linen, one size.',4200,'USD',1)
on conflict (store_id, slug) do nothing;

-- ---- Active theme (version 1) ----
insert into public.themes (id, store_id, version, tokens, generated_at)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  1,
  '{"palette":{"primary":"#B5563A","secondary":"#2F3A36","accent":"#E0A458","bg":"#FAF6F0","fg":"#22201D","muted":"#6B6258","card":"#FFFFFF","border":"#E7DFD4","neutral":{"50":"#FAFAF9","100":"#F2F0EC","200":"#E5E1DA","300":"#D2CCC0","400":"#A89F90","500":"#807868","600":"#615A4E","700":"#494339","800":"#332F28","900":"#211E1A","950":"#15130F"},"onPrimary":"#FFFFFF","onSecondary":"#FFFFFF","onAccent":"#22201D"},"typography":{"heading":"Fraunces","body":"Karla","feel":"serif","scale":"airy"},"radius":"lg","density":"comfortable","buttonStyle":"soft","shadow":"subtle","mood":["earthy","warm","elegant"],"keywords":["handmade","ceramic","sunlit"]}'::jsonb,
  now()
) on conflict (store_id, version) do nothing;

update public.stores set active_theme_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
