-- Phase 16b · 2/2: the audit log.
--
-- Every change to items, listings and site settings, and every role change, is
-- written down by a trigger: who (null when it was the SQL editor, e.g. the
-- seed), what, when, and which fields changed. Only admins can read it; nobody
-- can write, change or delete entries from the website.
--
-- Rerunnable. Run after 20261112000400_catalogue.sql.

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null
    constraint audit_log_action_check check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  row_id text not null,
  -- insert: the new row; delete: the old row; update: {field: {old, new}} for
  -- the fields that changed.
  diff jsonb not null default '{}'::jsonb
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);

alter table public.audit_log enable row level security;

revoke all on table public.audit_log from public, anon, authenticated;
grant select on table public.audit_log to authenticated;

drop policy if exists "audit_log: admins read" on public.audit_log;
create policy "audit_log: admins read"
  on public.audit_log for select to authenticated
  using ((select public.is_admin()));

-- No insert, update or delete grants or policies: only the trigger below writes.

-- The trigger function. security definer, so it can write to audit_log, which
-- nobody else can; search_path = '' and every name schema-qualified. It can only
-- run as a trigger, and nobody is granted execute on it.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  changes jsonb := '{}'::jsonb;
  k text;
  row_key text;
begin
  -- Noise, not news: these change on every write.
  old_row := old_row - 'updated_at' - 'updated_by';
  new_row := new_row - 'updated_at' - 'updated_by';
  -- For accounts, only the role is logged.
  if tg_table_name = 'profiles' then
    old_row := jsonb_build_object('id', old_row -> 'id', 'role', old_row -> 'role');
    new_row := jsonb_build_object('id', new_row -> 'id', 'role', new_row -> 'role');
  end if;

  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(new_row) loop
      if (old_row -> k) is distinct from (new_row -> k) then
        changes := changes || jsonb_build_object(k,
          jsonb_build_object('old', old_row -> k, 'new', new_row -> k));
      end if;
    end loop;
    if changes = '{}'::jsonb then
      return null; -- nothing really changed
    end if;
  elsif tg_op = 'INSERT' then
    changes := new_row;
  else
    changes := old_row;
  end if;

  row_key := coalesce(new_row, old_row) ->> case
    when tg_table_name = 'site_settings' then 'key'
    else 'id'
  end;
  -- A listing is easier to find by its item.
  if tg_table_name = 'listings' then
    row_key := (coalesce(new_row, old_row) ->> 'item_id') || ' · ' || row_key;
  end if;

  insert into public.audit_log (actor, action, table_name, row_id, diff)
  values ((select auth.uid()), lower(tg_op), tg_table_name, row_key, changes);
  return null;
end;
$$;

revoke all on function public.audit_row() from public, anon, authenticated;

drop trigger if exists items_audit on public.items;
create trigger items_audit
  after insert or update or delete on public.items
  for each row execute function public.audit_row();

drop trigger if exists listings_audit on public.listings;
create trigger listings_audit
  after insert or update or delete on public.listings
  for each row execute function public.audit_row();

drop trigger if exists site_settings_audit on public.site_settings;
create trigger site_settings_audit
  after insert or update or delete on public.site_settings
  for each row execute function public.audit_row();

-- Roles only: display names are the account holder's own business.
drop trigger if exists profiles_role_audit on public.profiles;
create trigger profiles_role_audit
  after update of role on public.profiles
  for each row
  when (old.role is distinct from new.role)
  execute function public.audit_row();
