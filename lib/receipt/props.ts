import { deriveBuild } from "@/lib/derive";
import { encodeBuild } from "@/lib/share";
import type { OrderRow } from "@/types/supabase";
import type { ResolvedBuild, ResolvedSetup } from "@/types/parts";
import type { ReceiptOrder } from "@/components/receipt/receipt-button";
import { compatSummary } from "./compat";

type OrderForReceipt = Pick<
  OrderRow,
  | "order_no"
  | "created_at"
  | "build_name"
  | "parts"
  | "status"
  | "payment_type"
  | "midtrans_transaction_id"
  | "paid_at"
  | "verified_at"
  | "verified_by_name"
  | "items"
  | "pc_idr"
  | "setup_idr"
  | "total_idr"
>;

/**
 * What the receipt button needs, worked out on the server (the catalogue isn't
 * shipped to the browser): the order's data, its parts resolved for the 3D
 * pictures, and today's compatibility check. Call after loadCatalogue().
 */
export function receiptProps(
  order: OrderForReceipt,
  buyerName: string,
  now = new Date(),
): { order: ReceiptOrder; resolved: ResolvedBuild; setup?: ResolvedSetup } {
  const derived = deriveBuild(order.parts);
  return {
    order: {
      orderNo: order.order_no,
      createdAt: order.created_at,
      buyerName,
      buildName: order.build_name,
      status: order.status,
      paymentType: order.payment_type,
      transactionId: order.midtrans_transaction_id,
      paidAt: order.paid_at,
      verifiedByName: order.verified_by_name,
      verifiedAt: order.verified_at,
      items: order.items,
      pcIDR: order.pc_idr,
      setupIDR: order.setup_idr,
      totalIDR: order.total_idr,
      compat: compatSummary(order.parts, now),
      sharePath: `/b/${encodeBuild({ name: order.build_name, parts: order.parts })}`,
    },
    resolved: derived.resolved,
    setup: derived.setupFilled > 0 ? derived.setup : undefined,
  };
}
