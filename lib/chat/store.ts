import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import type {
  ChatMessageRow,
  ConversationRow,
  ConversationStatus,
} from "@/types/supabase";
import type { RecentMessage } from "./bot";
import { inboxRows, type InboxMessage, type InboxRow } from "./inbox";
import type { ChatReader } from "./panel";
import { ChatLengthError, ChatRateLimitError, type ChatStore } from "./service";

export const CONVERSATION_COLUMNS =
  "id, owner, status, last_message_at, user_last_read_at, admin_last_read_at, created_at";

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

/** The user panel's reads (panel.ts), as the visitor. */
export function supabaseChatReader(db: Supabase): ChatReader {
  return {
    async own(userId) {
      const { data, error } = await db
        .from("conversations")
        .select(CONVERSATION_COLUMNS)
        .eq("owner", userId)
        .maybeSingle();
      if (error) throw new Error(`own conversation: ${error.message}`);
      return (data as ConversationRow | null) ?? null;
    },

    async page(conversationId, beforeIso, limit) {
      let q = db
        .from("chat_messages")
        .select(MESSAGE_COLUMNS)
        .eq("conversation_id", conversationId);
      if (beforeIso) q = q.lt("created_at", beforeIso);
      const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`chat history: ${error.message}`);
      return ((data ?? []) as ChatMessageRow[]).reverse();
    },

    async after(conversationId, afterIso) {
      const { data, error } = await db
        .from("chat_messages")
        .select(MESSAGE_COLUMNS)
        .eq("conversation_id", conversationId)
        .gt("created_at", afterIso)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw new Error(`new chat messages: ${error.message}`);
      return (data ?? []) as ChatMessageRow[];
    },

    async markRead(conversationId) {
      const { error } = await db.rpc("mark_chat_read", {
        p_conversation_id: conversationId,
      });
      if (error) throw new Error(`mark_chat_read: ${error.message}`);
    },

    async hasNewer(conversationId, roles, sinceIso) {
      let q = db
        .from("chat_messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .in("sender_role", roles);
      if (sinceIso) q = q.gt("created_at", sinceIso);
      const { data, error } = await q.limit(1);
      if (error) throw new Error(`unread check: ${error.message}`);
      return (data ?? []).length > 0;
    },
  };
}

/** How many conversations the inbox lists, and messages it reads for them. */
const INBOX_CONVERSATIONS = 200;
const INBOX_MESSAGES = 2000;

/** The admin's inbox and threads (inbox.ts), as the admin (RLS: all). */
export function supabaseAdminChat(db: Supabase) {
  const reader = supabaseChatReader(db);
  return {
    page: reader.page,
    after: reader.after,
    markRead: reader.markRead,

    async inbox(): Promise<InboxRow[]> {
      const { data: convs, error } = await db
        .from("conversations")
        .select(CONVERSATION_COLUMNS)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(INBOX_CONVERSATIONS);
      if (error) throw new Error(`inbox: ${error.message}`);
      const conversations = (convs ?? []) as ConversationRow[];
      if (!conversations.length) return [];
      const ids = conversations.map((c) => c.id);
      const owners = conversations.map((c) => c.owner);
      const [{ data: msgs, error: e1 }, { data: people, error: e2 }] =
        await Promise.all([
          db
            .from("chat_messages")
            .select("conversation_id, sender_role, bot_rule, body, created_at")
            .in("conversation_id", ids)
            .order("created_at", { ascending: false })
            .limit(INBOX_MESSAGES),
          db.from("profiles").select("id, display_name").in("id", owners),
        ]);
      if (e1 || e2) throw new Error(`inbox: ${(e1 ?? e2)!.message}`);
      const names = Object.fromEntries(
        (people ?? []).map((p) => [p.id, p.display_name]),
      );
      return inboxRows(conversations, (msgs ?? []) as InboxMessage[], names);
    },

    async conversation(id: string) {
      const { data, error } = await db
        .from("conversations")
        .select(CONVERSATION_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`conversation: ${error.message}`);
      return (data as ConversationRow | null) ?? null;
    },

    async ownerName(owner: string) {
      const { data } = await db
        .from("profiles")
        .select("display_name")
        .eq("id", owner)
        .maybeSingle();
      return data?.display_name ?? "Deleted account";
    },

    async postAdmin(conversationId: string, adminId: string, body: string) {
      const { data, error } = await db
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          sender_role: "admin",
          sender_id: adminId,
          body,
        })
        .select(MESSAGE_COLUMNS)
        .single();
      if (error) {
        if (error.code === "23514") throw new ChatLengthError(error.message);
        throw new Error(`admin reply: ${error.code ?? ""} ${error.message}`);
      }
      return data as ChatMessageRow;
    },

    async setStatus(conversationId: string, status: ConversationStatus) {
      const { data, error } = await db.rpc("set_conversation_status", {
        p_conversation_id: conversationId,
        p_status: status,
      });
      if (error) throw new Error(`set_conversation_status: ${error.message}`);
      return data as ConversationRow | null;
    },
  };
}

export type AdminChatStore = ReturnType<typeof supabaseAdminChat>;
