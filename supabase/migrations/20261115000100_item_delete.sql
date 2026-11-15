-- Deleting a catalogue item (admin). The website only offers it for items that
-- aren't in the repo's JSON and that no preset uses; the database adds the rule
-- it can check itself: an item that any saved build still uses can't be
-- deleted (deactivate it instead).
--
-- Already in place since 20261112000400_catalogue.sql, so not repeated here:
--   * the delete grant and the "items: admins delete" and "listings: admins
--     delete" policies (admins only);
--   * listings.item_id … on delete cascade: an item's listings go with it.
-- And since 20261112000500_audit.sql, the audit trigger logs the delete with
-- the whole deleted row, plus one entry for each listing that went with it.
--
-- Rerunnable. Run after 20261112000500_audit.sql.

-- How many saved builds use an item. Admins can't read other people's builds
-- (RLS), so this runs with the owner's rights and returns a count only, never
-- a build. Deleted builds (tombstones) don't count: they keep no parts.
create or replace function public.item_usage_count(p_item_id text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not public.is_admin() then
    raise exception 'Only admins can check item usage' using errcode = '42501';
  end if;
  return (
    select count(*)::integer
    from public.builds b
    where b.deleted_at is null
      and exists (
        select 1 from jsonb_each_text(b.parts) as e(key, value)
        where e.value = p_item_id
      )
  );
end;
$$;

revoke all on function public.item_usage_count(text) from public, anon;
grant execute on function public.item_usage_count(text) to authenticated;

-- The same rule at delete time, so it holds even if a build starts using the
-- item between the admin's check and the delete. Trigger only: nobody is
-- granted execute.
create or replace function public.items_refuse_delete_in_use()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  select count(*) into n
  from public.builds b
  where b.deleted_at is null
    and exists (
      select 1 from jsonb_each_text(b.parts) as e(key, value)
      where e.value = old.id
    );
  if n > 0 then
    raise exception 'Item % is used in % saved build(s): deactivate it instead', old.id, n
      using errcode = 'P0001';
  end if;
  return old;
end;
$$;

revoke all on function public.items_refuse_delete_in_use() from public, anon, authenticated;

drop trigger if exists items_refuse_delete_in_use on public.items;
create trigger items_refuse_delete_in_use
  before delete on public.items
  for each row execute function public.items_refuse_delete_in_use();
