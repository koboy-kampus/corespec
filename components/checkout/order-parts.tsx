import { BadgeCheck, Clock } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABEL, isPcCategory } from "@/lib/categories";
import { paymentTypeLabel, STATUS_LABEL } from "@/lib/checkout/labels";
import { verificationLine } from "@/lib/checkout/verification";
import { formatIDR } from "@/lib/format";
import type { Category } from "@/types/parts";
import type { OrderItem, OrderRow, OrderStatus } from "@/types/supabase";

/**
 * The checkout's shared pieces (Phase 17a), used by /checkout (in
 * the browser) and the order pages (on the server). No client-only code here.
 */

export { paymentTypeLabel, STATUS_LABEL };

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

/**
 * The admin verification line under the status (Phase 20a): "Verified by
 * {name} · {date} WIB", "Paid · awaiting admin verification", or nothing.
 */
export function VerificationNote({
  order,
  className,
}: {
  order: Pick<OrderRow, "status" | "verified_at" | "verified_by_name">;
  className?: string;
}) {
  const line = verificationLine(order);
  if (!line) return null;
  const Icon = order.verified_at ? BadgeCheck : Clock;
  return (
    <span
      className={cn(
        "flex items-start gap-1.5 text-[12px] leading-4",
        order.verified_at ? "text-ok" : "text-fg-3",
        className,
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{line}</span>
    </span>
  );
}

/** The status badge with the verification line under it. */
export function StatusWithVerification({
  order,
}: {
  order: Pick<OrderRow, "status" | "verified_at" | "verified_by_name">;
}) {
  return (
    <span className="flex flex-col items-start gap-1">
      <StatusBadge status={order.status} />
      <VerificationNote order={order} />
    </span>
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
