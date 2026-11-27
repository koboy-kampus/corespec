"use client";

import { useCallback, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { receiptFileName } from "@/lib/receipt/text";
import type { ReceiptData } from "@/lib/receipt/types";
import type { ResolvedBuild, ResolvedSetup } from "@/types/parts";
import type { Captures } from "./capture-stage";

// The capture stage, three.js scenes, pdf-lib and the QR code all load on the
// first click, never with the page.
const CaptureStage = dynamic(
  () => import("./capture-stage").then((m) => m.CaptureStage),
  { ssr: false },
);

export type ReceiptOrder = Omit<ReceiptData, "pictures" | "shareUrl"> & {
  /** "/b/…": made absolute in the browser, so a preview links to itself. */
  sharePath: string;
};

/** A captured picture's bytes (JPEG since Phase 20b), from its data URL. */
function pictureBytes(dataUrl: string | null | undefined): Uint8Array | null {
  if (!dataUrl) return null;
  try {
    const bin = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

/**
 * "Download receipt (PDF)" (Phase 17b): captures the 3D pictures, lays out the
 * PDF in the browser and saves it as corespec-receipt-<order_no>.pdf. Works
 * for any status; the status is printed on it.
 */
export function ReceiptButton({
  order,
  resolved,
  setup,
}: {
  order: ReceiptOrder;
  resolved: ResolvedBuild;
  /** Undefined for a PC-only order. */
  setup?: ResolvedSetup;
}) {
  const [capturing, setCapturing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pdfLib = useRef<Promise<typeof import("@/lib/receipt/pdf")> | null>(
    null,
  );

  function start() {
    setBusy(true);
    setMessage(null);
    // pdf-lib loads while the scenes render.
    pdfLib.current = import("@/lib/receipt/pdf");
    pdfLib.current.catch(() => undefined);
    setCapturing(true);
  }

  const onCaptured = useCallback(
    async (captures: Captures) => {
      setCapturing(false);
      try {
        const { buildReceiptPdf } = await (pdfLib.current ??
          import("@/lib/receipt/pdf"));
        const { sharePath, ...rest } = order;
        const bytes = await buildReceiptPdf({
          ...rest,
          shareUrl: new URL(sharePath, window.location.origin).href,
          pictures: {
            pc: pictureBytes(captures.pc),
            ...("desk" in captures
              ? { desk: pictureBytes(captures.desk) }
              : {}),
          },
        });
        const url = URL.createObjectURL(
          new Blob([bytes as BlobPart], { type: "application/pdf" }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = receiptFileName(order.orderNo);
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        const missing = [captures.pc, captures.desk].filter(
          (p, i) => p === null && (i === 0 || "desk" in captures),
        ).length;
        setMessage(
          missing
            ? "Receipt downloaded. The 3D picture couldn't be made in this browser, so it says “3D preview unavailable”."
            : "Receipt downloaded.",
        );
      } catch (e) {
        console.error("[receipt] couldn't make the PDF", e);
        setMessage("Couldn't make the receipt. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [order],
  );

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secondary"
        icon={<FileDown />}
        onClick={start}
        disabled={busy}
        className="w-fit"
      >
        {busy ? "Making the receipt…" : "Download receipt (PDF)"}
      </Button>
      <p aria-live="polite" className="min-h-5 text-[14px] leading-5 text-fg-2">
        {message}
      </p>
      {capturing ? (
        <CaptureStage resolved={resolved} setup={setup} onDone={onCaptured} />
      ) : null}
    </div>
  );
}
