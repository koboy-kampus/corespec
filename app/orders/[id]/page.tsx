import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Share2 } from "lucide-react";
import { OrderActions } from "@/components/checkout/order-actions";
import {
  OrderItemsTable,
  paymentTypeLabel,
  SandboxHowTo,
  SimulationBanner,
  StatusBadge,
} from "@/components/checkout/order-parts";
import { requireSession } from "@/lib/auth/dal";
import { loadCatalogue } from "@/lib/catalogue/load";
import { isCheckoutConfigured } from "@/lib/checkout/config";
import { readMyOrder } from "@/lib/checkout/read";
import { formatWIB } from "@/lib/checkout/when";
import { encodeBuild } from "@/lib/share";

export const metadata: Metadata = {
  title: "Order",
  robots: { index: false },
};

export default function Page({ params }: PageProps<"/orders/[id]">) {
  if (!isCheckoutConfigured()) notFound();
  return (
    <div className="container-page flex max-w-3xl flex-col gap-8 py-10 md:py-14">
      <Link
        href="/orders"
        className="flex w-fit items-center gap-1.5 label-micro text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> My orders
      </Link>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            aria-label="Loading the order"
            className="h-96 animate-pulse rounded-card border border-line bg-surface"
          />
        }
      >
        <Order params={params} />
      </Suspense>
    </div>
  );
}

async function Order({ params }: Pick<PageProps<"/orders/[id]">, "params">) {
  const { id } = await params;
  const { supabase, viewer } = await requireSession(`/orders/${id}`);
  const order = await readMyOrder(supabase, viewer.id, id);
  // Missing, someone else's, or not an id at all: the same 404.
  if (!order) notFound();
  await loadCatalogue();
  const shareCode = encodeBuild({ name: order.build_name, parts: order.parts });

  const facts: [string, React.ReactNode][] = [
    [
      "Order number",
      <span key="n" className="spec">
        {order.order_no}
      </span>,
    ],
    ["Created", formatWIB(order.created_at)],
    ["Status", <StatusBadge key="s" status={order.status} />],
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="label-micro text-fg-3">Order · simulation</p>
        <h1 className="text-h2 text-fg">{order.build_name}</h1>
      </div>
      <SimulationBanner />

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-card border border-line bg-surface p-5 text-[14px] leading-5 sm:grid-cols-2">
        {facts.map(([k, v]) => (
          <div key={k} className="flex flex-col gap-1">
            <dt className="label-micro text-fg-3">{k}</dt>
            <dd className="text-fg">{v}</dd>
          </div>
        ))}
      </dl>

      {order.status === "pending" ? (
        <OrderActions orderId={order.id} canPay={!!order.snap_token} />
      ) : null}

      <OrderItemsTable
        items={order.items}
        pcIDR={order.pc_idr}
        setupIDR={order.setup_idr}
        totalIDR={order.total_idr}
      />
      <p className="text-[12px] leading-4 text-fg-3">
        Prices as they were at checkout, not today&apos;s.
      </p>

      <Link
        href={`/b/${shareCode}`}
        className="flex w-fit items-center gap-1.5 text-[14px] text-fg underline-offset-2 hover:text-accent hover:underline"
      >
        <Share2 className="size-4" aria-hidden /> Open this build&apos;s share
        page
      </Link>

      {order.status === "pending" ? <SandboxHowTo /> : null}
    </div>
  );
}
