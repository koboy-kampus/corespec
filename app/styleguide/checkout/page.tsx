import type { Metadata } from "next";
import {
  OrderItemsTable,
  STATUS_LABEL,
  StatusBadge,
  StatusWithVerification,
} from "@/components/checkout/order-parts";
import { loadCatalogue } from "@/lib/catalogue/load";
import { ReceiptButton } from "@/components/receipt/receipt-button";
import { buildOrderDraft, type OrderDraft } from "@/lib/checkout/order";
import { receiptProps } from "@/lib/receipt/props";
import { presets } from "@/lib/presets";
import type { OrderStatus } from "@/types/supabase";

export const metadata: Metadata = {
  title: "Checkout pieces",
  robots: { index: false },
};

/**
 * Internal: the checkout's shared pieces (item table, status badges and
 * verification lines, the PDF receipt) with a preset's real prices, so the e2e suite
 * can run axe on them without a login (the real pages need one).
 */
export default async function Page() {
  await loadCatalogue();
  const preset = presets.find((p) => p.setup)!;
  const draft = buildOrderDraft(
    { ...preset.parts, ...preset.setup },
    preset.name,
  );
  const pcOnly = buildOrderDraft(preset.parts, preset.name);
  if (!draft.ok || !pcOnly.ok)
    throw new Error("the preset should be orderable");
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-10">
      <h1 className="text-h2 text-fg">Checkout pieces</h1>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </div>
      <div className="flex flex-wrap gap-6">
        <StatusWithVerification
          order={{ status: "paid", verified_at: null, verified_by_name: null }}
        />
        <StatusWithVerification
          order={{
            status: "paid",
            verified_at: "2026-11-19T03:20:00.000Z",
            verified_by_name: "Admin Rei",
          }}
        />
      </div>
      <OrderItemsTable
        items={draft.items}
        pcIDR={draft.pcIDR}
        setupIDR={draft.setupIDR}
        totalIDR={draft.totalIDR}
      />
      <section
        aria-labelledby="sample-receipt"
        className="flex flex-col gap-3"
        data-testid="sample-receipt"
      >
        <h2 id="sample-receipt" className="text-h4 text-fg">
          Example receipt (PC and setup)
        </h2>
        <ReceiptButton
          {...receiptProps(sampleOrder(draft, "paid"), "Rei", SAMPLE_CHECKED)}
        />
      </section>
      <section
        aria-labelledby="sample-receipt-pc"
        className="flex flex-col gap-3"
        data-testid="sample-receipt-pc"
      >
        <h2 id="sample-receipt-pc" className="text-h4 text-fg">
          Example receipt (PC only)
        </h2>
        <ReceiptButton
          {...receiptProps(
            sampleOrder(pcOnly, "pending"),
            "Rei",
            SAMPLE_CHECKED,
          )}
        />
      </section>
    </div>
  );
}

/** A fixed "checked" date: this page is prerendered, so it can't read the clock. */
const SAMPLE_CHECKED = new Date("2026-11-19T03:10:00.000Z");

/** A made-up order around a draft, as the order page would read it. */
function sampleOrder(draft: OrderDraft, status: OrderStatus) {
  const paid = status === "paid";
  return {
    order_no: paid ? "CS-20261119-SAMPLE" : "CS-20261119-PCONLY",
    created_at: "2026-11-19T03:05:00.000Z",
    build_name: draft.buildName,
    parts: draft.parts as Record<string, string>,
    status,
    payment_type: paid ? "credit_card" : null,
    midtrans_transaction_id: paid
      ? "00000000-0000-4000-8000-000000000000"
      : null,
    paid_at: paid ? "2026-11-19T03:07:00.000Z" : null,
    // The paid sample is verified, so its receipt shows the name and stamp.
    verified_at: paid ? "2026-11-19T03:20:00.000Z" : null,
    verified_by_name: paid ? "Admin Rei" : null,
    items: draft.items,
    pc_idr: draft.pcIDR,
    setup_idr: draft.setupIDR,
    total_idr: draft.totalIDR,
  };
}
