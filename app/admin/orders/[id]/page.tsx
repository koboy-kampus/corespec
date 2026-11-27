import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { VerifyOrderButton } from "@/components/admin/verify-order";
import {
  OrderItemsTable,
  paymentTypeLabel,
  StatusWithVerification,
} from "@/components/checkout/order-parts";
import { ReceiptButton } from "@/components/receipt/receipt-button";
import { requireAdmin } from "@/lib/auth/dal";
import { loadCatalogue } from "@/lib/catalogue/load";
import { isCheckoutConfigured } from "@/lib/checkout/config";
import { readOrderForAdmin } from "@/lib/checkout/read";
import { needsVerification } from "@/lib/checkout/verification";
import { formatWIB } from "@/lib/checkout/when";
import { receiptProps } from "@/lib/receipt/props";
import { AdminSkeleton } from "../../skeleton";

export const metadata: Metadata = {
  title: "Order · Admin",
  robots: { index: false },
};

/**
 * One order, for admins (Phase 20a): the same detail as the buyer's order
 * page plus the buyer's name, Verify and the receipt, so an admin can verify
 * and show the receipt without signing in as the buyer. Read-only otherwise.
 */
export default function Page({ params }: PageProps<"/admin/orders/[id]">) {
  if (!isCheckoutConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Order params={params} />
    </Suspense>
  );
}

async function Order({
  params,
}: Pick<PageProps<"/admin/orders/[id]">, "params">) {
  const { id } = await params;
  const { supabase, viewer } = await requireAdmin();
  const found = await readOrderForAdmin(supabase, id);
  if (!found) notFound();
  const { order, ownerName } = found;
  await loadCatalogue();
  const buyer = ownerName ?? "Deleted account";
  const receipt = receiptProps(order, buyer);

  const facts: [string, React.ReactNode][] = [
    [
      "Order number",
      <span key="n" className="spec">
        {order.order_no}
      </span>,
    ],
    ["Buyer", buyer],
    ["Created", formatWIB(order.created_at)],
    ["Status", <StatusWithVerification key="s" order={order} />],
    ["Payment method", paymentTypeLabel(order.payment_type)],
    ...(order.paid_at
      ? ([["Paid", formatWIB(order.paid_at)]] as [string, string][])
      : []),
    ...(order.midtrans_transaction_id
      ? ([
          [
            "Midtrans transaction",
            <span key="t" className="spec break-all">
              {order.midtrans_transaction_id}
            </span>,
          ],
        ] as [string, React.ReactNode][])
      : []),
  ];

  return (
    <div className="container-page flex max-w-3xl flex-col gap-6 py-10 md:py-14">
      <Link
        href="/admin/orders"
        className="flex w-fit items-center gap-1.5 label-micro text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Orders
      </Link>
      <div className="flex flex-col gap-2">
        <p className="label-micro text-fg-3">Admin · order</p>
        <h1 className="text-h2 text-fg">{order.build_name}</h1>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-card border border-line bg-surface p-5 text-[14px] leading-5 sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1">
            <dt className="label-micro text-fg-3">{k}</dt>
            <dd className="text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-start gap-3">
        {needsVerification(order) ? (
          <VerifyOrderButton
            orderId={order.id}
            orderNo={order.order_no}
            adminName={viewer.displayName}
            size="md"
          />
        ) : null}
        <ReceiptButton {...receipt} />
      </div>

      <OrderItemsTable
        items={order.items}
        pcIDR={order.pc_idr}
        setupIDR={order.setup_idr}
        totalIDR={order.total_idr}
      />
      <p className="text-[12px] leading-4 text-fg-3">
        Prices as they were at checkout, not today&apos;s.
      </p>
    </div>
  );
}
