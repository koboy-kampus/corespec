"use server";

import { getSession } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import * as service from "./service";
import { supabaseChatStore } from "./store";

/**
 * The chat's Server Actions (Phase 18a). Each one checks the session on the
 * server; the browser only sends the text.
 */

/** Sends the visitor's message; the bot may answer in the same round trip. */
export async function sendChatMessage(
  body: unknown,
): Promise<service.SendResult> {
  if (!isSupabaseConfigured())
    return {
      ok: false,
      code: "not-configured",
      error: "Chat isn't available.",
    };
  const session = await getSession();
  if (!session) return { ok: false, code: "login", error: "Log in to chat." };
  // The bot needs the server's secret (ORDER_WRITE_SECRET); without it the
  // chat still works, the admin just answers everything.
  const secret = process.env.ORDER_WRITE_SECRET || null;
  return service.sendChatMessage(
    {
      store: supabaseChatStore(session.supabase, secret),
      sender: { id: session.viewer.id },
      bot: secret !== null,
    },
    body,
  );
}
