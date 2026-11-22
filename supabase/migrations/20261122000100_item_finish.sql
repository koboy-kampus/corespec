-- Phase 19b: an item's "finish", the colours of its 3D model's materials.
--
-- `finish` maps a material name of the item's desk-view model to a colour,
-- e.g. {"wood": "#E8E6E1", "leg": "#3A3B3F"}. Missing (null) means the
-- palette's colours. Only setup items have one: the PC view doesn't use it.
--
-- The website checks that each key is a material the item's model really has
-- (lib/catalogue/schema.ts, against data/models.json); the database checks
-- the shape: an object of at most 12 entries, each a material name and a
-- "#RRGGBB" colour.
--
-- Not changed: the RLS policies and grants (everyone reads, admins write, as
-- for every other column of public.items), and the audit trigger from
-- 20261112000500_audit.sql, which already logs every changed column, so a
-- finish change is logged with its old and new value.
--
-- Also sets the finishes of the preset items (Rei's research, 22 Nov), but
-- only where an item has none yet, so running this again never undoes an
-- admin's edit. supabase/seed.sql sets the same values.
--
-- Rerunnable. Run after 20261118000100_chat.sql.

create or replace function public.item_finish_ok(finish jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select finish is null or (
    jsonb_typeof(finish) = 'object'
    and (select count(*) from jsonb_object_keys(finish)) <= 12
    and not exists (
      select 1 from jsonb_each(finish) e
      where e.key !~ '^[A-Za-z0-9 ._-]{1,40}$'
         or jsonb_typeof(e.value) <> 'string'
         or (e.value #>> '{}') !~ '^#[0-9A-Fa-f]{6}$'
    )
  );
$$;

revoke all on function public.item_finish_ok(jsonb) from public, anon, authenticated;
grant execute on function public.item_finish_ok(jsonb) to authenticated;

alter table public.items add column if not exists finish jsonb;

alter table public.items drop constraint if exists items_finish_check;
alter table public.items add constraint items_finish_check
  check (public.item_finish_ok(finish));

-- PC parts have no finish.
alter table public.items drop constraint if exists items_finish_setup_check;
alter table public.items add constraint items_finish_setup_check
  check (finish is null or category not in (
    'cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler'
  ));

-- The preset items' finishes, where none is set yet.
update public.items i
set finish = v.finish
from (values
  ('desk-ikea-lagkapten-adils-120-60', '{"wood": "#C9A57B", "leg": "#1E1E20", "black": "#1E1E20"}'::jsonb),
  ('desk-ikea-trotten-sit-stand-120-70', '{"wood": "#E8E6E1", "leg": "#3A3B3F", "steel": "#4A4B50"}'::jsonb),
  ('desk-ikea-mittzon-sit-stand-140-80', '{"wood": "#5C3B28", "leg": "#1E1E20", "steel": "#2A2A2D"}'::jsonb),
  ('chair-cougar-armor-one', '{"accent": "#F26B1D"}'::jsonb),
  ('chair-ikea-markus', '{"fabric": "#3A3B3E", "mesh": "#45464A"}'::jsonb),
  ('monitor-aoc-24g4', '{"accent": "#D0202A"}'::jsonb),
  ('monitor-lg-ultragear-27gr75q', '{"accent": "#7E2848"}'::jsonb),
  ('headset-hyperx-cloud-ii', '{"accent": "#C4161C"}'::jsonb),
  ('headset-hyperx-cloud-stinger-2', '{"accent": "#1E1E20"}'::jsonb),
  ('headset-logitech-g435-lightspeed', '{"dark": "#1C1C1E", "accent": "#D7F205", "fabric": "#2A2A2D"}'::jsonb),
  ('mouse-logitech-g102-lightsync', '{"accent": "#3FD0FF"}'::jsonb),
  ('mouse-logitech-g304-lightspeed', '{"accent": "#26262A"}'::jsonb),
  ('mouse-logitech-g502-x', '{"accent": "#26262A"}'::jsonb),
  ('speakers-creative-pebble-plus', '{"steel": "#B87333"}'::jsonb),
  ('microphone-rode-podmic', '{"mesh": "#6E6F73"}'::jsonb),
  ('lighting-benq-screenbar-halo', '{"dark": "#3A3B3F"}'::jsonb)
) as v(id, finish)
where i.id = v.id and i.finish is null;
