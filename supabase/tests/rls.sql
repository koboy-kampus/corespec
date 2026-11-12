-- Row Level Security tests for CoreSpec: profiles, builds and the account/admin
-- functions (Phase 16a), then the catalogue, listings, settings and the audit
-- log (Phase 16b).
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
-- local Postgres with a stand-in for Supabase's auth schema.

begin;

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
  exception when raise_exception then null;
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
  assert (select count(*) from public.profiles) = 3,
    'FAIL: an admin reads every profile';

  select * into s from public.admin_stats();
  assert s.user_count = 3 and s.admin_count = 1 and s.build_count = 201,
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

  begin
    perform public.delete_my_account();
    raise exception 'FAIL: the last admin deletes their account';
  exception when raise_exception then null;
  end;

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
  assert exists (select 1 from public.builds where id = 'alice-1'),
    'FAIL: deleting one account leaves other accounts alone';
end;
$$;

select 'All RLS tests passed' as result;

rollback;
