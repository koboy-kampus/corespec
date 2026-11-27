import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import type { OrderRow, OrderStatus } from "@/types/supabase";
import { ORDER_COLUMNS } from "./store";

/** The visitor's own orders, newest first (an admin's own too, not everyone's). */
export async function readMyOrders(supabase: Supabase, owner: string) {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("owner", owner)
    .order("created_at", { ascending: false })
    .limit(200);
  return { orders: (data ?? []) as OrderRow[], error: !!error };
}

/** One of the visitor's own orders, or null (missing, someone else's, or a bad id). */
export async function readMyOrder(
  supabase: Supabase,
  owner: string,
  id: string,
): Promise<OrderRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", id)
    .eq("owner", owner)
    .maybeSingle();
  return (data as OrderRow | null) ?? null;
}

/** The admin list's filters: a status, or paid orders nobody has verified yet. */
export type AdminOrderFilter = OrderStatus | "needs-verification";

/** Every order (admins only: RLS returns nothing else to anyone else). */
export async function readAllOrders(
  supabase: Supabase,
  filter?: AdminOrderFilter,
) {
  let q = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter === "needs-verification")
    q = q.eq("status", "paid").is("verified_at", null);
  else if (filter) q = q.eq("status", filter);
  const { data, error } = await q;
  const orders = (data ?? []) as OrderRow[];
  const names = await ownerNames(
    supabase,
    orders.map((o) => o.owner),
  );
  return { orders, names, error: !!error };
}

/** How many paid orders wait for an admin's verification; null if unknown. */
export async function countNeedsVerification(
  supabase: Supabase,
): Promise<number | null> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("status", "paid")
    .is("verified_at", null);
  return error ? null : (count ?? 0);
}

/** Any one order, with its owner's display name (admins only, through RLS). */
export async function readOrderForAdmin(
  supabase: Supabase,
  id: string,
): Promise<{ order: OrderRow; ownerName: string | null } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  const order = (data as OrderRow | null) ?? null;
  if (!order) return null;
  const names = await ownerNames(supabase, [order.owner]);
  return { order, ownerName: names.get(order.owner) ?? null };
}

async function ownerNames(supabase: Supabase, ids: string[]) {
  const owners = [...new Set(ids)];
  const names = new Map<string, string>();
  if (owners.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", owners);
    for (const p of profiles ?? []) names.set(p.id, p.display_name);
  }
  return names;
}
