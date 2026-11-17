-- Row Level Security tests for CoreSpec: profiles, builds and the account/admin
-- functions (Phase 16a), then the catalogue, listings, settings and the audit
-- log (Phase 16b), then deleting items (20261115000100_item_delete.sql), then
-- orders and the checkout simulation (20261117000100_orders.sql), then the live
-- chat (20261118000100_chat.sql).
--
-- How to run: Supabase dashboard → SQL Editor → paste this whole file → Run.
-- It creates three throwaway accounts, acts as anon, as each of them and as an
-- admin, and checks who can read and write what. Everything runs inside one
-- transaction that is rolled back at the end, so nothing is left behind.
--
-- Pass: the last result says "All RLS tests passed".
-- Fail: it stops at the first failed check and names it ("FAIL: …" or an
-- "assertion failed" message).
--
-- The same file also runs in the unit tests (supabase/rls.test.ts) against a
-- local Postgres with a stand-in for Supabase's auth schema: once on an empty
-- database and once on one that already has accounts, an admin and builds.
--
-- Safe on a project in use: it only counts its own throwaway accounts
-- (rls-*@example.test), or compares totals with what the project had before
-- it started. One check needs this to be the only admin; on a project with
-- other admins it is skipped with a notice (the unit tests still run it).

begin;

-- What the project already has, so the totals below can be checked as
-- differences. Kept as settings for this transaction (any role can read them).
select
  set_config('rls.base_users', (select count(*) from public.profiles)::text, true),
  set_config('rls.base_admins',
    (select count(*) from public.profiles where role = 'admin')::text, true),
  set_config('rls.base_builds',
    (select count(*) from public.builds where deleted_at is null)::text, true);

-- ---------------------------------------------------------------------------
-- Fixtures, as the database owner: alice and bob are users, carol is the admin.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'rls-alice@example.test',
    jsonb_build_object('display_name', E'  Alice \t Smith  ', 'role', 'admin')),
  ('00000000-0000-4000-8000-00000000000b', 'rls-bob@example.test',
    jsonb_build_object('display_name', repeat('b', 80))),
  ('00000000-0000-4000-8000-00000000000c', 'rls-carol@example.test',
    '{}'::jsonb);

-- The real first admin is made the same way (see docs/accounts.md).
update public.profiles set role = 'admin'
where id = '00000000-0000-4000-8000-00000000000c';

insert into public.builds (owner, id, name, parts) values
  ('00000000-0000-4000-8000-00000000000b', 'bob-1', 'Bob''s build',
    '{"cpu": "cpu-amd-ryzen-5-7600"}');

-- ---------------------------------------------------------------------------
-- Sign-up trigger
-- ---------------------------------------------------------------------------

do $$
begin
  assert (select display_name from public.profiles
          where id = '00000000-0000-4000-8000-00000000000a') = 'Alice Smith',
    'FAIL: sign-up trims the display name and collapses spaces';
  assert (select char_length(display_name) from public.profiles
          where id = '00000000-0000-4000-8000-00000000000b') = 50,
    'FAIL: sign-up caps the display name at 50 characters';
  assert (select display_name from public.profiles
          where id = '00000000-0000-4000-8000-00000000000c') = 'rls-carol',
    'FAIL: an empty display name falls back to the email name';
  assert (select role from public.profiles
          where id = '00000000-0000-4000-8000-00000000000a') = 'user',
    'FAIL: sign-up always sets role = user, even when the form sends "admin"';
end;
$$;

-- ---------------------------------------------------------------------------
-- anon (not signed in)
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
begin
  begin
    perform public.set_role('00000000-0000-4000-8000-00000000000a', 'admin');
    raise exception 'FAIL: anon calls set_role';
  exception when insufficient_privilege then
    -- Blocked by the grant itself, not only by the check inside the function.
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls set_role (reached the function: %)', sqlerrm;
    end if;
  end;

  begin
    perform public.delete_my_account();
    raise exception 'FAIL: anon calls delete_my_account';
  exception when insufficient_privilege then
    -- Blocked by the grant itself, not only by the check inside the function.
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls delete_my_account (reached the function: %)', sqlerrm;
    end if;
  end;

  begin
    perform public.admin_stats();
    raise exception 'FAIL: anon calls admin_stats';
  exception when insufficient_privilege then
    -- Blocked by the grant itself, not only by the check inside the function.
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls admin_stats (reached the function: %)', sqlerrm;
    end if;
  end;

  begin
    perform public.admin_list_users();
    raise exception 'FAIL: anon calls admin_list_users';
  exception when insufficient_privilege then
    -- Blocked by the grant itself, not only by the check inside the function.
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls admin_list_users (reached the function: %)', sqlerrm;
    end if;
  end;

  begin
    perform public.is_admin();
    raise exception 'FAIL: anon calls is_admin';
  exception when insufficient_privilege then
    -- Blocked by the grant itself, not only by the check inside the function.
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls is_admin (reached the function: %)', sqlerrm;
    end if;
  end;

  begin
    perform 1 from public.profiles;
    raise exception 'FAIL: anon reads profiles';
  exception when insufficient_privilege then null;
  end;

  begin
    perform 1 from public.builds;
    raise exception 'FAIL: anon reads builds';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.builds (owner, id, name)
    values ('00000000-0000-4000-8000-00000000000b', 'anon-1', 'x');
    raise exception 'FAIL: anon writes a build';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- alice (a user)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

do $$
declare
  n integer;
  r record;
begin
  -- Profiles: her own row only.
  assert (select count(*) from public.profiles) = 1,
    'FAIL: a user reads only their own profile';
  assert not public.is_admin(), 'FAIL: is_admin() is false for a user';

  update public.profiles set display_name = 'Alice'
  where id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: a user changes their own display name';

  update public.profiles set display_name = 'Hacked'
  where id = '00000000-0000-4000-8000-00000000000b';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: a user changes someone else''s display name';

  begin
    update public.profiles set role = 'admin'
    where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: user tries to set own role to admin';
  exception when insufficient_privilege then null;
  end;

  begin
    update public.profiles set id = gen_random_uuid()
    where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: a user changes their profile id';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.set_role('00000000-0000-4000-8000-00000000000a', 'admin');
    raise exception 'FAIL: a user promotes themselves with set_role';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.set_role('00000000-0000-4000-8000-00000000000c', 'user');
    raise exception 'FAIL: a user demotes the admin with set_role';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_stats();
    raise exception 'FAIL: a user calls admin_stats';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.admin_list_users();
    raise exception 'FAIL: a user calls admin_list_users';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.profiles (id, display_name)
    values (gen_random_uuid(), 'Fake');
    raise exception 'FAIL: a user inserts a profile';
  exception when insufficient_privilege then null;
  end;

  -- Builds: someone else's are invisible and untouchable.
  assert (select count(*) from public.builds
          where owner = '00000000-0000-4000-8000-00000000000b') = 0,
    'FAIL: user reads another user''s build → expected 0 rows';

  update public.builds set name = 'Mine now' where id = 'bob-1';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: a user updates another user''s build';

  begin
    insert into public.builds (owner, id, name)
    values ('00000000-0000-4000-8000-00000000000b', 'planted', 'x');
    raise exception 'FAIL: a user writes a build into another account';
  exception when insufficient_privilege then null;
  end;

  -- Her own builds: insert (owner defaults to her), read, update.
  insert into public.builds (id, name, parts)
  values ('alice-1', 'First', '{"cpu": "cpu-amd-ryzen-5-7600"}');
  assert (select count(*) from public.builds) = 1,
    'FAIL: a user reads their own build';

  begin
    update public.builds set owner = '00000000-0000-4000-8000-00000000000b'
    where id = 'alice-1';
    -- The trigger keeps the owner, so this is a no-op rather than a move.
    assert (select owner from public.builds where id = 'alice-1')
      = '00000000-0000-4000-8000-00000000000a',
      'FAIL: a user moves a build to another account';
  exception when insufficient_privilege then null;
  end;

  begin
    delete from public.builds where id = 'alice-1';
    raise exception 'FAIL: a build row is deleted (tombstones only)';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.builds (id, name, parts)
    values ('alice-bad', 'Bad', '{"cpu": 42}');
    raise exception 'FAIL: parts must be {category: "item id"}';
  exception when check_violation then null;
  end;

  begin
    insert into public.builds (id, name) values ('alice-noname', '');
    raise exception 'FAIL: a build needs a name';
  exception when check_violation then null;
  end;

  -- A clock far in the future can't win every merge.
  update public.builds set updated_at = now() + interval '10 years'
  where id = 'alice-1';
  assert (select updated_at from public.builds where id = 'alice-1')
    <= now() + interval '5 minutes',
    'FAIL: updated_at is capped at 5 minutes ahead';

  -- Tombstones: deleting wipes the content, and a stale upsert can't revive it.
  update public.builds set deleted_at = now() where id = 'alice-1';
  select name, parts, deleted_at into r from public.builds where id = 'alice-1';
  assert r.deleted_at is not null and r.name = 'Deleted build' and r.parts = '{}'::jsonb,
    'FAIL: a tombstone keeps no name or parts';

  insert into public.builds (id, name, parts, updated_at, deleted_at)
  values ('alice-1', 'First', '{"cpu": "cpu-amd-ryzen-5-7600"}', now(), null)
  on conflict (owner, id) do update
    set name = excluded.name, parts = excluded.parts,
        updated_at = excluded.updated_at, deleted_at = excluded.deleted_at;
  assert (select deleted_at from public.builds where id = 'alice-1') is not null,
    'FAIL: a deleted build is re-uploaded from a stale browser';

  -- At most 200 live builds per account; tombstones don't count.
  insert into public.builds (id, name)
  select 'bulk-' || g, 'Bulk ' || g from generate_series(1, 200) g;
  begin
    insert into public.builds (id, name) values ('bulk-201', 'One too many');
    raise exception 'FAIL: an account keeps more than 200 builds';
  exception when raise_exception then
    -- Our own FAIL is a raise_exception too: let it through.
    if sqlerrm like 'FAIL:%' then raise; end if;
  end;
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- carol (the admin)
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}', true);

do $$
declare
  s record;
begin
  assert public.is_admin(), 'FAIL: is_admin() is true for an admin';
  -- Every profile: the 3 test accounts, and every account the project had.
  assert (select count(*) from public.profiles
          where id in ('00000000-0000-4000-8000-00000000000a',
                       '00000000-0000-4000-8000-00000000000b',
                       '00000000-0000-4000-8000-00000000000c')) = 3
    and (select count(*) from public.profiles)
        = current_setting('rls.base_users')::int + 3,
    'FAIL: an admin reads every profile';

  -- The test added 3 accounts, 1 admin (carol) and 201 live builds (bob's 1,
  -- alice's 200; her deleted one doesn't count).
  select * into s from public.admin_stats();
  assert s.user_count = current_setting('rls.base_users')::int + 3
    and s.admin_count = current_setting('rls.base_admins')::int + 1
    and s.build_count = current_setting('rls.base_builds')::int + 201,
    'FAIL: admin_stats counts users, admins and live builds';
  assert (select count(*) from public.admin_list_users()
          where email like 'rls-%@example.test') = 3,
    'FAIL: admin_list_users lists every account with its email';

  -- Admins see counts, never other people's builds.
  assert (select count(*) from public.builds) = 0,
    'FAIL: an admin reads other people''s builds';

  -- Even an admin can't edit roles directly; only through set_role().
  begin
    update public.profiles set role = 'user'
    where id = '00000000-0000-4000-8000-00000000000a';
    raise exception 'FAIL: an admin updates profiles.role directly';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.set_role('00000000-0000-4000-8000-00000000000c', 'user');
    raise exception 'FAIL: an admin changes their own role';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.set_role('00000000-0000-4000-8000-00000000000b', 'owner');
    raise exception 'FAIL: set_role accepts an unknown role';
  exception when invalid_parameter_value then null;
  end;

  -- Only meaningful when carol is the only admin. With other admins she isn't
  -- the last one, and the call would really delete her (until the rollback).
  if current_setting('rls.base_admins')::int = 0 then
    begin
      perform public.delete_my_account();
      raise exception 'FAIL: the last admin deletes their account';
    exception when raise_exception then
      if sqlerrm like 'FAIL:%' then raise; end if;
    end;
  else
    raise notice 'Skipped "the last admin can''t delete their account": this project has other admins. The unit tests check it.';
  end if;

  perform public.set_role('00000000-0000-4000-8000-00000000000b', 'admin');
  assert (select role from public.profiles
          where id = '00000000-0000-4000-8000-00000000000b') = 'admin',
    'FAIL: an admin promotes a user';
  perform public.set_role('00000000-0000-4000-8000-00000000000b', 'user');
  assert (select role from public.profiles
          where id = '00000000-0000-4000-8000-00000000000b') = 'user',
    'FAIL: an admin demotes another admin';
end;
$$;

reset role;

-- ===========================================================================
-- Phase 16b: items, listings, site settings, audit log
-- ===========================================================================

-- Fixtures, as the database owner: one active and one inactive item, and a
-- listing on the inactive one.
insert into public.items (id, category, brand, name, tier, price_idr, dims, specs, active) values
  ('cpu-rls-active', 'cpu', 'RLS', 'Active CPU', 'mid', 2000000,
    '{"l": 40, "w": 40, "h": 7}',
    '{"anchor": "cpu", "socket": "AM5", "cores": 6, "threads": 12, "tdpW": 65}', true),
  ('cpu-rls-inactive', 'cpu', 'RLS', 'Inactive CPU', 'mid', 2000000,
    '{"l": 40, "w": 40, "h": 7}',
    '{"anchor": "cpu", "socket": "AM5", "cores": 6, "threads": 12, "tdpW": 65}', false);
insert into public.listings (item_id, marketplace, url, price_idr, checked_at) values
  ('cpu-rls-inactive', 'shopee', 'https://shopee.co.id/rls-test-i.1.2', 1900000, current_date - 1);

-- anon: reads everything, writes nothing.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
begin
  assert (select count(*) from public.items where id like 'cpu-rls-%') = 2,
    'FAIL: anon reads all items, active and inactive';
  assert (select count(*) from public.listings where item_id = 'cpu-rls-inactive') = 1,
    'FAIL: anon reads listings (also of an inactive item)';
  perform 1 from public.site_settings;

  begin
    insert into public.items (id, category, brand, name, tier, price_idr, specs)
    values ('cpu-anon', 'cpu', 'X', 'X', 'mid', 1, '{}');
    raise exception 'FAIL: non-admin writes an item or listing (anon inserts an item)';
  exception when insufficient_privilege then
    -- Refused by the table grant itself, not by something further down.
    if sqlerrm not like 'permission denied for table%' then
      raise exception 'FAIL: non-admin writes an item or listing (anon inserts an item: %)', sqlerrm;
    end if;
  end;
  begin
    update public.items set price_idr = 1 where id = 'cpu-rls-active';
    raise exception 'FAIL: non-admin writes an item or listing (anon updates an item)';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.items where id = 'cpu-rls-active';
    raise exception 'FAIL: non-admin writes an item or listing (anon deletes an item)';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'shopee', 'https://shopee.co.id/anon', 1, current_date);
    raise exception 'FAIL: non-admin writes an item or listing (anon inserts a listing)';
  exception when insufficient_privilege then
    -- Refused by the table grant itself, not by something further down.
    if sqlerrm not like 'permission denied for table%' then
      raise exception 'FAIL: non-admin writes an item or listing (anon inserts a listing: %)', sqlerrm;
    end if;
  end;
  begin
    update public.listings set price_idr = 1;
    raise exception 'FAIL: non-admin writes an item or listing (anon updates a listing)';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.listings;
    raise exception 'FAIL: non-admin writes an item or listing (anon deletes a listing)';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.site_settings (key, value) values ('estimates_as_of', '"2026-01-01"');
    raise exception 'FAIL: anon writes a site setting';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.audit_log;
    raise exception 'FAIL: anon reads the audit log';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- alice (a user): reads everything, writes nothing, can't see the audit log.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

do $$
declare
  n integer;
begin
  assert (select count(*) from public.items where id like 'cpu-rls-%') = 2,
    'FAIL: a user reads all items, active and inactive';
  assert (select count(*) from public.listings where item_id = 'cpu-rls-inactive') = 1,
    'FAIL: a user reads listings';

  begin
    insert into public.items (id, category, brand, name, tier, price_idr, specs)
    values ('cpu-alice', 'cpu', 'X', 'X', 'mid', 1, '{}');
    raise exception 'FAIL: non-admin writes an item or listing (user inserts an item)';
  exception when insufficient_privilege then null;
  end;

  update public.items set price_idr = 1 where id = 'cpu-rls-active';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: non-admin writes an item or listing (user updates an item)';

  delete from public.items where id = 'cpu-rls-active';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: non-admin writes an item or listing (user deletes an item)';

  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'shopee', 'https://shopee.co.id/alice', 1, current_date);
    raise exception 'FAIL: non-admin writes an item or listing (user inserts a listing)';
  exception when insufficient_privilege then null;
  end;

  update public.listings set price_idr = 1 where item_id = 'cpu-rls-inactive';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: non-admin writes an item or listing (user updates a listing)';

  delete from public.listings where item_id = 'cpu-rls-inactive';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: non-admin writes an item or listing (user deletes a listing)';

  begin
    insert into public.site_settings (key, value) values ('estimates_as_of', '"2026-01-01"');
    raise exception 'FAIL: a user writes a site setting';
  exception when insufficient_privilege then null;
  end;

  assert (select count(*) from public.audit_log) = 0,
    'FAIL: only admins read the audit log (a user read rows)';
  begin
    insert into public.audit_log (action, table_name, row_id) values ('insert', 'items', 'fake');
    raise exception 'FAIL: a user writes to the audit log';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- carol (the admin): edits items and listings; the database still enforces the
-- listing rules; every change lands in the audit log.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}', true);

do $$
declare
  n integer;
  e record;
begin
  -- Items: add, edit, deactivate.
  insert into public.items (id, category, brand, name, tier, price_idr, dims, specs)
  values ('cpu-rls-new', 'cpu', 'RLS', 'New CPU', 'budget', 1500000,
    '{"l": 40, "w": 40, "h": 7}',
    '{"anchor": "cpu", "socket": "AM4", "cores": 6, "threads": 12, "tdpW": 65}');
  update public.items set price_idr = 2100000 where id = 'cpu-rls-active';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: an admin edits an item';
  update public.items set active = false where id = 'cpu-rls-new';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: an admin deactivates an item';
  assert (select updated_by from public.items where id = 'cpu-rls-active')
    = '00000000-0000-4000-8000-00000000000c',
    'FAIL: updated_by is the admin who saved it';

  begin
    insert into public.items (id, category, brand, name, tier, price_idr, specs)
    values ('gpu-wrong-prefix', 'cpu', 'X', 'X', 'mid', 1, '{}');
    raise exception 'FAIL: an item id must start with its category';
  exception when check_violation then null;
  end;
  begin
    update public.items set price_idr = 0 where id = 'cpu-rls-active';
    raise exception 'FAIL: an estimate must be above 0';
  exception when check_violation then null;
  end;

  -- Listings: add, edit ("mark checked today"), delete.
  insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
  values ('cpu-rls-active', 'tokopedia', 'https://www.tokopedia.com/shop/rls-cpu', 1990000,
    (now() at time zone 'Asia/Jakarta')::date);
  update public.listings set checked_at = (now() at time zone 'Asia/Jakarta')::date, price_idr = 1950000
  where item_id = 'cpu-rls-inactive';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: an admin edits a listing';
  delete from public.listings where item_id = 'cpu-rls-inactive';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: an admin deletes a listing';

  -- The prices:apply rules, as database checks, even for an admin.
  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'shopee', 'http://shopee.co.id/plain-http', 1, current_date - 1);
    raise exception 'FAIL: a listing link must be https';
  exception when check_violation then null;
  end;
  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'shopee', 'https://shopee.example.com/x', 1, current_date - 1);
    raise exception 'FAIL: a listing link must be on a marketplace domain';
  exception when check_violation then null;
  end;
  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'blibli', 'https://shopee.co.id/x', 1, current_date - 1);
    raise exception 'FAIL: a listing link must be on its own marketplace';
  exception when check_violation then null;
  end;
  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'shopee', 'https://evil.example@shopee.co.id/x', 1, current_date - 1);
    raise exception 'FAIL: a listing link can''t hide another host before an @';
  exception when check_violation then null;
  end;
  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'lazada', 'https://www.lazada.co.id/x', 1, current_date - 1);
    raise exception 'FAIL: only the 3 marketplaces';
  exception when check_violation then null;
  end;
  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'shopee', 'https://shopee.co.id/zero', 0, current_date - 1);
    raise exception 'FAIL: a listing price must be above 0';
  exception when check_violation then null;
  end;
  begin
    -- How a non-whole number arrives from the website (JSON → text → integer).
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'shopee', 'https://shopee.co.id/half', '1500.5', current_date - 1);
    raise exception 'FAIL: a listing price must be a whole number of rupiah';
  exception when invalid_text_representation then null;
  end;
  begin
    insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
    values ('cpu-rls-active', 'shopee', 'https://shopee.co.id/future', 1,
      (now() at time zone 'Asia/Jakarta')::date + 1);
    raise exception 'FAIL: a listing can''t be checked in the future';
  exception when check_violation then null;
  end;

  -- Settings.
  insert into public.site_settings (key, value) values ('estimates_as_of', '"2026-11-01"')
  on conflict (key) do update set value = excluded.value;
  assert (select value #>> '{}' from public.site_settings where key = 'estimates_as_of') = '2026-11-01',
    'FAIL: an admin sets "estimates as of"';

  -- The audit log: every change above, by carol, readable by her.
  assert (select count(*) from public.audit_log
          where actor = '00000000-0000-4000-8000-00000000000c'
            and table_name in ('items', 'listings', 'site_settings')) >= 7,
    'FAIL: audit_log rows are written for item, listing and setting changes';
  select * into e from public.audit_log
  where table_name = 'items' and row_id = 'cpu-rls-active' and action = 'update'
  order by id desc limit 1;
  assert e.actor = '00000000-0000-4000-8000-00000000000c'
    and (e.diff -> 'price_idr' ->> 'old')::int = 2000000
    and (e.diff -> 'price_idr' ->> 'new')::int = 2100000
    and not (e.diff ? 'brand'),
    'FAIL: an update is logged with only the fields that changed';
  assert exists (select 1 from public.audit_log
                 where table_name = 'listings' and action = 'delete'
                   and row_id like 'cpu-rls-inactive · %'),
    'FAIL: a deleted listing is logged';
  assert exists (select 1 from public.audit_log
                 where table_name = 'profiles' and action = 'update'
                   and row_id = '00000000-0000-4000-8000-00000000000b'
                   and diff -> 'role' ->> 'new' = 'admin'),
    'FAIL: role changes are logged';

  -- Nobody edits the log, admins included.
  begin
    update public.audit_log set actor = null;
    raise exception 'FAIL: an admin edits the audit log';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.audit_log;
    raise exception 'FAIL: an admin deletes from the audit log';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.audit_log (action, table_name, row_id) values ('insert', 'items', 'fake');
    raise exception 'FAIL: an admin writes to the audit log';
  exception when insufficient_privilege then null;
  end;

  -- A deactivated item is still readable (old share links).
  assert (select count(*) from public.items where id = 'cpu-rls-new' and not active) = 1,
    'FAIL: a deactivated item can still be read';
end;
$$;

reset role;

-- ===========================================================================
-- Deleting items (20261115000100_item_delete.sql)
-- ===========================================================================

-- Fixtures, as the database owner: an item one of bob's builds uses, and a
-- free item with a listing that only a deleted build (a tombstone) used.
-- (bob, not alice: alice's account is full from the build-limit check.)
insert into public.items (id, category, brand, name, tier, price_idr, dims, specs) values
  ('cpu-rls-used', 'cpu', 'RLS', 'Used CPU', 'mid', 2000000,
    '{"l": 40, "w": 40, "h": 7}',
    '{"anchor": "cpu", "socket": "AM5", "cores": 6, "threads": 12, "tdpW": 65}'),
  ('cpu-rls-free', 'cpu', 'RLS', 'Free CPU', 'budget', 1800000,
    '{"l": 40, "w": 40, "h": 7}',
    '{"anchor": "cpu", "socket": "AM4", "cores": 6, "threads": 12, "tdpW": 65}');
insert into public.listings (item_id, marketplace, url, price_idr, checked_at) values
  ('cpu-rls-free', 'tokopedia', 'https://www.tokopedia.com/shop/rls-free', 1750000, current_date - 1);
insert into public.builds (owner, id, name, parts) values
  ('00000000-0000-4000-8000-00000000000b', 'bob-uses', 'Uses an RLS CPU',
    '{"cpu": "cpu-rls-used"}'),
  ('00000000-0000-4000-8000-00000000000b', 'bob-tomb', 'Deleted later',
    '{"cpu": "cpu-rls-free"}');
update public.builds set deleted_at = now() where id = 'bob-tomb';

-- anon: can't count usage or delete.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
begin
  begin
    perform public.item_usage_count('cpu-rls-used');
    raise exception 'FAIL: anon calls item_usage_count';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls item_usage_count (reached the function: %)', sqlerrm;
    end if;
  end;
  begin
    delete from public.items where id = 'cpu-rls-free';
    raise exception 'FAIL: anon deletes an item';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- alice (a user): the function refuses her, and a delete touches nothing.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

do $$
declare
  n integer;
begin
  begin
    perform public.item_usage_count('cpu-rls-used');
    raise exception 'FAIL: a user calls item_usage_count';
  exception when insufficient_privilege then null;
  end;
  delete from public.items where id = 'cpu-rls-free';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: a user deletes an item';
  delete from public.listings where item_id = 'cpu-rls-free';
  get diagnostics n = row_count;
  assert n = 0, 'FAIL: a user deletes a listing';
end;
$$;

reset role;

-- carol (the admin): counts usage (a number, nothing else), can't delete an
-- item in use, deletes a free one with its listing, and both are logged.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}', true);

do $$
declare
  n integer;
  e record;
begin
  assert pg_get_function_result('public.item_usage_count(text)'::regprocedure) = 'integer',
    'FAIL: item_usage_count returns a count only';
  assert public.item_usage_count('cpu-rls-used') = 1,
    'FAIL: item_usage_count counts the saved builds that use an item';
  assert public.item_usage_count('cpu-rls-free') = 0,
    'FAIL: item_usage_count ignores deleted builds';
  assert public.item_usage_count('cpu-rls-nope') = 0,
    'FAIL: item_usage_count is 0 for an unknown item';

  begin
    delete from public.items where id = 'cpu-rls-used';
    raise exception 'FAIL: an item a saved build uses can''t be deleted';
  exception when raise_exception then
    if sqlerrm not like '%is used in 1 saved build%' then
      raise exception '%', sqlerrm;
    end if;
  end;
  assert exists (select 1 from public.items where id = 'cpu-rls-used'),
    'FAIL: an item a saved build uses can''t be deleted (it is gone)';

  delete from public.items where id = 'cpu-rls-free';
  get diagnostics n = row_count;
  assert n = 1, 'FAIL: an admin deletes an unused item';
  assert not exists (select 1 from public.listings where item_id = 'cpu-rls-free'),
    'FAIL: deleting an item deletes its listings';

  select * into e from public.audit_log
  where table_name = 'items' and action = 'delete' and row_id = 'cpu-rls-free'
  order by id desc limit 1;
  assert e.actor = '00000000-0000-4000-8000-00000000000c'
    and e.diff ->> 'name' = 'Free CPU'
    and (e.diff ->> 'price_idr')::int = 1800000
    and e.diff -> 'specs' ->> 'socket' = 'AM4',
    'FAIL: a deleted item is logged with its data';
  assert exists (select 1 from public.audit_log
                 where table_name = 'listings' and action = 'delete'
                   and row_id like 'cpu-rls-free · %'),
    'FAIL: the listings deleted with an item are logged';
end;
$$;

reset role;

-- ===========================================================================
-- Orders and the checkout simulation (20261117000100_orders.sql)
-- ===========================================================================

-- As the database owner: start with no hash (the rollback at the end restores
-- the project's own), and keep a one-item price snapshot for the orders below.
update public.payment_config set secret_hash = null where id;

select
  set_config('rls.items', '[{"id": "cpu-amd-ryzen-5-7600", "category": "cpu", "brand": "AMD", "name": "Ryzen 5 7600", "priceIDR": 3000000, "priceKind": "estimate"}]', true);

-- With no hash, everything is refused, even the "right" secret.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
begin
  begin
    perform public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000a',
      'RLS-NOHASH', 'Alice PC', '{"cpu": "cpu-amd-ryzen-5-7600"}',
      current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
    raise exception 'FAIL: create_order works while the hash is null';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_order_payment('rls-order-secret', 'RLS-NOHASH', 'paid', null, null, null);
    raise exception 'FAIL: set_order_payment works while the hash is null';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

update public.payment_config
set secret_hash = encode(sha256(convert_to('rls-order-secret', 'utf8')), 'hex')
where id;

-- anon: reads nothing, writes nothing, and the functions refuse a wrong secret.
-- With the right secret (like the server's notification handler) they work.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
declare
  o public.orders;
  wrong text;
begin
  begin
    perform 1 from public.orders;
    raise exception 'FAIL: anon reads orders';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.orders (order_no, owner, build_name, parts, items, pc_idr, setup_idr, total_idr)
    values ('RLS-ANON', '00000000-0000-4000-8000-00000000000a', 'x', '{}',
      current_setting('rls.items')::jsonb, 1, 0, 1);
    raise exception 'FAIL: anon inserts an order';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.check_order_secret('rls-order-secret');
    raise exception 'FAIL: anon calls check_order_secret';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls check_order_secret (reached the function: %)', sqlerrm;
    end if;
  end;

  foreach wrong in array array['wrong-secret', '', 'RLS-ORDER-SECRET'] loop
    begin
      perform public.create_order(wrong, '00000000-0000-4000-8000-00000000000a',
        'RLS-WRONG', 'Alice PC', '{"cpu": "cpu-amd-ryzen-5-7600"}',
        current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
      raise exception 'FAIL: create_order accepts a wrong secret (%)', wrong;
    exception when insufficient_privilege then null;
    end;
  end loop;
  begin
    perform public.create_order(null, '00000000-0000-4000-8000-00000000000a',
      'RLS-WRONG', 'Alice PC', '{"cpu": "cpu-amd-ryzen-5-7600"}',
      current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
    raise exception 'FAIL: create_order accepts a wrong secret (null)';
  exception when insufficient_privilege then null;
  end;

  o := public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000a',
    'RLS-A-1', 'Alice PC', '{"cpu": "cpu-amd-ryzen-5-7600"}',
    current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
  assert o.status = 'pending' and o.paid_at is null and o.total_idr = 3000000,
    'FAIL: create_order makes a pending order';

  begin
    perform public.set_order_payment('wrong-secret', 'RLS-A-1', 'paid', null, null, null);
    raise exception 'FAIL: set_order_payment accepts a wrong secret';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

do $$
begin
  assert (select status from public.orders where order_no = 'RLS-A-1') = 'pending',
    'FAIL: a refused set_order_payment changes nothing';
end;
$$;

-- bob (a user) gets one order through the function from his own session.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);

do $$
begin
  perform public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000b',
    'RLS-B-1', 'Bob PC', '{"cpu": "cpu-amd-ryzen-5-7600"}',
    current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
  -- Totals must add up.
  begin
    perform public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000b',
      'RLS-B-BAD', 'Bob PC', '{}', current_setting('rls.items')::jsonb, 3000000, 0, 1);
    raise exception 'FAIL: an order whose total isn''t PC + setup is refused';
  exception when check_violation then null;
  end;
end;
$$;

reset role;

-- alice: reads only her own order, and can't write any order directly.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

do $$
begin
  assert (select count(*) from public.orders where order_no = 'RLS-A-1') = 1,
    'FAIL: a user reads her own order';
  assert not exists (select 1 from public.orders
                     where owner <> '00000000-0000-4000-8000-00000000000a'),
    'FAIL: user reads another user''s order';

  begin
    insert into public.orders (order_no, owner, build_name, parts, items, pc_idr, setup_idr, total_idr)
    values ('RLS-A-X', '00000000-0000-4000-8000-00000000000a', 'x', '{}',
      current_setting('rls.items')::jsonb, 1, 0, 1);
    raise exception 'FAIL: a user inserts an order';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.orders set status = 'paid' where order_no = 'RLS-A-1';
    raise exception 'FAIL: a user updates an order';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.orders where order_no = 'RLS-A-1';
    raise exception 'FAIL: a user deletes an order';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- carol (the admin): reads every order, but can't write any directly either.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}', true);

do $$
begin
  assert (select count(*) from public.orders where order_no in ('RLS-A-1', 'RLS-B-1')) = 2,
    'FAIL: an admin reads every order';
  begin
    update public.orders set status = 'paid' where order_no = 'RLS-A-1';
    raise exception 'FAIL: an admin updates an order directly';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.orders where order_no = 'RLS-A-1';
    raise exception 'FAIL: an admin deletes an order directly';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- The status rules, through the function (as anon, like the webhook).
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
declare
  o public.orders;
  first_paid timestamptz;
  n integer;
  s text;
begin
  -- Unknown order: no row, no error.
  select count(*) into n
  from public.set_order_payment('rls-order-secret', 'RLS-NOPE', 'paid', null, null, null);
  assert n = 0, 'FAIL: an unknown order_no returns nothing';

  begin
    perform public.set_order_payment('rls-order-secret', 'RLS-A-1', 'settlement', null, null, null);
    raise exception 'FAIL: an unknown status is refused';
  exception when invalid_parameter_value then null;
  end;

  -- Every value null: the row comes back unchanged.
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-A-1', null, null, null, null);
  assert o.status = 'pending' and o.snap_token is null,
    'FAIL: set_order_payment with nulls reads the order without changing it';

  -- A null argument leaves its column alone.
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-A-1', null, null, null, 'tok-1');
  assert o.snap_token = 'tok-1' and o.status = 'pending',
    'FAIL: set_order_payment stores the snap token alone';
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-A-1', 'pending', 'qris', 'T-1', null);
  assert o.snap_token = 'tok-1' and o.payment_type = 'qris' and o.midtrans_transaction_id = 'T-1',
    'FAIL: a null argument leaves its column alone';

  -- pending never replaces another status.
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-A-1', 'expired', null, null, null);
  assert o.status = 'expired', 'FAIL: pending → expired';
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-A-1', 'pending', 'gopay', null, null);
  assert o.status = 'expired' and o.payment_type = 'qris',
    'FAIL: pending never replaces another status';

  -- paid replaces anything but itself, and sets paid_at once.
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-A-1', 'paid', 'credit_card', 'T-2', null);
  assert o.status = 'paid' and o.paid_at is not null
    and o.payment_type = 'credit_card' and o.midtrans_transaction_id = 'T-2',
    'FAIL: expired → paid sets paid_at and the payment details';
  first_paid := o.paid_at;

  -- paid is final: nothing replaces it, and the losing details are ignored.
  foreach s in array array['failed', 'expired', 'cancelled', 'pending'] loop
    select * into o from public.set_order_payment('rls-order-secret', 'RLS-A-1', s, 'bank_transfer', 'T-9', null);
    assert o.status = 'paid' and o.payment_type = 'credit_card' and o.midtrans_transaction_id = 'T-2',
      format('FAIL: %s never replaces paid', s);
  end loop;

  -- A duplicate paid notification keeps the first paid_at.
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-A-1', 'paid', null, null, null);
  assert o.status = 'paid' and o.paid_at = first_paid,
    'FAIL: paid_at is set once';

  -- failed / cancelled replace pending and each other.
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-B-1', 'failed', null, null, null);
  assert o.status = 'failed', 'FAIL: pending → failed';
  select * into o from public.set_order_payment('rls-order-secret', 'RLS-B-1', 'cancelled', null, null, null);
  assert o.status = 'cancelled' and o.paid_at is null, 'FAIL: failed → cancelled';
end;
$$;

reset role;

-- The spam cap: at most 5 pending orders started in the last hour per account.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
declare
  i integer;
begin
  for i in 1..5 loop
    perform public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000b',
      'RLS-CAP-' || i, 'Bob PC', '{}', current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
  end loop;
  begin
    perform public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000b',
      'RLS-CAP-6', 'Bob PC', '{}', current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
    raise exception 'FAIL: a sixth pending order in an hour is refused';
  exception when raise_exception then
    if sqlerrm not like 'Too many unpaid orders%' then
      raise exception '%', sqlerrm;
    end if;
  end;
  -- Another account isn't affected.
  perform public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000a',
    'RLS-A-2', 'Alice PC', '{}', current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
  -- Once one of them is no longer pending, there's room again.
  perform public.set_order_payment('rls-order-secret', 'RLS-CAP-1', 'expired', null, null, null);
  perform public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000b',
    'RLS-CAP-6', 'Bob PC', '{}', current_setting('rls.items')::jsonb, 3000000, 0, 3000000);
end;
$$;

reset role;

-- Pending orders older than an hour don't count.
update public.orders set created_at = now() - interval '61 minutes'
where order_no like 'RLS-CAP-%';

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select public.create_order('rls-order-secret', '00000000-0000-4000-8000-00000000000b',
  'RLS-CAP-7', 'Bob PC', '{}', current_setting('rls.items')::jsonb, 3000000, 0, 3000000) is not null
  as "older pending orders don't count";

reset role;

-- ===========================================================================
-- Live chat (20261118000100_chat.sql). The order secret above is still set:
-- post_bot_reply uses the same one.
-- ===========================================================================

-- anon: reads nothing and can't call any chat function.
set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

do $$
begin
  begin
    perform 1 from public.conversations;
    raise exception 'FAIL: anon reads conversations';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from public.chat_messages;
    raise exception 'FAIL: anon reads chat messages';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.get_or_create_conversation();
    raise exception 'FAIL: anon calls get_or_create_conversation';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls get_or_create_conversation (reached the function: %)', sqlerrm;
    end if;
  end;
  begin
    perform public.post_bot_reply('rls-order-secret', gen_random_uuid(), 'Hi', 'greeting');
    raise exception 'FAIL: anon calls post_bot_reply';
  exception when insufficient_privilege then
    if sqlerrm not like 'permission denied for function%' then
      raise exception 'FAIL: anon calls post_bot_reply (reached the function: %)', sqlerrm;
    end if;
  end;
  begin
    perform public.can_join_chat_topic('chat:admin');
    raise exception 'FAIL: anon may join a chat topic';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;

-- alice (a user): her own conversation, her own messages, nothing else.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

do $$
declare
  c public.conversations;
  again public.conversations;
  m public.chat_messages;
  bot public.chat_messages;
begin
  c := public.get_or_create_conversation();
  assert c.owner = '00000000-0000-4000-8000-00000000000a' and c.status = 'open',
    'FAIL: get_or_create_conversation makes the caller''s own open conversation';
  again := public.get_or_create_conversation();
  assert again.id = c.id, 'FAIL: one conversation per user';
  perform set_config('rls.conv_a', c.id::text, true);

  -- Her own message: the server's clock and trimmed text, whatever she sends.
  insert into public.chat_messages (conversation_id, sender_role, sender_id, body, created_at)
  values (c.id, 'user', '00000000-0000-4000-8000-00000000000a', '  Are the prices real?  ',
    '2000-01-01')
  returning * into m;
  assert m.body = 'Are the prices real?'
     and m.created_at between now() and clock_timestamp(),
    'FAIL: a message gets the server''s time and trimmed text';
  assert (select last_message_at from public.conversations where id = c.id) = m.created_at,
    'FAIL: a new message updates last_message_at';

  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (c.id, 'admin', '00000000-0000-4000-8000-00000000000a', 'I am the admin');
    raise exception 'FAIL: a user posts as admin';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body, bot_rule)
    values (c.id, 'bot', null, 'I am the bot', 'greeting');
    raise exception 'FAIL: a user posts as the bot';
  exception when insufficient_privilege or check_violation then null;
  end;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (c.id, 'user', '00000000-0000-4000-8000-00000000000b', 'Signed as Bob');
    raise exception 'FAIL: a user posts under another user''s id';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body, bot_rule)
    values (c.id, 'user', '00000000-0000-4000-8000-00000000000a', 'Tagged', 'prices');
    raise exception 'FAIL: a user''s message carries a bot rule';
  exception when check_violation then null;
  end;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (c.id, 'user', '00000000-0000-4000-8000-00000000000a', E'  \t ');
    raise exception 'FAIL: an empty message is refused';
  exception when check_violation then null;
  end;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (c.id, 'user', '00000000-0000-4000-8000-00000000000a', repeat('x', 1001));
    raise exception 'FAIL: a message over 1000 characters is refused';
  exception when check_violation then null;
  end;
  begin
    update public.chat_messages set body = 'edited' where conversation_id = c.id;
    raise exception 'FAIL: a user edits a chat message';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.chat_messages where conversation_id = c.id;
    raise exception 'FAIL: a user deletes a chat message';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.conversations set status = 'closed' where id = c.id;
    raise exception 'FAIL: a user updates a conversation directly';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.set_conversation_status(c.id, 'closed');
    raise exception 'FAIL: a user closes a conversation';
  exception when insufficient_privilege then null;
  end;

  -- The bot: only with the secret, and only straight after a user's message.
  begin
    perform public.post_bot_reply('wrong-secret', c.id, 'Fake bot', 'prices');
    raise exception 'FAIL: post_bot_reply accepts a wrong secret';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.post_bot_reply(null, c.id, 'Fake bot', 'prices');
    raise exception 'FAIL: post_bot_reply accepts a wrong secret (null)';
  exception when insufficient_privilege then null;
  end;
  bot := public.post_bot_reply('rls-order-secret', c.id, 'Prices marked Checked were checked by hand.', 'prices');
  assert bot.sender_role = 'bot' and bot.sender_id is null and bot.bot_rule = 'prices',
    'FAIL: post_bot_reply writes a bot message';
  begin
    perform public.post_bot_reply('rls-order-secret', c.id, 'Twice', 'prices');
    raise exception 'FAIL: the bot replies twice to one message';
  exception when raise_exception then
    if sqlerrm not like 'The bot only answers%' then raise exception '%', sqlerrm; end if;
  end;

  perform public.mark_chat_read(c.id);
  assert (select user_last_read_at from public.conversations where id = c.id) = now()
     and (select admin_last_read_at from public.conversations where id = c.id) is null,
    'FAIL: mark_chat_read sets the owner''s read time only';

  assert (select count(*) from public.chat_messages where conversation_id = c.id) = 2,
    'FAIL: a user reads her own chat messages';
  assert public.can_join_chat_topic('chat:' || c.id::text),
    'FAIL: a user may join her own chat topic';
  assert not public.can_join_chat_topic('chat:admin'),
    'FAIL: a user may join chat:admin';
end;
$$;

reset role;

-- bob (another user): can't see or touch alice's conversation. The rate limit.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);

do $$
declare
  conv_a uuid := current_setting('rls.conv_a')::uuid;
  c public.conversations;
  i integer;
begin
  c := public.get_or_create_conversation();
  perform set_config('rls.conv_b', c.id::text, true);

  assert not exists (select 1 from public.conversations
                     where owner <> '00000000-0000-4000-8000-00000000000b'),
    'FAIL: user reads another user''s conversation';
  assert not exists (select 1 from public.chat_messages where conversation_id = conv_a),
    'FAIL: user reads another user''s chat messages';
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (conv_a, 'user', '00000000-0000-4000-8000-00000000000b', 'Hello Alice');
    raise exception 'FAIL: a user posts into another user''s conversation';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.mark_chat_read(conv_a);
    raise exception 'FAIL: a user marks another user''s conversation read';
  exception when insufficient_privilege then null;
  end;
  assert not public.can_join_chat_topic('chat:' || conv_a::text),
    'FAIL: a user may join another user''s chat topic';
  assert public.can_join_chat_topic('chat:' || c.id::text)
     and not public.can_join_chat_topic('chat:not-a-uuid')
     and not public.can_join_chat_topic('orders:' || c.id::text),
    'FAIL: chat topic names are matched exactly';

  -- Rate limit: 5 messages in 30 seconds, then the 6th is refused.
  for i in 1..5 loop
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (c.id, 'user', '00000000-0000-4000-8000-00000000000b', 'Fast ' || i);
  end loop;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (c.id, 'user', '00000000-0000-4000-8000-00000000000b', 'Fast 6');
    raise exception 'FAIL: a sixth message in 30 seconds is refused';
  exception when raise_exception then
    if sqlerrm not like 'You''re sending messages too fast%' then raise exception '%', sqlerrm; end if;
  end;
end;
$$;

reset role;

-- The daily limit: as the database owner (with bob's claims still set, so the
-- trigger sees him as the sender), add his messages 5 at a time and age each
-- batch past the 30-second window, up to 60 today. The 61st is refused.
do $$
declare
  conv_b uuid := current_setting('rls.conv_b')::uuid;
  i integer;
begin
  update public.chat_messages set created_at = now() - interval '1 minute'
  where conversation_id = conv_b;
  for i in 6..60 loop
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (conv_b, 'user', '00000000-0000-4000-8000-00000000000b', 'Msg ' || i);
    if i % 5 = 0 then
      update public.chat_messages set created_at = now() - interval '1 minute'
      where conversation_id = conv_b;
    end if;
  end loop;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (conv_b, 'user', '00000000-0000-4000-8000-00000000000b', 'Msg 61');
    raise exception 'FAIL: a 61st message in a day is refused';
  exception when raise_exception then
    if sqlerrm not like 'You''ve sent 60 messages today%' then raise exception '%', sqlerrm; end if;
  end;
  -- Yesterday's messages don't count.
  update public.chat_messages set created_at = now() - interval '25 hours'
  where conversation_id = conv_b;
  insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
  values (conv_b, 'user', '00000000-0000-4000-8000-00000000000b', 'Next day');
end;
$$;

-- carol (the admin): reads every conversation, replies anywhere without a
-- limit, can't post as a user or the bot, closes and reopens.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000c", "role": "authenticated"}', true);

do $$
declare
  conv_a uuid := current_setting('rls.conv_a')::uuid;
  conv_b uuid := current_setting('rls.conv_b')::uuid;
  c public.conversations;
  i integer;
begin
  assert (select count(*) from public.conversations where id in (conv_a, conv_b)) = 2,
    'FAIL: an admin reads every conversation';
  assert (select count(*) from public.chat_messages where conversation_id = conv_a) = 2,
    'FAIL: an admin reads every chat message';

  for i in 1..7 loop
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (conv_a, 'admin', '00000000-0000-4000-8000-00000000000c', 'Admin reply ' || i);
  end loop;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (conv_a, 'user', '00000000-0000-4000-8000-00000000000a', 'As Alice');
    raise exception 'FAIL: an admin posts as a user';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.chat_messages (conversation_id, sender_role, sender_id, body)
    values (conv_a, 'admin', '00000000-0000-4000-8000-00000000000a', 'Under Alice''s id');
    raise exception 'FAIL: an admin posts under another id';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.post_bot_reply('rls-order-secret', conv_a, 'After the admin', 'prices');
    raise exception 'FAIL: the bot answers an admin''s message';
  exception when raise_exception then
    if sqlerrm not like 'The bot only answers%' then raise exception '%', sqlerrm; end if;
  end;

  perform public.mark_chat_read(conv_a);
  assert (select admin_last_read_at from public.conversations where id = conv_a) = now(),
    'FAIL: mark_chat_read sets the admins'' read time';

  c := public.set_conversation_status(conv_a, 'closed');
  assert c.status = 'closed', 'FAIL: an admin closes a conversation';
  begin
    perform public.set_conversation_status(conv_a, 'archived');
    raise exception 'FAIL: an unknown conversation status is refused';
  exception when invalid_parameter_value then null;
  end;

  assert public.can_join_chat_topic('chat:admin')
     and public.can_join_chat_topic('chat:' || conv_a::text)
     and public.can_join_chat_topic('chat:' || conv_b::text),
    'FAIL: an admin may join chat:admin and every conversation''s topic';
end;
$$;

reset role;

-- alice opens the chat again: her closed conversation reopens.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

do $$
declare
  c public.conversations := public.get_or_create_conversation();
begin
  assert c.id = current_setting('rls.conv_a')::uuid and c.status = 'open',
    'FAIL: get_or_create_conversation reopens a closed conversation';
end;
$$;

reset role;

-- ---------------------------------------------------------------------------
-- bob deletes his account: auth user, profile and builds all go.
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);

select public.delete_my_account();

reset role;

do $$
begin
  assert not exists (select 1 from auth.users
                     where id = '00000000-0000-4000-8000-00000000000b'),
    'FAIL: delete_my_account removes the auth user';
  assert not exists (select 1 from public.profiles
                     where id = '00000000-0000-4000-8000-00000000000b'),
    'FAIL: deleting an account removes its profile';
  assert not exists (select 1 from public.builds
                     where owner = '00000000-0000-4000-8000-00000000000b'),
    'FAIL: deleting an account removes its builds';
  assert not exists (select 1 from public.orders
                     where owner = '00000000-0000-4000-8000-00000000000b'),
    'FAIL: deleting an account removes its orders';
  assert not exists (select 1 from public.conversations
                     where owner = '00000000-0000-4000-8000-00000000000b'),
    'FAIL: deleting an account removes its conversation and messages';
  assert exists (select 1 from public.builds where id = 'alice-1'),
    'FAIL: deleting one account leaves other accounts alone';
end;
$$;

select 'All RLS tests passed' as result;

rollback;
