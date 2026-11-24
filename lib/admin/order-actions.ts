"use server";

import { refresh } from "next/cache";
import { getSession } from "@/lib/auth/dal";
import { verifyErrorMessage } from "@/lib/checkout/verification";

export type VerifyResult =
  | { ok: true; orderNo: string; name: string }
  /** `settled`: someone already verified it, so the list is out of date, not wrong. */
  | { ok: false; error: string; settled?: boolean };

/**
 * Verify a paid order as the signed-in admin (Phase 20a). Re-checks that the
 * caller is an admin (anyone can POST to a Server Action); the database checks
 * again inside public.verify_order(), which also refuses unpaid and
 * already-verified orders and writes the audit log.
 */
export async function verifyOrder(orderId: unknown): Promise<VerifyResult> {
  const session = await getSession();
  if (!session || session.viewer.role !== "admin")
    return { ok: false, error: "Only admins can verify orders." };
  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId))
    return { ok: false, error: "That request wasn't valid." };

  const { data, error } = await session.supabase.rpc("verify_order", {
    p_order_id: orderId,
  });
  if (error || !data) {
    const settled = error?.hint === "already_verified";
    // Already verified by someone else: show the list as it is now.
    if (settled) refresh();
    return {
      ok: false,
      error: verifyErrorMessage(error ?? {}),
      settled,
    };
  }
  refresh();
  return {
    ok: true,
    orderNo: data.order_no,
    name: data.verified_by_name ?? session.viewer.displayName,
  };
}
