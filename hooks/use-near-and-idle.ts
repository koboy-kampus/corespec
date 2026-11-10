"use client";

import { useEffect, useState, type RefObject } from "react";

export interface NearAndIdleOptions {
  /** Start when the element is this close to the screen (CSS margin). Default 150px. */
  margin?: string;
  /** Or wait until this share of the element is on screen (0–1). Default 0. */
  minVisible?: number;
}
/** Give the browser at most this long to go idle before loading anyway. */
const IDLE_TIMEOUT_MS = 2500;

/** Runs `cb` once the page has finished loading and the main thread is idle. */
function afterLoadAndIdle(cb: () => void): () => void {
  let cancelled = false;
  let idleId: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const run = () => {
    if (cancelled) return;
    if ("requestIdleCallback" in window) {
      idleId = window.requestIdleCallback(() => !cancelled && cb(), {
        timeout: IDLE_TIMEOUT_MS,
      });
    } else {
      // Safari before 18 has no requestIdleCallback.
      timer = setTimeout(() => !cancelled && cb(), 200);
    }
  };
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", run);
    if (idleId !== undefined) window.cancelIdleCallback(idleId);
    if (timer !== undefined) clearTimeout(timer);
  };
}

/**
 * True once the element has come near the viewport *and* the page is idle after
 * loading. Heavy, non-essential widgets (the 3D scene outside the builder) wait for
 * this, so they never compete with the page's own first render and hydration.
 * When `enabled` is false it is true straight away.
 */
export function useNearAndIdle(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  { margin = "150px", minVisible = 0 }: NearAndIdleOptions = {},
): boolean {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || ready || !el) return;
    let cancelIdle: (() => void) | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || cancelIdle) return;
        if (entry.intersectionRatio < minVisible) return;
        io.disconnect();
        cancelIdle = afterLoadAndIdle(() => setReady(true));
      },
      { rootMargin: margin, threshold: minVisible },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelIdle?.();
    };
  }, [ref, enabled, ready, margin, minVisible]);

  return ready;
}
