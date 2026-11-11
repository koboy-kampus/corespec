"use client";

import { useEffect, useState, type RefObject } from "react";

export interface NearAndIdleOptions {
  /** Start when the element is this close to the screen (CSS margin). Default 150px. */
  margin?: string;
  /** Or wait until this share of the element is on screen (0–1). Default 0. */
  minVisible?: number;
  /**
   * After going idle, also wait until the user first interacts (pointer, touch,
   * key, wheel or scroll) or this many ms pass, whichever comes first. For pure
   * decoration (the hero), so it never competes with the page settling.
   */
  quietMs?: number;
}
/** Give the browser at most this long to go idle before loading anyway. */
const IDLE_TIMEOUT_MS = 2500;

const INTERACTIONS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

/** Runs `cb` on the first user interaction, or after `ms`. */
function interactionOr(ms: number, cb: () => void): () => void {
  let fired = false;
  const fire = () => {
    if (fired) return;
    fired = true;
    stop();
    cb();
  };
  const timer = setTimeout(fire, ms);
  const stop = () => {
    clearTimeout(timer);
    for (const t of INTERACTIONS) window.removeEventListener(t, fire);
  };
  for (const t of INTERACTIONS)
    window.addEventListener(t, fire, { passive: true, once: true });
  return () => {
    fired = true;
    stop();
  };
}

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
  { margin = "150px", minVisible = 0, quietMs }: NearAndIdleOptions = {},
): boolean {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    const el = ref.current;
    if (!enabled || ready || !el) return;
    let cancelIdle: (() => void) | undefined;
    let cancelQuiet: (() => void) | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || cancelIdle) return;
        if (entry.intersectionRatio < minVisible) return;
        io.disconnect();
        cancelIdle = afterLoadAndIdle(() => {
          if (quietMs === undefined) setReady(true);
          else cancelQuiet = interactionOr(quietMs, () => setReady(true));
        });
      },
      { rootMargin: margin, threshold: minVisible },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelIdle?.();
      cancelQuiet?.();
    };
  }, [ref, enabled, ready, margin, minVisible, quietMs]);

  return ready;
}
