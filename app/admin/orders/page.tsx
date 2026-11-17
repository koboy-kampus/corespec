import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { STATUS_LABEL, StatusBadge } from "@/components/checkout/order-parts";
import { SectionHeader } from "@/components/ui/section-header";
import { requireAdmin } from "@/lib/auth/dal";
import { isCheckoutConfigured } from "@/lib/checkout/config";
import { readAllOrders } from "@/lib/checkout/read";
import { formatWIB } from "@/lib/checkout/when";
import { formatIDR } from "@/lib/format";
import type { OrderStatus } from "@/types/supabase";
import { AdminSkeleton } from "../skeleton";

export const metadata: Metadata = {
  title: "Orders · Admin",
  robots: { index: false },
};

export default function Page({ searchParams }: PageProps<"/admin/orders">) {
  if (!isCheckoutConfigured()) notFound();
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

const STATUSES = Object.keys(STATUS_LABEL) as OrderStatus[];

async function Orders({
  searchParams,
}: Pick<PageProps<"/admin/orders">, "searchParams">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const raw = Array.isArray(sp.status) ? sp.status[0] : sp.status;
  const status = STATUSES.find((s) => s === raw);
  const { orders, names, error } = await readAllOrders(supabase, status);

  const chip = (label: string, href: string, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-[13px] text-accent"
          : "rounded-full border border-line px-3 py-1 text-[13px] text-fg-2 hover:border-line-hover hover:text-fg"
      }
    >
      {label}
    </Link>
  );

  return (
    <div className="container-page flex flex-col gap-8 py-10 md:py-14">
      <Link
        href="/admin"
        className="flex w-fit items-center gap-1.5 label-micro text-fg-3 hover:text-fg"
      >
        <ArrowLeft className="size-3.5" aria-hidden /> Admin
      </Link>
      <SectionHeader
        as="h1"
        eyebrow="Admin"
        title="Orders"
        subtitle="Every payment simulation (Midtrans Sandbox), newest first. Read-only: statuses only change through Midtrans."
        layout="split"
      />
      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {chip("All", "/admin/orders", !status)}
        {STATUSES.map((s) =>
          chip(STATUS_LABEL[s], `/admin/orders?status=${s}`, status === s),
        )}
      </nav>
      {error ? (
        <p role="alert" className="text-body text-fg-2">
          Couldn&apos;t load the orders. Reload to try again.
        </p>
      ) : !orders.length ? (
        <p className="text-body text-fg-2">
          {status
            ? `No ${STATUS_LABEL[status].toLowerCase()} orders.`
            : "No orders yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[720px] text-left text-[14px] leading-5">
            <caption className="sr-only">
              {status ? `${STATUS_LABEL[status]} orders` : "Every order"},
              newest first
            </caption>
            <thead className="border-b border-line bg-surface label-micro text-fg-3">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Order
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Account
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
                  <th
                    scope="row"
                    className="px-4 py-3 spec font-normal text-fg"
                  >
                    {o.order_no}
                  </th>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatWIB(o.created_at)}
                  </td>
                  <td className="max-w-44 truncate px-4 py-3">
                    {names.get(o.owner) ?? "—"}
                  </td>
                  <td className="max-w-56 truncate px-4 py-3">
                    {o.build_name}
                  </td>
                  <td className="px-4 py-3 text-right spec whitespace-nowrap">
                    {formatIDR(o.total_idr)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
