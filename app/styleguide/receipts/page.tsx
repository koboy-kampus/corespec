import type { Metadata } from "next";
import { ReceiptButton } from "@/components/receipt/receipt-button";
import { loadCatalogue } from "@/lib/catalogue/load";
import { buildOrderDraft } from "@/lib/checkout/order";
import { presets } from "@/lib/presets";
import { receiptProps } from "@/lib/receipt/props";

/**
 * The samples' share links and QR codes point at the live site rather than
 * whichever server made them (localhost in `npm run receipt:samples`): the
 * button resolves sharePath against the page's origin, and an absolute URL
 * passes through unchanged.
 */
const SAMPLE_ORIGIN = "https://corespec-eight.vercel.app";

export const metadata: Metadata = {
  title: "Receipt samples",
  robots: { index: false },
};

/**
 * Internal (Phase 20b): the PI's example receipts, one per preset, made from
 * made-up paid orders with today's catalogue. `npm run receipt:samples` clicks
 * each button and saves docs/pi/struk-contoh-*.pdf plus a PNG of page 1.
 * Three are verified by "Admin CoreSpec 1"; the Creator Workstation one is
 * also here unverified, for the before/after.
 */
export default async function Page() {
  await loadCatalogue();
  const samples = [
    ...presets.map((p) => ({ key: p.id, preset: p, verified: true })),
    {
      key: "belum-verifikasi",
      preset: presets.find((p) => p.id === "creator-workstation")!,
      verified: false,
    },
  ];
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-10">
      <h1 className="text-h2 text-fg">Receipt samples</h1>
      {samples.map(({ key, preset, verified }, i) => {
        const draft = buildOrderDraft(
          { ...preset.parts, ...preset.setup },
          preset.name,
        );
        if (!draft.ok) throw new Error(`${preset.id} should be orderable`);
        const order = {
          order_no: `CS-20261125-SAMPL${i + 1}`,
          created_at: "2026-11-25T03:05:00.000Z",
          build_name: draft.buildName,
          parts: draft.parts as Record<string, string>,
          status: "paid" as const,
          payment_type: "credit_card",
          midtrans_transaction_id: `00000000-0000-4000-8000-00000000000${i + 1}`,
          paid_at: "2026-11-25T03:07:00.000Z",
          verified_at: verified ? "2026-11-25T03:20:00.000Z" : null,
          verified_by_name: verified ? "Admin CoreSpec 1" : null,
          items: draft.items,
          pc_idr: draft.pcIDR,
          setup_idr: draft.setupIDR,
          total_idr: draft.totalIDR,
        };
        const props = receiptProps(
          order,
          "Rei",
          new Date("2026-11-25T03:10:00Z"),
        );
        props.order.sharePath = SAMPLE_ORIGIN + props.order.sharePath;
        return (
          <section
            key={key}
            aria-labelledby={`sample-${key}`}
            data-testid={`struk-${key}`}
            className="flex flex-col gap-3"
          >
            <h2 id={`sample-${key}`} className="text-h4 text-fg">
              {preset.name} ({verified ? "verified" : "not verified"})
            </h2>
            <ReceiptButton {...props} />
          </section>
        );
      })}
    </div>
  );
}
