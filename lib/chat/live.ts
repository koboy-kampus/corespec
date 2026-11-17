/**
 * The chat's live connection (Phase 18b), browser side. Realtime first; if
 * the channel isn't subscribed within 10 seconds, or drops, poll a Server
 * Action every 5 seconds until Realtime is back. The demo has to work on
 * campus wifi.
 *
 * The connection itself is passed in (`connect`), so the timing rules are
 * tested with fake timers; realtime.ts is the Supabase Realtime one, loaded
 * only when the chat panel or /admin/chat opens.
 */

export const SUBSCRIBE_TIMEOUT_MS = 10_000;
export const POLL_MS = 5_000;

/** What the header shows: Live, or Connecting / Reconnecting (polling). */
export type LiveStatus = "connecting" | "live" | "reconnecting";

/** Realtime's channel states (REALTIME_SUBSCRIBE_STATES). */
export type ChannelState =
  "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

/** Joins `topic`; returns a function that leaves it. */
export type Connect = (
  topic: string,
  handlers: {
    onMessage: (payload: unknown) => void;
    onState: (state: ChannelState) => void;
  },
) => Promise<() => void>;

export interface LiveOptions {
  topic: string;
  onMessage: (payload: unknown) => void;
  onStatus: (status: LiveStatus) => void;
  /** Fetches what was missed. Called every 5 s while Realtime is down, and once when it's back. */
  poll: () => Promise<void> | void;
}

/** Starts listening. Returns `stop`. */
export function startLive(opts: LiveOptions, connect: Connect): () => void {
  let status: LiveStatus = "connecting";
  let stopped = false;
  let leave: (() => void) | null = null;
  let interval: ReturnType<typeof setInterval> | null = null;
  let polling = false;

  const set = (next: LiveStatus) => {
    if (stopped || next === status) return;
    status = next;
    opts.onStatus(next);
  };
  const poll = () => {
    if (stopped || polling) return;
    polling = true;
    Promise.resolve()
      .then(opts.poll)
      .catch(() => undefined)
      .finally(() => {
        polling = false;
      });
  };
  const startPolling = () => {
    if (stopped) return;
    set("reconnecting");
    if (interval) return;
    poll();
    interval = setInterval(poll, POLL_MS);
  };
  const stopPolling = () => {
    if (interval) clearInterval(interval);
    interval = null;
  };

  opts.onStatus(status);
  const timeout = setTimeout(() => {
    if (status !== "live") startPolling();
  }, SUBSCRIBE_TIMEOUT_MS);

  connect(opts.topic, {
    onMessage: (p) => {
      if (!stopped) opts.onMessage(p);
    },
    onState: (state) => {
      if (stopped) return;
      if (state === "SUBSCRIBED") {
        clearTimeout(timeout);
        const wasDown = interval !== null;
        stopPolling();
        set("live");
        // Catch up on anything sent while the channel was down.
        if (wasDown) poll();
      } else {
        startPolling();
      }
    },
  })
    .then((fn) => {
      if (stopped) fn();
      else leave = fn;
    })
    .catch(() => startPolling());

  return () => {
    stopped = true;
    clearTimeout(timeout);
    stopPolling();
    leave?.();
  };
}

/** Keeps a list of messages unique by id and in time order. */
export function mergeMessages<T extends { id: string; created_at: string }>(
  current: readonly T[],
  incoming: readonly T[],
): T[] {
  if (!incoming.length) return current as T[];
  const byId = new Map(current.map((m) => [m.id, m]));
  let changed = false;
  for (const m of incoming)
    if (!byId.has(m.id)) {
      byId.set(m.id, m);
      changed = true;
    }
  if (!changed) return current as T[];
  return [...byId.values()].sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
}

/** A broadcast payload that looks like a chat_messages row, or null. */
export function asMessage(payload: unknown): {
  id: string;
  conversation_id: string;
  sender_role: "user" | "admin" | "bot";
  sender_id: string | null;
  body: string;
  bot_rule: string | null;
  created_at: string;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (
    typeof p.id !== "string" ||
    typeof p.conversation_id !== "string" ||
    typeof p.body !== "string" ||
    typeof p.created_at !== "string" ||
    (p.sender_role !== "user" &&
      p.sender_role !== "admin" &&
      p.sender_role !== "bot")
  )
    return null;
  return {
    id: p.id,
    conversation_id: p.conversation_id,
    sender_role: p.sender_role,
    sender_id: typeof p.sender_id === "string" ? p.sender_id : null,
    body: p.body,
    bot_rule: typeof p.bot_rule === "string" ? p.bot_rule : null,
    created_at: p.created_at,
  };
}

/** The latest created_at in a list (for "messages after …"), or null. */
export const lastAt = (messages: readonly { created_at: string }[]) =>
  messages.reduce<string | null>(
    (max, m) => (max === null || m.created_at > max ? m.created_at : max),
    null,
  );
