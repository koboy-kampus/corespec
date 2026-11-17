import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Supabase } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import type { Database, OrderRow } from "@/types/supabase";
import { OrderLimitError, OrderNoTakenError, type OrderStore } from "./service";

/** Columns the site reads (everything). */
export const ORDER_COLUMNS =
  "id, order_no, owner, build_name, parts, items, pc_idr, setup_idr, total_idr, status, payment_type, midtrans_transaction_id, snap_token, created_at, updated_at, paid_at";

/**
 * Orders in Supabase. Reads run as the visitor (RLS: their own, or all for an
 * admin). Writes go through create_order / set_order_payment with
 * ORDER_WRITE_SECRET; nobody can write the table directly.
 */
export function supabaseOrderStore(
  db: SupabaseClient<Database>,
  secret: string,
): OrderStore {
  return {
    async read(id) {
      const { data, error } = await db
        .from("orders")
        .select(ORDER_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as OrderRow | null) ?? null;
    },

    async create(o) {
      const { data, error } = await db.rpc("create_order", {
        p_secret: secret,
        p_owner: o.owner,
        p_order_no: o.orderNo,
        p_build_name: o.buildName,
        p_parts: o.parts,
        p_items: o.items,
        p_pc_idr: o.pcIDR,
        p_setup_idr: o.setupIDR,
        p_total_idr: o.totalIDR,
      });
      if (error) {
        if (error.hint === "order_limit")
          throw new OrderLimitError(error.message);
        if (error.code === "23505") throw new OrderNoTakenError(error.message);
        throw new Error(`create_order: ${error.code ?? ""} ${error.message}`);
      }
      return data as OrderRow;
    },

    async setPayment(orderNo, patch) {
      const { data, error } = await db.rpc("set_order_payment", {
        p_secret: secret,
        p_order_no: orderNo,
        p_status: patch.status ?? null,
        p_payment_type: patch.paymentType?.slice(0, 40) ?? null,
        p_transaction_id: patch.transactionId?.slice(0, 100) ?? null,
        p_snap_token: patch.snapToken ?? null,
      });
      if (error)
        throw new Error(
          `set_order_payment: ${error.code ?? ""} ${error.message}`,
        );
      return ((data as OrderRow[] | null) ?? [])[0] ?? null;
    },
  };
}

/** The visitor's own client (Server Actions and pages). */
export const sessionOrderStore = (supabase: Supabase, secret: string) =>
  supabaseOrderStore(supabase, secret);

/** A client with no session, for Midtrans's notification (the functions need the secret). */
export async function anonOrderStore(
  secret: string,
): Promise<OrderStore | null> {
  const config = supabaseConfig();
  if (!config) return null;
  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient<Database>(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabaseOrderStore(db, secret);
}
