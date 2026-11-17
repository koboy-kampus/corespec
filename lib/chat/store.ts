import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import type { ChatMessageRow, ConversationRow } from "@/types/supabase";
import type { RecentMessage } from "./bot";
import { ChatLengthError, ChatRateLimitError, type ChatStore } from "./service";

/** Columns the site reads (everything). */
export const MESSAGE_COLUMNS =
  "id, conversation_id, sender_role, sender_id, body, bot_rule, created_at";

/**
 * Chat in Supabase, as the visitor (RLS: their own conversation, or all for an
 * admin). The bot's replies go through post_bot_reply() with the server's
 * secret (ORDER_WRITE_SECRET, the same one the checkout uses).
 */
export function supabaseChatStore(
  db: Supabase,
  secret: string | null,
): ChatStore {
  return {
    async conversation() {
      const { data, error } = await db.rpc("get_or_create_conversation");
      if (error)
        throw new Error(`get_or_create_conversation: ${error.message}`);
      return data as ConversationRow;
    },

    async postUserMessage(conversationId, senderId, body) {
      const { data, error } = await db
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          sender_role: "user",
          sender_id: senderId,
          body,
        })
        .select(MESSAGE_COLUMNS)
        .single();
      if (error) {
        if (error.hint === "chat_rate_limit")
          throw new ChatRateLimitError(error.message);
        if (error.code === "23514") throw new ChatLengthError(error.message);
        throw new Error(
          `insert chat message: ${error.code ?? ""} ${error.message}`,
        );
      }
      return data as ChatMessageRow;
    },

    async recent(conversationId, sinceIso) {
      const { data, error } = await db
        .from("chat_messages")
        .select("sender_role, bot_rule, created_at")
        .eq("conversation_id", conversationId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(`recent chat messages: ${error.message}`);
      return (data ?? []) as RecentMessage[];
    },

    async postBotReply(conversationId, body, rule) {
      if (!secret) throw new Error("post_bot_reply: no secret");
      const { data, error } = await db.rpc("post_bot_reply", {
        p_secret: secret,
        p_conversation_id: conversationId,
        p_body: body,
        p_bot_rule: rule,
      });
      if (error)
        throw new Error(`post_bot_reply: ${error.code ?? ""} ${error.message}`);
      return data as ChatMessageRow;
    },
  };
}
