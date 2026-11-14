-- Phase 16b · 1/2: the catalogue (items), checked marketplace listings, and
-- site settings.
--
-- Everyone can read all of it, active and inactive items alike, so share links
-- and saved builds that use a deactivated item keep working. `active` only takes
-- an item out of the builder's picker. Only admins can write.
--
-- Listings get the same rules as `npm run prices:apply` (scripts/price-csv.mjs),
-- as database checks: https, on that marketplace's own domain, a whole number
-- of rupiah, and a check date that isn't in the future (Indonesian time). The
-- "more than 40% from the estimate" warning stays in the admin form: it's a
-- question for a person, not a rule.
--
-- Rerunnable. Run after the 16a migrations (…0100 to …0300), then fill it with
-- supabase/seed.sql.

-- ---------------------------------------------------------------------------
-- Check helpers (immutable, no special rights)
-- ---------------------------------------------------------------------------

-- The category's own fields are in `specs`; the website checks each one
-- (lib/catalogue/schema.ts). Here: an object of plain values, not too big.
create or replace function public.item_specs_ok(specs jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(specs) = 'object'
    and octet_length(specs::text) <= 4000
    and not exists (
      select 1 from jsonb_each(specs) e
      where jsonb_typeof(e.value) not in ('string', 'number', 'boolean', 'array')
         or char_length(e.key) > 40
    );
$$;

-- Size in mm for the 3D view: exactly l, w and h, each a number above 0.
create or replace function public.item_dims_ok(dims jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  k text;
begin
  if dims is null then
    return true;
  end if;
  if jsonb_typeof(dims) <> 'object'
    or (select array_agg(key order by key) from jsonb_object_keys(dims) key) <> array['h', 'l', 'w'] then
    return false;
  end if;
  foreach k in array array['l', 'w', 'h'] loop
    if jsonb_typeof(dims -> k) <> 'number' or (dims ->> k)::numeric <= 0
      or (dims ->> k)::numeric > 5000 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;

-- A listing link: https, a plain host name on the marketplace's own domain (or
-- a subdomain of it), no spaces. The same rule as lib/catalogue/listings.ts.
create or replace function public.listing_url_ok(marketplace text, url text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  host text;
  domain text;
begin
  if url is null or char_length(url) > 2048 or url ~ '\s' then
    return false;
  end if;
  host := lower(substring(url from '^https://([A-Za-z0-9.-]+)(?::[0-9]{1,5})?(?:[/?#]|$)'));
  if host is null then
    return false;
  end if;
  domain := case marketplace
    when 'tokopedia' then 'tokopedia.com'
    when 'shopee' then 'shopee.co.id'
    when 'blibli' then 'blibli.com'
  end;
  return domain is not null and (host = domain or right(host, char_length(domain) + 1) = '.' || domain);
end;
$$;

-- The checks below run as whoever writes the row, so writers need execute.
-- They're plain functions of their arguments: nothing to protect.
revoke all on function public.item_specs_ok(jsonb) from public, anon, authenticated;
revoke all on function public.item_dims_ok(jsonb) from public, anon, authenticated;
revoke all on function public.listing_url_ok(text, text) from public, anon, authenticated;
grant execute on function public.item_specs_ok(jsonb) to authenticated;
grant execute on function public.item_dims_ok(jsonb) to authenticated;
grant execute on function public.listing_url_ok(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- items
-- ---------------------------------------------------------------------------

create table if not exists public.items (
  id text primary key
    constraint items_id_check check (
      char_length(id) <= 80 and id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    ),
  category text not null
    constraint items_category_check check (category in (
      'cpu', 'motherboard', 'ram', 'gpu', 'storage', 'psu', 'case', 'cooler',
      'monitor', 'keyboard', 'mouse', 'headset', 'mousepad', 'speakers',
      'webcam', 'microphone', 'chair', 'desk', 'arm', 'lighting'
    )),
  brand text not null
    constraint items_brand_check check (
      char_length(brand) between 1 and 60 and brand = btrim(brand)
    ),
  name text not null
    constraint items_name_check check (
      char_length(name) between 1 and 100 and name = btrim(name)
    ),
  tier text not null
    constraint items_tier_check check (tier in ('budget', 'mid', 'high')),
  -- The estimate: a whole number of rupiah (the column type), above 0.
  price_idr integer not null
    constraint items_price_check check (price_idr > 0),
  dims jsonb
    constraint items_dims_check check (public.item_dims_ok(dims)),
  specs jsonb not null default '{}'::jsonb
    constraint items_specs_check check (public.item_specs_ok(specs)),
  model_id text
    constraint items_model_id_check check (model_id ~ '^[a-z0-9-]{1,60}$'),
  -- false: out of the builder's picker. Still readable, so old links work.
  active boolean not null default true,
  -- Order within the category, as in the JSON files.
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  -- The id always starts with the category: "gpu-…".
  constraint items_id_category_check check (left(id, char_length(category) + 1) = category || '-')
);

create index if not exists items_category_position_idx
  on public.items (category, position);

-- ---------------------------------------------------------------------------
-- listings: real listings checked by hand. Never scraped.
-- ---------------------------------------------------------------------------

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.items (id) on delete cascade on update cascade,
  marketplace text not null
    constraint listings_marketplace_check check (marketplace in ('tokopedia', 'shopee', 'blibli')),
  url text not null
    constraint listings_url_check check (public.listing_url_ok(marketplace, url)),
  -- A whole number of rupiah (the column type), above 0.
  price_idr integer not null
    constraint listings_price_check check (price_idr > 0),
  -- Not in the future, in Indonesian time. (A check that uses the clock: fine
  -- here because a date that passes once keeps passing.)
  checked_at date not null
    constraint listings_checked_at_check check (
      checked_at <= (now() at time zone 'Asia/Jakarta')::date
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  constraint listings_item_url_key unique (item_id, url)
);

create index if not exists listings_item_idx on public.listings (item_id);

-- ---------------------------------------------------------------------------
-- site_settings: small values the site shows (today: "estimates as of").
-- ---------------------------------------------------------------------------

create table if not exists public.site_settings (
  key text primary key
    constraint site_settings_key_check check (key in ('estimates_as_of')),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references public.profiles (id) on delete set null,
  constraint site_settings_value_check check (
    key <> 'estimates_as_of' or (
      jsonb_typeof(value) = 'string'
      and (value #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$'
      and (value #>> '{}')::date <= (now() at time zone 'Asia/Jakarta')::date
    )
  )
);

-- ---------------------------------------------------------------------------
-- Keeping updated_at / updated_by current
-- ---------------------------------------------------------------------------

drop trigger if exists items_touch_updated_at on public.items;
create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

drop trigger if exists listings_touch_updated_at on public.listings;
create trigger listings_touch_updated_at
  before update on public.listings
  for each row execute function public.touch_updated_at();

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- Who changed it last is the caller, whatever the request said.
create or replace function public.stamp_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by := (select auth.uid());
  return new;
end;
$$;

revoke all on function public.stamp_updated_by() from public, anon, authenticated;

drop trigger if exists items_stamp_updated_by on public.items;
create trigger items_stamp_updated_by
  before insert or update on public.items
  for each row execute function public.stamp_updated_by();

drop trigger if exists site_settings_stamp_updated_by on public.site_settings;
create trigger site_settings_stamp_updated_by
  before insert or update on public.site_settings
  for each row execute function public.stamp_updated_by();

-- ---------------------------------------------------------------------------
-- Grants and Row Level Security
-- ---------------------------------------------------------------------------

alter table public.items enable row level security;
alter table public.listings enable row level security;
alter table public.site_settings enable row level security;

-- Take away Supabase's default "everything to everyone", then give back:
-- reading to everyone, writing to signed-in users (and the policies below
-- narrow that to admins).
revoke all on table public.items, public.listings, public.site_settings
  from public, anon, authenticated;
grant select on table public.items, public.listings, public.site_settings
  to anon, authenticated;
grant insert, update, delete on table public.items, public.listings, public.site_settings
  to authenticated;

-- Everyone reads everything: ALL items, active and inactive.
drop policy if exists "items: everyone reads all" on public.items;
create policy "items: everyone reads all"
  on public.items for select to anon, authenticated
  using (true);

drop policy if exists "listings: everyone reads" on public.listings;
create policy "listings: everyone reads"
  on public.listings for select to anon, authenticated
  using (true);

drop policy if exists "site_settings: everyone reads" on public.site_settings;
create policy "site_settings: everyone reads"
  on public.site_settings for select to anon, authenticated
  using (true);

-- Admins write.
drop policy if exists "items: admins insert" on public.items;
create policy "items: admins insert"
  on public.items for insert to authenticated
  with check ((select public.is_admin()));
drop policy if exists "items: admins update" on public.items;
create policy "items: admins update"
  on public.items for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "items: admins delete" on public.items;
create policy "items: admins delete"
  on public.items for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "listings: admins insert" on public.listings;
create policy "listings: admins insert"
  on public.listings for insert to authenticated
  with check ((select public.is_admin()));
drop policy if exists "listings: admins update" on public.listings;
create policy "listings: admins update"
  on public.listings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "listings: admins delete" on public.listings;
create policy "listings: admins delete"
  on public.listings for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists "site_settings: admins insert" on public.site_settings;
create policy "site_settings: admins insert"
  on public.site_settings for insert to authenticated
  with check ((select public.is_admin()));
drop policy if exists "site_settings: admins update" on public.site_settings;
create policy "site_settings: admins update"
  on public.site_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "site_settings: admins delete" on public.site_settings;
create policy "site_settings: admins delete"
  on public.site_settings for delete to authenticated
  using ((select public.is_admin()));
