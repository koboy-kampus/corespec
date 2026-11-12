-- Row Level Security tests for CoreSpec (Phase 16a: profiles, builds and the
-- account/admin functions). Items and listings get their own section in 16b.
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
