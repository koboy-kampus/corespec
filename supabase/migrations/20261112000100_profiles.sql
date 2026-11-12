-- Phase 16a · 1/3: profiles and roles.
--
-- One row per account, created by a trigger when someone signs up. `role` is
-- 'user' or 'admin'; nobody can change it from the website except an admin,
-- through public.set_role() (migration 0300).
--
-- Rerunnable: safe to paste into the Supabase SQL editor again (or run with
-- `supabase db push`). Run the files in supabase/migrations/ in name order.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    constraint profiles_display_name_check
    check (
      char_length(display_name) between 1 and 50
      and display_name = btrim(display_name)
    ),
  role text not null default 'user'
    constraint profiles_role_check check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Column lock. Supabase grants every new table to anon and authenticated by
-- default, so take all of that away first (a table-level revoke also removes any
-- column grants), then give back only reading and changing your display name.
-- `role` can only change through public.set_role().
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Keeps updated_at current on every update (no special rights needed).
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- The name shown for an account: what they typed at sign-up with control
-- characters removed, spaces collapsed and trimmed, capped at 50 characters.
-- Falls back to the part of the email before the @, then to 'CoreSpec user'.
create or replace function public.clean_display_name(raw text, email text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  name text;
begin
  name := btrim(regexp_replace(
    regexp_replace(coalesce(raw, ''), '[[:cntrl:]]', '', 'g'),
    '\s+', ' ', 'g'));
  if name = '' then
    name := btrim(regexp_replace(split_part(coalesce(email, ''), '@', 1),
      '[[:cntrl:][:space:]]', '', 'g'));
  end if;
  name := btrim(left(name, 50));
  if name = '' then
    name := 'CoreSpec user';
  end if;
  return name;
end;
$$;

revoke all on function public.clean_display_name(text, text) from public, anon, authenticated;

-- True when the signed-in caller is an admin. Used by the RLS policies.
-- security definer so it can read the caller's own role whatever the policies
-- on profiles say; it only ever looks at the caller's row.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Sign-up trigger
-- ---------------------------------------------------------------------------

-- Creates the profile for every new auth user. The role is always 'user',
-- whatever the sign-up form sent: the only input taken from the user's metadata
-- is the display name, and that is cleaned and capped. A trigger function can't
-- be called directly (Postgres only runs it as a trigger), and nobody is granted
-- execute on it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    public.clean_display_name(new.raw_user_meta_data ->> 'display_name', new.email),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Accounts created before this migration (e.g. in the dashboard) get a profile too.
insert into public.profiles (id, display_name, role)
select u.id, public.clean_display_name(u.raw_user_meta_data ->> 'display_name', u.email), 'user'
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: admins read all" on public.profiles;
create policy "profiles: admins read all"
  on public.profiles for select to authenticated
  using ((select public.is_admin()));

-- Only display_name is granted (above), so this can't touch role.
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert policy (the trigger creates rows) and no delete policy (rows go when
-- the account is deleted, see public.delete_my_account()).
