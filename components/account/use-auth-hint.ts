"use client";

import { useSyncExternalStore } from "react";
import { HINT_EVENT, parseHint, type Hint } from "@/lib/auth/hint";

function subscribe(onChange: () => void) {
  window.addEventListener(HINT_EVENT, onChange);
  window.addEventListener("focus", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener(HINT_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}

const read = () => parseHint(document.cookie);

/**
 * Whether this browser looks logged in (the `cs-auth` hint, lib/auth/hint.ts).
 * Null on the server and in the first render, so pages stay static. Rechecked on
 * focus, on every navigation (HintWatcher) and when this tab logs in or out.
 */
export function useAuthHint(): Hint | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Tells every useAuthHint() to look at the cookie again. */
export function announceAuthChange() {
  window.dispatchEvent(new Event(HINT_EVENT));
}
