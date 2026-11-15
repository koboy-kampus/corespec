"use client";

import { useEffect, useSyncExternalStore } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "./button";

/**
 * One short message at a time ("Link copied", "Deleted …"), announced politely
 * and gone after a few seconds. Call `toast("…")` from anywhere in the browser;
 * <Toaster /> (root layout) shows it. The live region is always in the page,
 * so screen readers hear the first message too.
 */

interface Toast {
  id: number;
  message: string;
}

const SHOW_MS = 4000;
let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function toast(message: string) {
  current = { id: nextId++, message };
  emit();
}

export function dismissToast() {
  current = null;
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function Toaster() {
  const t = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );

  useEffect(() => {
    if (!t) return;
    const timer = setTimeout(() => {
      if (current?.id === t.id) dismissToast();
    }, SHOW_MS);
    return () => clearTimeout(timer);
  }, [t]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4 pb-[env(safe-area-inset-bottom)]"
    >
      {t ? (
        <div
          key={t.id}
          data-testid="toast"
          className="pointer-events-auto flex max-w-sm animate-in items-center gap-2.5 rounded-card border border-line bg-surface-2 py-2 pr-2 pl-3.5 text-[14px] leading-5 text-fg shadow-edge fade-in-0 slide-in-from-bottom-2"
        >
          <CheckCircle2 className="size-4 shrink-0 text-ok" aria-hidden />
          <span>{t.message}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss"
            icon={<X />}
            onClick={dismissToast}
            className="size-7"
          />
        </div>
      ) : null}
    </div>
  );
}

/** Shows a toast once when it mounts (e.g. after a redirect), then cleans the URL. */
export function ToastOnLoad({
  message,
  cleanUrl,
}: {
  message: string;
  cleanUrl?: string;
}) {
  useEffect(() => {
    toast(message);
    if (cleanUrl) window.history.replaceState(null, "", cleanUrl);
  }, [message, cleanUrl]);
  return null;
}
