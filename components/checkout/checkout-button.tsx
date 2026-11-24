"use client";

import { useId } from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { useAuthHint } from "@/components/account/use-auth-hint";
import { Button } from "@/components/ui/button";
import type { CompatResult } from "@/lib/compat/check";
import { useCheckoutEnabled } from "./checkout-flag";

/** Why the build can't be checked out yet, or null when it can. */
export function checkoutBlocker(
  itemCount: number,
  results: readonly CompatResult[],
): string | null {
  if (!itemCount) return "Add a part to check out.";
  const errors = results.filter((r) => r.severity === "error").length;
  if (errors)
    return `Fix ${errors} compatibility error${errors === 1 ? "" : "s"} to check out.`;
  return null;
}

/**
 * The builder's "Checkout" button (Phase 17a). The compatibility
 * rules gate it: disabled, with the reason next to it, while the build is
 * empty or has errors (warnings and missing parts are fine). Guests go to the
 * login page first. Hidden when checkout isn't configured.
 */
export function CheckoutButton({
  itemCount,
  results,
}: {
  itemCount: number;
  results: readonly CompatResult[];
}) {
  const enabled = useCheckoutEnabled();
  const hint = useAuthHint();
  const reasonId = useId();
  if (!enabled) return null;

  const blocker = checkoutBlocker(itemCount, results);
  const href = hint ? "/checkout" : "/login?next=/checkout";

  return (
    <div className="flex flex-col gap-1.5">
      {blocker ? (
        <Button
          type="button"
          size="md"
          disabled
          aria-describedby={reasonId}
          icon={<CreditCard />}
        >
          Checkout
        </Button>
      ) : (
        <Button asChild size="md" icon={<CreditCard />}>
          <Link href={href}>Checkout</Link>
        </Button>
      )}
      {blocker ? (
        <p id={reasonId} className="text-[12px] leading-4 text-fg-3">
          {blocker}
        </p>
      ) : null}
    </div>
  );
}
