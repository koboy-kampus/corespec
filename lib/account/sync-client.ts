"use client";

/**
 * Lets other components (log out, delete account) wait for the running sync
 * engine (components/account/account-sync.tsx) to send pending changes first.
 */
let flusher: (() => Promise<void>) | null = null;

export function registerFlush(fn: (() => Promise<void>) | null) {
  flusher = fn;
}

/** Sends pending changes now. Resolves either way; never throws. */
export async function flushSync(timeoutMs = 4000): Promise<void> {
  if (!flusher) return;
  await Promise.race([
    flusher().catch(() => {}),
    new Promise((r) => setTimeout(r, timeoutMs)),
  ]);
}

const DISMISS_KEY = (userId: string) => `corespec-import-dismissed:${userId}`;

/** "Not now" on the import prompt is remembered per account, in this browser. */
export function importDismissed(userId: string): boolean {
  try {
    return window.localStorage.getItem(DISMISS_KEY(userId)) === "1";
  } catch {
    return false;
  }
}

export function dismissImport(userId: string) {
  try {
    window.localStorage.setItem(DISMISS_KEY(userId), "1");
  } catch {
    // Private mode or blocked storage: the prompt just comes back next time.
  }
}
