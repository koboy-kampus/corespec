-- Phase 16a · 2/3: builds saved in an account.
--
-- The same shape as a build in the browser (types/parts.ts `Build`): the build's
-- own id from the browser, a name, and `parts` as {category: itemId}. Builds are
-- never deleted row by row: deleting one sets `deleted_at` (a tombstone), so a
-- deleted build can't come back from another browser's stale copy. Rows only go
-- away all at once when the account is deleted.
--
-- Rerunnable. Run after 20261112000100_profiles.sql.

-- {category: itemId} with at most 20 slots, every value a short string.
create or replace function public.build_parts_ok(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and (select count(*) from jsonb_each(p)) <= 20
    and not exists (
      select 1 from jsonb_each(p) as e(key, value)
      where char_length(e.key) > 32
        or jsonb_typeof(e.value) <> 'string'
        or char_length(e.value #>> '{}') > 80
    );
$$;

revoke all on function public.build_parts_ok(jsonb) from public, anon;
grant execute on function public.build_parts_ok(jsonb) to authenticated;

create table if not exists public.builds (
  owner uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  id text not null constraint builds_id_check check (char_length(id) between 1 and 64),
  name text not null constraint builds_name_check check (char_length(name) between 1 and 60),
  parts jsonb not null default '{}'::jsonb
    constraint builds_parts_check check (public.build_parts_ok(parts)),
  created_at timestamptz not null default now(),
  -- The build's own updatedAt from the browser: the newest edit wins a merge.
  updated_at timestamptz not null default now(),
  -- Set when the build is deleted. A tombstone is final (see the trigger below).
  deleted_at timestamptz,
  primary key (owner, id)
);

alter table public.builds enable row level security;

-- No delete for anyone: deleting a build means setting deleted_at.
revoke all on table public.builds from public, anon, authenticated;
grant select, insert, update on table public.builds to authenticated;

-- Rules every write goes through:
-- * a tombstone is final: any later update of a deleted build is ignored, so an
--   upsert from a stale browser can't bring it back;
-- * a tombstone keeps no content (name and parts are wiped);
-- * the owner and created_at never change;
-- * updated_at can't be more than 5 minutes in the future (a wrong clock would
--   otherwise win every merge);
-- * at most 200 builds per account (tombstones don't count).
create or replace function public.builds_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if old.deleted_at is not null then
      return null;
    end if;
    new.owner := old.owner;
    new.created_at := old.created_at;
  end if;

  new.updated_at := least(new.updated_at, now() + interval '5 minutes');

  if new.deleted_at is not null then
    new.deleted_at := least(new.deleted_at, now());
    new.name := 'Deleted build';
    new.parts := '{}'::jsonb;
  elsif tg_op = 'INSERT' and (
    select count(*) from public.builds
    where owner = new.owner and deleted_at is null
  ) >= 200 then
    raise exception 'An account can keep up to 200 builds'
      using errcode = 'P0001', hint = 'build_limit';
  end if;

  return new;
end;
$$;

revoke all on function public.builds_before_write() from public, anon, authenticated;

drop trigger if exists builds_before_write on public.builds;
create trigger builds_before_write
  before insert or update on public.builds
  for each row execute function public.builds_before_write();

-- ---------------------------------------------------------------------------
-- Row Level Security: your own builds only. Admins get no access to other
-- people's builds (the admin page shows counts, see public.admin_stats()).
-- ---------------------------------------------------------------------------

drop policy if exists "builds: read own" on public.builds;
create policy "builds: read own"
  on public.builds for select to authenticated
  using (owner = (select auth.uid()));

drop policy if exists "builds: insert own" on public.builds;
create policy "builds: insert own"
  on public.builds for insert to authenticated
  with check (owner = (select auth.uid()));

drop policy if exists "builds: update own" on public.builds;
create policy "builds: update own"
  on public.builds for update to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));
