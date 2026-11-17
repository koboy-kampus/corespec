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

/** Every order (admins only: RLS returns nothing else to anyone else). */
export async function readAllOrders(supabase: Supabase, status?: OrderStatus) {
  let q = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  const orders = (data ?? []) as OrderRow[];
  const owners = [...new Set(orders.map((o) => o.owner))];
  const names = new Map<string, string>();
  if (owners.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", owners);
    for (const p of profiles ?? []) names.set(p.id, p.display_name);
  }
  return { orders, names, error: !!error };
}
