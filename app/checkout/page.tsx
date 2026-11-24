import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { SectionHeader } from "@/components/ui/section-header";
import { requireSession } from "@/lib/auth/dal";
import { isCheckoutConfigured } from "@/lib/checkout/config";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function Page() {
  if (!isCheckoutConfigured()) notFound();
  return (
    <div className="container-page flex max-w-3xl flex-col gap-8 py-10 md:py-14">
      <SectionHeader
        as="h1"
        eyebrow="Checkout"
        title="Checkout"
        subtitle="Check the order, then pay with Midtrans."
      />
      <Suspense
        fallback={
          <div
            aria-busy="true"
            aria-label="Loading"
            className="h-64 animate-pulse rounded-card border border-line bg-surface"
          />
        }
      >
        <Checkout />
      </Suspense>
    </div>
  );
}

async function Checkout() {
  await requireSession("/checkout");
  return <CheckoutView />;
}
