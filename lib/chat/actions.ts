"use server";

import { getSession } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ChatMessageRow } from "@/types/supabase";
import * as panel from "./panel";
import * as service from "./service";
import { supabaseChatReader, supabaseChatStore } from "./store";

/**
 * The chat's Server Actions for the user's panel (Phase 18a, 18b). Each one
 * checks the session on the server; the browser only sends text and
 * timestamps. The admin's are in admin-actions.ts.
 */

const notConfigured = {
  ok: false,
  code: "not-configured",
  error: "Chat isn't available.",
} as const;
const needsLogin = {
  ok: false,
  code: "login",
  error: "Log in to chat.",
} as const;
const failed = {
  ok: false,
  code: "failed",
  error: "Couldn't load the chat. Try again.",
} as const;

type Failure = typeof notConfigured | typeof needsLogin | typeof failed;

async function session() {
  if (!isSupabaseConfigured()) return notConfigured;
  return (await getSession()) ?? needsLogin;
}

/** Sends the visitor's message; the bot may answer in the same round trip. */
export async function sendChatMessage(
  body: unknown,
): Promise<service.SendResult> {
  const s = await session();
  if ("ok" in s) return s;
  // The bot needs the server's secret (ORDER_WRITE_SECRET); without it the
  // chat still works, the admin just answers everything.
  const secret = process.env.ORDER_WRITE_SECRET || null;
  return service.sendChatMessage(
    {
      store: supabaseChatStore(s.supabase, secret),
      sender: { id: s.viewer.id },
      bot: secret !== null,
    },
    body,
  );
}

/**
 * The visitor's Realtime token (their Supabase access token, renewed by
 * getSession() when it's close to expiry), or null for guests. The one place
 * a Supabase token reaches the browser: the chat's Realtime client uses it
 * only to listen to its own topics, never for queries (docs/accounts.md).
 */
export async function getRealtimeToken(): Promise<{
  token: string;
  expiresAt: number;
} | null> {
  const s = await session();
  if ("ok" in s) return null;
  const { data } = await s.supabase.auth.getSession();
  const token = data.session?.access_token;
  const exp = data.session?.expires_at;
  return token && exp ? { token, expiresAt: exp * 1000 } : null;
}

export type LoadResult =
  ({ ok: true; viewerId: string } & panel.ChatHistory) | Failure;

/** The newest page of history, or the page before `beforeIso` ("Load earlier"). */
export async function loadChat(beforeIso?: unknown): Promise<LoadResult> {
  const s = await session();
  if ("ok" in s) return s;
  try {
    const history = await panel.loadHistory(
      supabaseChatReader(s.supabase),
      s.viewer.id,
      panel.isoOrNull(beforeIso),
    );
    return { ok: true, viewerId: s.viewer.id, ...history };
  } catch (e) {
    console.error("[chat] couldn't load the history", String(e).slice(0, 200));
    return failed;
  }
}

/** Messages after `afterIso` (the polling fallback while Realtime is down). */
export async function pollChat(
  afterIso: unknown,
): Promise<{ ok: true; messages: ChatMessageRow[] } | Failure> {
  const s = await session();
  if ("ok" in s) return s;
  try {
    return {
      ok: true,
      messages: await panel.pollMessages(
        supabaseChatReader(s.supabase),
        s.viewer.id,
        panel.isoOrNull(afterIso),
      ),
    };
  } catch {
    return failed;
  }
}

/** Marks the visitor's conversation read (the panel is open). */
export async function markChatRead(): Promise<void> {
  const s = await session();
  if ("ok" in s) return;
  const reader = supabaseChatReader(s.supabase);
  const conv = await reader.own(s.viewer.id).catch(() => null);
  if (conv) await reader.markRead(conv.id).catch(() => undefined);
}

/** Whether the admin or the bot wrote since the visitor last read the chat. */
export async function chatUnread(): Promise<boolean> {
  const s = await session();
  if ("ok" in s) return false;
  return panel
    .hasUnread(supabaseChatReader(s.supabase), s.viewer.id)
    .catch(() => false);
}
