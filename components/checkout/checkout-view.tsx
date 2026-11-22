"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useBuildDerived, useBuildHydration } from "@/hooks/use-build";
import { startCheckout } from "@/lib/checkout/actions";
import { buildOrderDraft } from "@/lib/checkout/order";
import { useBuildStore } from "@/store/build";
import { OrderItemsTable, SandboxHowTo, SimulationBanner } from "./order-parts";
import { useSnap } from "./use-snap";

/**
 * /checkout (Phase 17a): the current build from this browser, priced exactly
 * as the server will price it (the same buildOrderDraft), then "Pay with
 * Midtrans (sandbox)". The server recalculates everything; nothing on this
 * page is trusted.
 */
export function CheckoutView() {
  const hydrated = useBuildHydration();
  const build = useBuildStore((s) => s.build);
  const { results, setupResults } = useBuildDerived();
  const router = useRouter();
  const { pay, preload, script } = useSnap();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated)
    return (
      <div
        aria-busy="true"
        aria-label="Loading your build"
        className="h-64 animate-pulse rounded-card border border-line bg-surface"
      />
    );

  const draft = buildOrderDraft(build.parts, build.name);
  if (!draft.ok)
    return (
      <div className="flex flex-col items-start gap-4 rounded-card border border-line bg-surface p-6">
        <p className="text-body text-fg">
          {draft.reason === "empty"
            ? "Your build is empty. Add some parts first."
            : `Your build has ${draft.errors} compatibility error${draft.errors === 1 ? "" : "s"}. Fix ${draft.errors === 1 ? "it" : "them"} in the builder to check out.`}
        </p>
        <Button asChild variant="secondary" icon={<ArrowLeft />}>
          <Link href="/builder">Back to the builder</Link>
        </Button>
      </div>
    );

  const warnings = [...results, ...setupResults].filter(
    (r) => r.severity === "warning",
  );

  async function onPay() {
    setBusy(true);
    setError(null);
    preload();
    try {
      const r = await startCheckout({ name: build.name, parts: build.parts });
      if (!r.ok) {
        if (r.code === "login") {
          router.push("/login?next=/checkout");
          return;
        }
        setError(r.error);
        return;
      }
      let outcome;
      try {
        outcome = await pay(r.token);
      } catch {
        // snap.js didn't load: the order exists, so continue from its page.
        router.push(`/orders/${r.orderId}`);
        return;
      }
      if (outcome === "error") {
        toast(
          "The payment didn't go through. Try again or pick another method.",
        );
        return;
      }
      router.push(`/orders/${r.orderId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {script}
      <SimulationBanner />

      <div className="flex flex-col gap-1">
        <p className="label-micro text-fg-3">Build</p>
        <p className="text-h3 text-fg">{draft.buildName}</p>
      </div>

      <OrderItemsTable
        items={draft.items}
        pcIDR={draft.pcIDR}
        setupIDR={draft.setupIDR}
        totalIDR={draft.totalIDR}
        caption="Items in this checkout"
      />

      <p className="flex items-start gap-2 text-[14px] leading-5 text-fg-2">
        {warnings.length ? (
          <>
            <AlertTriangle
              className="mt-0.5 size-4 shrink-0 text-warn"
              aria-hidden
            />
            <span>
              Compatible, with {warnings.length} warning
              {warnings.length === 1 ? "" : "s"}:{" "}
              {warnings.map((w) => w.message).join(" ")}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-ok"
              aria-hidden
            />
            <span>Compatible: no errors or warnings.</span>
          </>
        )}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button size="lg" icon={<CreditCard />} onClick={onPay} disabled={busy}>
          {busy ? "Opening Midtrans…" : "Pay with Midtrans (sandbox)"}
        </Button>
        <Button asChild variant="ghost" icon={<ArrowLeft />}>
          <Link href="/builder">Edit the build</Link>
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[14px] leading-5 text-accent">
          {error}
        </p>
      ) : null}
      <p className="text-[12px] leading-4 text-fg-3">
        The server recalculates every price from the catalogue when you pay.
        Midtrans gets the order number, the item names and prices, and your
        display name. Never your email.
      </p>

      <SandboxHowTo />
    </div>
  );
}
