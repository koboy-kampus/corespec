-- Phase 20a: an admin verifies a paid order, and the receipt names them.
--
-- A real receipt names the staff member who handled it. After Midtrans says an
-- order is paid, an admin verifies it; the order keeps who did it and when.
--
-- * orders.verified_at / verified_by / verified_by_name. The name is a snapshot
--   of the admin's display name at verification time, so receipts keep it even
--   if that admin is later renamed or deleted (verified_by then becomes null).
-- * verify_order(p_order_id): the only way to set them. Admins only, paid
--   orders only, once only. There is no un-verify; mistakes are fixed by hand
--   in the SQL editor.
-- * orders still has no insert/update/delete grant for anyone.
-- * set_order_payment is unchanged: it never touches these columns, and paid
--   is final, so a later notification can't clear a verification.
-- * audit_log accepts a new action, 'order.verify', written by verify_order.
--
-- Rerunnable. Run after 20261123000100_g435_finish.sql.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.orders add column if not exists verified_at timestamptz;
alter table public.orders add column if not exists verified_by uuid;
alter table public.orders add column if not exists verified_by_name text;

alter table public.orders drop constraint if exists orders_verified_by_fkey;
alter table public.orders
  add constraint orders_verified_by_fkey
  foreign key (verified_by) references public.profiles (id) on delete set null;

-- All three null (not verified), or verified_at and verified_by_name both set
-- (verified_by may be null once the admin's account is deleted). Only a paid
-- order can be verified. The name is as long as a display name can be.
alter table public.orders drop constraint if exists orders_verified_check;
alter table public.orders
  add constraint orders_verified_check check (
    (verified_at is null and verified_by is null and verified_by_name is null)
    or (
      verified_at is not null
      and verified_by_name is not null
      and char_length(verified_by_name) between 1 and 50
      and status = 'paid'
    )
  );

-- The admin's "Needs verification" list: paid and not verified.
create index if not exists orders_needs_verification_idx
  on public.orders (created_at desc)
  where status = 'paid' and verified_at is null;

-- ---------------------------------------------------------------------------
-- audit_log: allow the 'order.verify' action (keep insert/update/delete)
-- ---------------------------------------------------------------------------

alter table public.audit_log drop constraint if exists audit_log_action_check;
alter table public.audit_log
  add constraint audit_log_action_check
  check (action in ('insert', 'update', 'delete', 'order.verify'));

-- ---------------------------------------------------------------------------
-- verify_order
--
-- Errors (the admin page maps them by hint):
-- * 42501            not signed in, or not an admin;
-- * P0002            no such order;
-- * P0001 hint 'already_verified'  "Order CS-… is already verified by X";
-- * P0001 hint 'not_paid'          the order isn't paid.
-- ---------------------------------------------------------------------------

create or replace function public.verify_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  cur public.orders;
  who text;
begin
  if me is null or not public.is_admin() then
    raise exception 'Only admins can verify orders' using errcode = '42501';
  end if;

  select * into cur from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if cur.verified_at is not null then
    raise exception 'Order % is already verified by %', cur.order_no, cur.verified_by_name
      using errcode = 'P0001', hint = 'already_verified';
  end if;

  if cur.status <> 'paid' then
    raise exception 'Only paid orders can be verified (order % is %)', cur.order_no, cur.status
      using errcode = 'P0001', hint = 'not_paid';
  end if;

  select nullif(btrim(p.display_name), '') into who
  from public.profiles p where p.id = me;
  who := coalesce(who, 'Admin');

  update public.orders set
    verified_at = now(),
    verified_by = me,
    verified_by_name = who
  where id = cur.id
  returning * into cur;

  insert into public.audit_log (actor, action, table_name, row_id, diff)
  values (
    me, 'order.verify', 'orders', cur.order_no,
    jsonb_build_object(
      'order_id', cur.id,
      'verified_by_name', cur.verified_by_name,
      'verified_at', cur.verified_at
    )
  );

  return cur;
end;
$$;

revoke all on function public.verify_order(uuid) from public, anon, authenticated;
grant execute on function public.verify_order(uuid) to authenticated;
