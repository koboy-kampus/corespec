"use client";

import { useCallback, useRef, useState } from "react";
import Script from "next/script";
import { SNAP_JS_URL } from "@/lib/checkout/sandbox";

/** What Midtrans's snap.js puts on window. */
interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}
declare global {
  interface Window {
    snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
  }
}

export type SnapOutcome = "success" | "pending" | "error" | "close";

/**
 * Loads Midtrans's Snap (sandbox) only when it's needed: the <Script> isn't
 * rendered until `pay` is first called, so no page loads snap.js just by being
 * opened. The client key is public by design; it goes in the tag's
 * data-client-key (next/script passes data- attributes through).
 *
 * `pay(token)` opens the pop-up and resolves with how it ended.
 */
export function useSnap() {
  const [load, setLoad] = useState(false);
  const ready = useRef<{
    promise: Promise<void>;
    resolve: () => void;
    reject: (e: Error) => void;
  } | null>(null);

  const whenReady = useCallback(() => {
    if (typeof window !== "undefined" && window.snap) return Promise.resolve();
    if (!ready.current) {
      let resolve!: () => void;
      let reject!: (e: Error) => void;
      const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      ready.current = { promise, resolve, reject };
    }
    setLoad(true);
    return ready.current.promise;
  }, []);

  const pay = useCallback(
    async (token: string): Promise<SnapOutcome> => {
      await whenReady();
      // While the pop-up is open, the chat button hides (globals.css), so it
      // never sits on top of Midtrans's window.
      const root = document.documentElement;
      root.dataset.paying = "";
      const done = (outcome: SnapOutcome) => {
        delete root.dataset.paying;
        return outcome;
      };
      return new Promise<SnapOutcome>((resolve) => {
        window.snap!.pay(token, {
          onSuccess: () => resolve(done("success")),
          onPending: () => resolve(done("pending")),
          onError: () => resolve(done("error")),
          onClose: () => resolve(done("close")),
        });
      });
    },
    [whenReady],
  );

  const script = load ? (
    <Script
      id="midtrans-snap"
      src={SNAP_JS_URL}
      data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
      strategy="afterInteractive"
      onReady={() => ready.current?.resolve()}
      onError={() => {
        ready.current?.reject(
          new Error("Couldn't load Midtrans's payment window."),
        );
        ready.current = null;
        setLoad(false);
      }}
    />
  ) : null;

  /** Starts loading snap.js early (e.g. while the order is being created). */
  const preload = useCallback(() => {
    void whenReady().catch(() => undefined);
  }, [whenReady]);

  return { pay, preload, script };
}
