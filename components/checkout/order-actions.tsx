"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { refreshOrder, resumePayment } from "@/lib/checkout/actions";
import { useSnap } from "./use-snap";

/**
 * A pending order's controls (Phase 17a). On load it asks Midtrans once
 * (refreshOrder: the main path, which works where the webhook can't reach),
 * then offers "Check payment status" and "Continue payment".
 */
export function OrderActions({
  orderId,
  canPay,
}: {
  orderId: string;
  canPay: boolean;
}) {
  const router = useRouter();
  const { pay, script } = useSnap();
  const [checking, startChecking] = useTransition();
  const [paying, setPaying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const checkedOnLoad = useRef(false);

  const check = (quiet: boolean) =>
    startChecking(async () => {
      const r = await refreshOrder(orderId);
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      if (r.changed) router.refresh();
      else if (!quiet)
        setMessage(
          r.status === "pending"
            ? "Still pending: Midtrans hasn't received a payment yet."
            : "No change.",
        );
    });

  useEffect(() => {
    if (checkedOnLoad.current) return;
    checkedOnLoad.current = true;
    check(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onContinue() {
    setPaying(true);
    setMessage(null);
    try {
      const r = await resumePayment(orderId);
      if (!r.ok) {
        setMessage(r.error);
        return;
      }
      const outcome = await pay(r.token);
      if (outcome === "error")
        toast(
          "The payment didn't go through. Try again or pick another method.",
        );
      check(true);
    } catch {
      setMessage("Couldn't open Midtrans's payment window. Try again.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {script}
      <div className="flex flex-col gap-2 sm:flex-row">
        {canPay ? (
          <Button
            icon={<CreditCard />}
            onClick={onContinue}
            disabled={paying || checking}
          >
            {paying ? "Opening Midtrans…" : "Continue payment"}
          </Button>
        ) : null}
        <Button
          variant="secondary"
          icon={<RefreshCw className={checking ? "animate-spin" : undefined} />}
          onClick={() => check(false)}
          disabled={checking || paying}
        >
          {checking ? "Checking…" : "Check payment status"}
        </Button>
      </div>
      <p aria-live="polite" className="min-h-5 text-[14px] leading-5 text-fg-2">
        {message}
      </p>
    </div>
  );
}
