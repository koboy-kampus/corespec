import type { ChatMessageRow } from "@/types/supabase";

/**
 * Optimistic sending (Phase 18b fix): the user's message shows at once as
 * "Sending…", and is swapped for the saved row when the Server Action
 * returns, or marked "Not sent — Retry" when it fails. Pending messages live
 * apart from the saved ones, so the saved list stays de-duplicated by id.
 */

export interface PendingMessage {
  /** A local id ("pending-…"), never a database id. */
  id: string;
  body: string;
  /** When it was typed (for ordering and display only). */
  created_at: string;
  state: "sending" | "failed";
}

let seq = 0;

export function newPending(body: string, now = Date.now()): PendingMessage {
  seq += 1;
  return {
    id: `pending-${now}-${seq}`,
    body,
    created_at: new Date(now).toISOString(),
    state: "sending",
  };
}

export const setPendingState = (
  list: readonly PendingMessage[],
  id: string,
  state: PendingMessage["state"],
): PendingMessage[] => list.map((p) => (p.id === id ? { ...p, state } : p));

export const dropPending = (
  list: readonly PendingMessage[],
  id: string,
): PendingMessage[] => list.filter((p) => p.id !== id);

/**
 * Saved rows can arrive over Realtime before the action returns. Each saved
 * user message removes the oldest message still sending with the same text,
 * so it never shows twice. Failed ones stay until retried.
 */
export function settlePending(
  list: readonly PendingMessage[],
  saved: readonly Pick<ChatMessageRow, "sender_role" | "body">[],
): PendingMessage[] {
  let next = list as PendingMessage[];
  for (const m of saved) {
    if (m.sender_role !== "user") continue;
    const i = next.findIndex((p) => p.state === "sending" && p.body === m.body);
    if (i >= 0) next = [...next.slice(0, i), ...next.slice(i + 1)];
  }
  return next;
}

/** Saved messages, then pending ones (they're always the newest). */
export const withPending = <T extends { id: string }>(
  saved: readonly T[],
  pending: readonly PendingMessage[],
): (T | (PendingMessage & { sender_role: "user"; bot_rule: null }))[] => [
  ...saved,
  ...pending.map((p) => ({
    ...p,
    sender_role: "user" as const,
    bot_rule: null,
  })),
];
