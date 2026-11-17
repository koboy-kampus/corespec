import { ExternalLink, FlaskConical } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABEL, isPcCategory } from "@/lib/categories";
import {
  BCA_VA_SIMULATOR_URL,
  QRIS_SIMULATOR_URL,
  SANDBOX_TEST_CARD,
  SIMULATION_BANNER,
  SIMULATION_STAMP,
} from "@/lib/checkout/sandbox";
import { formatIDR } from "@/lib/format";
import type { Category } from "@/types/parts";
import type { OrderItem, OrderStatus } from "@/types/supabase";

/**
 * The checkout simulation's shared pieces (Phase 17a), used by /checkout (in
 * the browser) and the order pages (on the server). No client-only code here.
 */

/** The banner every checkout and order screen shows. */
export function SimulationBanner({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "flex gap-3 rounded-card border border-warn/40 bg-warn/10 p-4 text-[14px] leading-5 text-fg",
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">{SIMULATION_BANNER}</p>
        <p lang="id" className="label-micro text-warn">
          {SIMULATION_STAMP}
        </p>
      </div>
    </div>
  );
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  expired: "Expired",
  cancelled: "Cancelled",
};

const STATUS_VARIANT = {
  pending: "warn",
  paid: "ok",
  failed: "error",
  expired: "neutral",
  cancelled: "neutral",
} as const;

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}

/** "bank_transfer" → "Bank transfer". */
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

/**
 * The order's items grouped PC / Setup, each with its Checked or Estimate
 * label, both subtotals and the total. From a snapshot: these are the prices
 * at checkout time, not today's.
 */
export function OrderItemsTable({
  items,
  pcIDR,
  setupIDR,
  totalIDR,
  caption = "Items in this order",
}: {
  items: readonly OrderItem[];
  pcIDR: number;
  setupIDR: number;
  totalIDR: number;
  caption?: string;
}) {
  const groups = [
    {
      title: "PC",
      rows: items.filter((i) => isPcCategory(i.category as Category)),
      subtotal: pcIDR,
    },
    {
      title: "Setup",
      rows: items.filter((i) => !isPcCategory(i.category as Category)),
      subtotal: setupIDR,
    },
  ].filter((g) => g.rows.length);

  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[480px] text-left text-[14px] leading-5">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line bg-surface label-micro text-fg-3">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Item
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Price
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Rupiah
            </th>
          </tr>
        </thead>
        {groups.map((g) => (
          <tbody
            key={g.title}
            className="divide-y divide-line border-b border-line"
          >
            <tr className="bg-surface-2/40">
              <th
                scope="colgroup"
                colSpan={3}
                className="px-4 py-2 label-micro font-medium text-fg-2"
              >
                {g.title}
              </th>
            </tr>
            {g.rows.map((i) => (
              <tr key={i.id} className="align-top text-fg-2">
                <th scope="row" className="px-4 py-3 font-normal">
                  <span className="block label-micro text-fg-3">
                    {CATEGORY_LABEL[i.category as Category] ?? i.category}
                  </span>
                  <span className="text-fg">
                    {i.brand} {i.name}
                  </span>
                </th>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "label-micro",
                      i.priceKind === "checked" ? "text-ok" : "text-fg-3",
                    )}
                  >
                    {i.priceKind === "checked" ? "Checked" : "Estimate"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right spec whitespace-nowrap text-fg">
                  {formatIDR(i.priceIDR)}
                </td>
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                colSpan={2}
                className="px-4 py-2 text-right font-normal text-fg-3"
              >
                {g.title} subtotal
              </th>
              <td className="px-4 py-2 text-right spec whitespace-nowrap text-fg-2">
                {formatIDR(g.subtotal)}
              </td>
            </tr>
          </tbody>
        ))}
        <tfoot>
          <tr>
            <th
              scope="row"
              colSpan={2}
              className="px-4 py-3 text-right font-semibold text-fg"
            >
              Total
            </th>
            <td className="px-4 py-3 text-right spec text-[16px] font-semibold whitespace-nowrap text-fg">
              {formatIDR(totalIDR)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** "How to pay in the sandbox": the test card and the simulators. */
export function SandboxHowTo({ className }: { className?: string }) {
  const link =
    "inline-flex items-center gap-1 text-fg underline underline-offset-2 hover:text-accent";
  return (
    <section
      aria-labelledby="sandbox-howto"
      className={cn(
        "flex flex-col gap-3 rounded-card border border-line bg-surface p-5 text-[14px] leading-5 text-fg-2",
        className,
      )}
    >
      <h2 id="sandbox-howto" className="text-h4 text-fg">
        How to pay in the sandbox
      </h2>
      <p>No real money moves. Use Midtrans&apos;s test details:</p>
      <ul className="flex list-disc flex-col gap-1.5 pl-5">
        <li>
          <span className="text-fg">Card:</span>{" "}
          <span className="spec">{SANDBOX_TEST_CARD.number}</span>, expiry{" "}
          {SANDBOX_TEST_CARD.expiry}, CVV{" "}
          <span className="spec">{SANDBOX_TEST_CARD.cvv}</span>, OTP{" "}
          <span className="spec">{SANDBOX_TEST_CARD.otp}</span>.
        </li>
        <li>
          <span className="text-fg">QRIS:</span> copy the QR image&apos;s
          address into the{" "}
          <a
            href={QRIS_SIMULATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={link}
          >
            QRIS simulator
            <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          . QRIS is limited to Rp 10.000.000 per payment.
        </li>
        <li>
          <span className="text-fg">BCA virtual account:</span> pay the number
          in the{" "}
          <a
            href={BCA_VA_SIMULATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={link}
          >
            BCA VA simulator
            <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          .
        </li>
      </ul>
    </section>
  );
}
