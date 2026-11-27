"use client";

import { useState, useTransition } from "react";
import { BadgeCheck } from "lucide-react";
import { FormMessage } from "@/components/account/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { verifyOrder } from "@/lib/admin/order-actions";

/**
 * "Verify" on a paid, unverified order (Phase 20a), for /admin/orders and
 * /admin/orders/[id]. Asks first, because the admin's name goes on the
 * receipt and there's no un-verify in the app. The outcome is a toast, since
 * the row's button goes away once the list refreshes.
 */
export function VerifyOrderButton({
  orderId,
  orderNo,
  adminName,
  size = "sm",
}: {
  orderId: string;
  orderNo: string;
  /** The signed-in admin's display name: what the receipt will say. */
  adminName: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const r = await verifyOrder(orderId);
      if (r.ok) {
        setOpen(false);
        toast(`Verified ${r.orderNo} as ${r.name}`);
      } else if (r.settled) {
        setOpen(false);
        toast(r.error);
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <>
      <Button
        size={size}
        variant="secondary"
        icon={<BadgeCheck />}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        aria-label={`Verify order ${orderNo}`}
      >
        Verify
      </Button>
      <Dialog open={open} onOpenChange={(o) => !pending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Verify order <span className="spec">{orderNo}</span> as{" "}
              {adminName}?
            </DialogTitle>
            <DialogDescription>
              Your name and the time go on the order and its receipt
              (&ldquo;Diverifikasi oleh: {adminName}&rdquo;). This can&apos;t be
              undone in the app.
            </DialogDescription>
          </DialogHeader>
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              icon={<BadgeCheck />}
              onClick={confirm}
              disabled={pending}
            >
              {pending ? "Verifying…" : "Verify order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
