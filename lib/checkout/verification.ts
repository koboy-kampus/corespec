import type { OrderRow } from "@/types/supabase";
import { formatWIB } from "./when";

/**
 * Admin verification of paid orders (Phase 20a). An admin verifies a paid
 * order through public.verify_order(); the order keeps the admin's name and
 * the time. Shared by the order pages, the admin pages and their tests.
 */

type Verifiable = Pick<OrderRow, "status" | "verified_at" | "verified_by_name">;

export const AWAITING_VERIFICATION = "Paid · awaiting admin verification";

export function isVerified(o: Verifiable): boolean {
  return !!o.verified_at;
}

/** Paid and not verified yet: what the admin's "Needs verification" lists. */
export function needsVerification(o: Verifiable): boolean {
  return o.status === "paid" && !o.verified_at;
}

/**
 * The line under the status: "Verified by Admin Rei · 25 Nov 2026, 14:05 WIB",
 * "Paid · awaiting admin verification", or null (not paid, nothing to say).
 */
export function verificationLine(o: Verifiable): string | null {
  if (o.verified_at)
    return `Verified by ${o.verified_by_name || "Admin"} · ${formatWIB(o.verified_at)}`;
  if (o.status === "paid") return AWAITING_VERIFICATION;
  return null;
}

/** What verify_order's errors mean to the admin who pressed Verify. */
export function verifyErrorMessage(error: {
  message?: string;
  code?: string;
  hint?: string | null;
}): string {
  if (error.hint === "already_verified") {
    const who = /already verified by (.+)$/.exec(error.message ?? "")?.[1];
    return who
      ? `Already verified by ${who}. Nothing to do.`
      : "Someone already verified this order. Nothing to do.";
  }
  if (error.hint === "not_paid")
    return "Only paid orders can be verified. This one isn't paid.";
  if (error.code === "42501") return "Only admins can verify orders.";
  if (error.code === "P0002") return "That order doesn't exist anymore.";
  return "Couldn't verify the order. Try again.";
}
