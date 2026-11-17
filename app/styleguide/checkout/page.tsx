import type { Metadata } from "next";
import {
  OrderItemsTable,
  SandboxHowTo,
  SimulationBanner,
  STATUS_LABEL,
  StatusBadge,
} from "@/components/checkout/order-parts";
import { loadCatalogue } from "@/lib/catalogue/load";
import { buildOrderDraft } from "@/lib/checkout/order";
import { presets } from "@/lib/presets";
import type { OrderStatus } from "@/types/supabase";

export const metadata: Metadata = {
  title: "Checkout pieces",
  robots: { index: false },
};

/**
 * Internal: the checkout simulation's shared pieces (banner, item table,
 * status badges, sandbox how-to) with a preset's real prices, so the e2e suite
 * can run axe on them without a login (the real pages need one).
 */
export default async function Page() {
  await loadCatalogue();
  const preset = presets.find((p) => p.setup)!;
  const draft = buildOrderDraft(
    { ...preset.parts, ...preset.setup },
    preset.name,
  );
  if (!draft.ok) throw new Error("the preset should be orderable");
  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-10">
      <h1 className="text-h2 text-fg">Checkout pieces</h1>
      <SimulationBanner />
      <div className="flex flex-wrap gap-2">
        {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </div>
      <OrderItemsTable
        items={draft.items}
        pcIDR={draft.pcIDR}
        setupIDR={draft.setupIDR}
        totalIDR={draft.totalIDR}
      />
      <SandboxHowTo />
    </div>
  );
}
