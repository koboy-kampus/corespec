"use client";

import { useRef } from "react";

/**
 * For dialogs opened from code (no Radix <Trigger>): remembers what had focus when
 * the dialog opened and puts focus back there when it closes, so keyboard users
 * don't land at the top of the page. Spread the result onto <DialogContent>.
 */
export function useReturnFocus(fallback?: () => HTMLElement | null) {
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    onOpenAutoFocus: () => {
      // Radix calls this before it moves focus into the dialog.
      const el = document.activeElement;
      returnTo.current = el instanceof HTMLElement ? el : null;
    },
    onCloseAutoFocus: (e: Event) => {
      e.preventDefault();
      // If the opener is gone (say, a fixed issue disappeared), use the fallback.
      const target = returnTo.current?.isConnected
        ? returnTo.current
        : (fallback?.() ?? null);
      target?.focus();
    },
  };
}
