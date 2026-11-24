import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusWithVerification } from "@/components/checkout/order-parts";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { requireSession } from "@/lib/auth/dal";
import { isCheckoutConfigured } from "@/lib/checkout/config";
import { readMyOrders } from "@/lib/checkout/read";
import { formatWIB } from "@/lib/checkout/when";
import { formatIDR } from "@/lib/format";

export const metadata: Metadata = {
  title: "My orders",
  robots: { index: false },
};

export default function Page() {
  if (!isCheckoutConfigured()) notFound();
  return (
    <div className="container-page flex max-w-4xl flex-col gap-8 py-10 md:py-14">
      <SectionHeader
        as="h1"
        eyebrow="Checkout"
        title="My orders"
        subtitle="Your orders and their payment status, newest first."
      />
      <Suspense
        fallback={
          <div
            aria-busy="true"
            aria-label="Loading your orders"
            className="h-48 animate-pulse rounded-card border border-line bg-surface"
          />
        }
      >
        <Orders />
      </Suspense>
    </div>
  );
}

async function Orders() {
  const { supabase, viewer } = await requireSession("/orders");
  const { orders, error } = await readMyOrders(supabase, viewer.id);
  if (error)
    return (
      <p role="alert" className="text-body text-fg-2">
        Couldn&apos;t load your orders. Reload to try again.
      </p>
    );
  if (!orders.length)
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6">
        <p className="text-body text-fg-2">
          No orders yet. Check out a build from the builder to place one.
        </p>
        <Button asChild variant="secondary">
          <Link href="/builder">Open the builder</Link>
        </Button>
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full min-w-[600px] text-left text-[14px] leading-5">
        <caption className="sr-only">Your orders, newest first</caption>
        <thead className="border-b border-line bg-surface label-micro text-fg-3">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Order
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Date
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Build
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Total
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {orders.map((o) => (
            <tr key={o.id} className="text-fg-2">
              <th scope="row" className="px-4 py-3 font-normal">
                <Link
                  href={`/orders/${o.id}`}
                  className="spec text-fg underline-offset-2 hover:text-accent hover:underline"
                >
                  {o.order_no}
                </Link>
              </th>
              <td className="px-4 py-3 whitespace-nowrap">
                {formatWIB(o.created_at)}
              </td>
              <td className="max-w-56 truncate px-4 py-3">{o.build_name}</td>
              <td className="px-4 py-3 text-right spec whitespace-nowrap">
                {formatIDR(o.total_idr)}
              </td>
              <td className="px-4 py-3">
                <StatusWithVerification order={o} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
