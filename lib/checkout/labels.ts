import type { OrderStatus } from "@/types/supabase";

/** Order status names, shared by the order pages and the PDF receipt. */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
  cancelled: "Cancelled",
};

/** "bank_transfer" → "Bank transfer (VA)". */
export function paymentTypeLabel(type: string | null): string {
  if (!type) return "Not chosen yet";
  const known: Record<string, string> = {
    credit_card: "Card",
    bank_transfer: "Bank transfer (VA)",
    echannel: "Mandiri Bill",
    qris: "QRIS",
    gopay: "GoPay",
    shopeepay: "ShopeePay",
    cstore: "Convenience store",
  };
  return (
    known[type] ??
    type.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase())
  );
}
