import { RealtimeClient, type RealtimeChannel } from "@supabase/realtime-js";
import { getRealtimeToken } from "./actions";
import type { Connect } from "./live";

/**
 * Supabase Realtime for the chat (Phase 18b). Imported only with `import()`
 * from the chat panel and /admin/chat, so no other page loads it.
 *
 * Listen-only: private Broadcast channels whose join rules are the select
 * policies on realtime.messages (supabase/migrations/20261118000100_chat.sql).
 * The token is the visitor's own access token from getRealtimeToken(); the
 * client asks for it on connect and on every heartbeat, and it's renewed a
 * minute and a half before it expires. Nothing here queries the database.
 */

/** Renew the token this long before it expires (heartbeats are every 25 s). */
const RENEW_BEFORE_MS = 90_000;

let client: RealtimeClient | null = null;
let cached: { token: string; expiresAt: number } | null = null;
let pending: Promise<string | null> | null = null;

async function token(): Promise<string | null> {
  if (cached && cached.expiresAt - Date.now() > RENEW_BEFORE_MS)
    return cached.token;
  pending ??= getRealtimeToken()
    .then((t) => {
      cached = t;
      return t?.token ?? null;
    })
    .catch(() => null)
    .finally(() => {
      pending = null;
    });
  return pending;
}

function getClient(): RealtimeClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  client = new RealtimeClient(`${url.replace(/\/$/, "")}/realtime/v1`, {
    params: { apikey: key },
    accessToken: token,
  });
  return client;
}

export const realtimeConnect: Connect = async (topic, handlers) => {
  const rt = getClient();
  if (!rt) throw new Error("Realtime isn't configured");
  await rt.setAuth();
  const channel: RealtimeChannel = rt
    .channel(topic, { config: { private: true } })
    .on("broadcast", { event: "message" }, (msg) =>
      handlers.onMessage(msg.payload),
    )
    .subscribe((state) => {
      // A refused or expired token: ask for a fresh one next time.
      if (state !== "SUBSCRIBED") cached = null;
      handlers.onState(state);
    });
  return () => {
    void rt.removeChannel(channel).then(() => {
      if (!rt.getChannels().length) void rt.disconnect();
    });
  };
};
