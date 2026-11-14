-- Phase 16a · 3/3: account and admin functions.
--
-- Every function here is security definer (it runs with the owner's rights), so
-- each one: sets search_path = '' (every name is schema-qualified), checks who is
-- calling before doing anything, has execute revoked from public and anon, and
-- is granted to authenticated only.
--
-- Rerunnable. Run after 20261112000200_builds.sql.

-- Change someone's role. Admins only; never your own role, and never the last
-- admin.
create or replace function public.set_role(target uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null or not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  if new_role is null or new_role not in ('user', 'admin') then
    raise exception 'Unknown role' using errcode = '22023';
  end if;
  if target = me then
    raise exception 'You can''t change your own role' using errcode = '42501';
  end if;

  -- Lock the admin rows so two admins demoting each other at once can't leave none.
  perform 1 from public.profiles where role = 'admin' for update;
  if new_role = 'user'
    and exists (select 1 from public.profiles where id = target and role = 'admin')
    and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'There must always be at least one admin' using errcode = 'P0001';
  end if;

  update public.profiles set role = new_role where id = target;
  if not found then
    raise exception 'No such user' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_role(uuid, text) from public, anon;
grant execute on function public.set_role(uuid, text) to authenticated;

-- Delete the caller's own account: the auth user, and through the cascades
-- their profile and every build. The last admin can't (promote someone first).
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles where id = me and role = 'admin')
    and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'The last admin can''t delete their account' using errcode = 'P0001';
  end if;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Totals for the admin overview. Admins only; counts, never anyone's builds.
create or replace function public.admin_stats()
returns table (
  user_count bigint,
  admin_count bigint,
  build_count bigint,
  users_with_builds bigint,
  new_users_7d bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
  select
    (select count(*) from public.profiles),
    (select count(*) from public.profiles p where p.role = 'admin'),
    (select count(*) from public.builds b where b.deleted_at is null),
    (select count(distinct b.owner) from public.builds b where b.deleted_at is null),
    (select count(*) from public.profiles p where p.created_at > now() - interval '7 days');
end;
$$;

revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- Everyone with an account, for /admin/users. Admins only. Email comes from
-- auth.users (which the website can't read otherwise); builds are a count.
create or replace function public.admin_list_users()
returns table (
  id uuid,
  display_name text,
  email text,
  role text,
  created_at timestamptz,
  build_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_admin() then
    raise exception 'Admins only' using errcode = '42501';
  end if;
  return query
  select
    p.id,
    p.display_name,
    u.email::text,
    p.role,
    p.created_at,
    (select count(*) from public.builds b where b.owner = p.id and b.deleted_at is null)
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc
  limit 1000;
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;
