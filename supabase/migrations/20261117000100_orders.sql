-- Phase 17a: orders for the checkout simulation (Midtrans Sandbox).
--
-- CoreSpec is not a shop: an order is a record of a *simulated* payment for a
-- build, made with Midtrans's sandbox, where no real money moves.
--
-- Trusted writes without a service-role key. Nobody (anon or authenticated) can
-- insert, update or delete orders directly. The server writes them through two
-- `security definer` functions that only work with ORDER_WRITE_SECRET, a random
-- secret that lives in the server's environment and nowhere else. The database
-- keeps only its SHA-256 hash (public.payment_config), so reading the database
-- never reveals the secret. The functions are executable by anon too, because
-- Midtrans's notification (webhook) arrives without a session; without the
-- secret they refuse everything.
--
-- This migration leaves the hash empty (null), and while it is null both
-- functions refuse every call. To set it, see docs/accounts.md
-- ("Checkout simulation").
--
-- Rerunnable. Run after the 2026111x migrations.

-- ---------------------------------------------------------------------------
-- The secret's hash
-- ---------------------------------------------------------------------------

create table if not exists public.payment_config (
  id boolean primary key default true constraint payment_config_one_row check (id),
  -- SHA-256 of ORDER_WRITE_SECRET as 64 lowercase hex characters, or null (off).
  secret_hash text
    constraint payment_config_secret_hash_check
    check (secret_hash is null or secret_hash ~ '^[0-9a-f]{64}$')
);

alter table public.payment_config enable row level security;
-- No policies and no grants: only the database owner (and the two functions
-- below, which run as the owner) can read it.
revoke all on table public.payment_config from public, anon, authenticated;

insert into public.payment_config (id) values (true) on conflict (id) do nothing;

-- Raises unless p_secret hashes to the stored hash. Refuses everything while
-- the hash is null. Not callable by anyone; only the functions below use it.
create or replace function public.check_order_secret(p_secret text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  stored text;
begin
  select secret_hash into stored from public.payment_config where id;
  if stored is null or p_secret is null
     or encode(pg_catalog.sha256(convert_to(p_secret, 'utf8')), 'hex') <> stored then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.check_order_secret(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  -- e.g. CS-20261119-7K3F9Q. This is Midtrans's order_id: letters, digits and
  -- - _ ~ . only, at most 50 characters.
  order_no text not null unique
    constraint orders_order_no_check check (order_no ~ '^[A-Za-z0-9_~.-]{1,50}$'),
  owner uuid not null references public.profiles (id) on delete cascade,
  build_name text not null
    constraint orders_build_name_check check (char_length(build_name) between 1 and 60),
  -- {category: itemId}, the same shape as a saved build.
  parts jsonb not null
    constraint orders_parts_check check (public.build_parts_ok(parts)),
  -- The price snapshot: [{ id, category, brand, name, priceIDR, priceKind }].
  -- The order page and the receipt show these, never today's prices.
  items jsonb not null
    constraint orders_items_check check (
      jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 20
    ),
  pc_idr integer not null constraint orders_pc_idr_check check (pc_idr >= 0),
  setup_idr integer not null constraint orders_setup_idr_check check (setup_idr >= 0),
  total_idr integer not null
    constraint orders_total_idr_check check (total_idr > 0),
  status text not null default 'pending'
    constraint orders_status_check
    check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  payment_type text constraint orders_payment_type_check check (char_length(payment_type) <= 40),
  midtrans_transaction_id text
    constraint orders_transaction_id_check check (char_length(midtrans_transaction_id) <= 100),
  snap_token text constraint orders_snap_token_check check (char_length(snap_token) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  constraint orders_total_sum_check check (total_idr = pc_idr + setup_idr)
);

create index if not exists orders_owner_created_idx on public.orders (owner, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

alter table public.orders enable row level security;

-- Reading only. Every write goes through the functions below.
revoke all on table public.orders from public, anon, authenticated;
grant select on table public.orders to authenticated;

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

drop policy if exists "orders: read own" on public.orders;
create policy "orders: read own"
  on public.orders for select to authenticated
  using (owner = (select auth.uid()));

drop policy if exists "orders: admins read all" on public.orders;
create policy "orders: admins read all"
  on public.orders for select to authenticated
  using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- create_order: a new pending order, after the server has recalculated every
-- price from the catalogue (lib/checkout/order.ts).
-- ---------------------------------------------------------------------------

create or replace function public.create_order(
  p_secret text,
  p_owner uuid,
  p_order_no text,
  p_build_name text,
  p_parts jsonb,
  p_items jsonb,
  p_pc_idr integer,
  p_setup_idr integer,
  p_total_idr integer
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.orders;
begin
  perform public.check_order_secret(p_secret);

  -- Spam cap: at most 5 pending orders started in the last hour per account.
  if (
    select count(*) from public.orders
    where owner = p_owner and status = 'pending'
      and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'Too many unpaid orders. Finish or wait for one to expire, then try again.'
      using errcode = 'P0001', hint = 'order_limit';
  end if;

  insert into public.orders
    (order_no, owner, build_name, parts, items, pc_idr, setup_idr, total_idr)
  values
    (p_order_no, p_owner, p_build_name, p_parts, p_items, p_pc_idr, p_setup_idr, p_total_idr)
  returning * into result;

  return result;
end;
$$;

revoke all on function public.create_order(text, uuid, text, text, jsonb, jsonb, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.create_order(text, uuid, text, text, jsonb, jsonb, integer, integer, integer)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- set_order_payment: records what Midtrans says about an order.
--
-- Status rules (Midtrans notifications can arrive twice or out of order):
-- * paid is final;
-- * pending never replaces another status;
-- * failed / expired / cancelled never replace paid (covered by the first rule);
-- * paid_at is set once, the first time the order becomes paid.
-- A null argument leaves its column alone. When the new status is refused, the
-- payment details (type, transaction id) are left alone too: they describe the
-- payment that lost. With every value null it changes nothing and returns the
-- row (the notification handler reads the order this way). An unknown order_no
-- returns no row, without an error.
-- ---------------------------------------------------------------------------

create or replace function public.set_order_payment(
  p_secret text,
  p_order_no text,
  p_status text,
  p_payment_type text,
  p_transaction_id text,
  p_snap_token text
)
returns setof public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  cur public.orders;
  next_status text;
  accept boolean;
begin
  perform public.check_order_secret(p_secret);

  if p_status is not null
     and p_status not in ('pending', 'paid', 'failed', 'expired', 'cancelled') then
    raise exception 'Unknown status %', p_status using errcode = '22023';
  end if;

  select * into cur from public.orders where order_no = p_order_no for update;
  if not found then
    return;
  end if;

  accept := p_status is null
    or p_status = cur.status
    or (cur.status <> 'paid' and p_status <> 'pending');
  next_status := case when accept and p_status is not null then p_status else cur.status end;

  if next_status is distinct from cur.status
     or (accept and p_payment_type is not null
         and p_payment_type is distinct from cur.payment_type)
     or (accept and p_transaction_id is not null
         and p_transaction_id is distinct from cur.midtrans_transaction_id)
     or (p_snap_token is not null and p_snap_token is distinct from cur.snap_token) then
    update public.orders set
      status = next_status,
      payment_type = case when accept then coalesce(p_payment_type, payment_type) else payment_type end,
      midtrans_transaction_id = case when accept
        then coalesce(p_transaction_id, midtrans_transaction_id) else midtrans_transaction_id end,
      snap_token = coalesce(p_snap_token, snap_token),
      paid_at = case when next_status = 'paid' then coalesce(paid_at, now()) else paid_at end
    where id = cur.id
    returning * into cur;
  end if;

  return next cur;
end;
$$;

revoke all on function public.set_order_payment(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.set_order_payment(text, text, text, text, text, text)
  to anon, authenticated;
