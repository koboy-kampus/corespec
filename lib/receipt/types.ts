import type { OrderItem, OrderStatus } from "@/types/supabase";

/** Today's compatibility check of the order's parts (see compat.ts). */
export interface CompatSummary {
  /** When the rules were run (ISO). Printed, since it isn't the order date. */
  checkedAt: string;
  /** How many rules ran (PC rules, plus the setup rules when there's a setup). */
  ruleCount: number;
  errors: string[];
  warnings: string[];
}

/** A captured 3D picture (JPEG or PNG bytes), or null when it couldn't be made. */
export type Picture = Uint8Array | null;

/** Everything the PDF receipt prints. Pure data: no catalogue, no DOM. */
export interface ReceiptData {
  orderNo: string;
  /** ISO time the order was created. */
  createdAt: string;
  buyerName: string;
  buildName: string;
  status: OrderStatus;
  /** Midtrans's payment_type, or null when none was chosen. */
  paymentType: string | null;
  transactionId: string | null;
  /** ISO time it was paid, if it was. */
  paidAt: string | null;
  /** The admin who verified the paid order (a snapshot of their name), or null. */
  verifiedByName: string | null;
  /** ISO time an admin verified it, or null when not verified (Phase 20a). */
  verifiedAt: string | null;
  /** The snapshot from checkout. */
  items: readonly OrderItem[];
  pcIDR: number;
  setupIDR: number;
  totalIDR: number;
  compat: CompatSummary;
  /** Absolute link to the build's share page. */
  shareUrl: string;
  pictures: {
    pc: Picture;
    /** Left out (undefined) when the order has no setup items. */
    desk?: Picture;
  };
}
