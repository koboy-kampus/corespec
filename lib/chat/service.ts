import "server-only";
import type { ChatMessageRow, ConversationRow } from "@/types/supabase";
import { botDecision, QUIET_MS, type RecentMessage } from "./bot";

/**
 * The chat's server-side steps (Phase 18a), with the database passed in so
 * they can be tested with Supabase mocked. The Server Actions (actions.ts)
 * only add the session.
 */

export const MAX_MESSAGE = 1000;

/** Where conversations and messages live (store.ts is the Supabase one). */
export interface ChatStore {
  /** get_or_create_conversation(): the visitor's own, reopened if closed. */
  conversation(): Promise<ConversationRow>;
  /** Inserts the visitor's message under RLS. Throws ChatRateLimitError / ChatLengthError. */
  postUserMessage(
    conversationId: string,
    senderId: string,
    body: string,
  ): Promise<ChatMessageRow>;
  /** Messages in the conversation since `sinceIso` (for the bot's quiet rules). */
  recent(conversationId: string, sinceIso: string): Promise<RecentMessage[]>;
  /** post_bot_reply() with the server's secret. */
  postBotReply(
    conversationId: string,
    body: string,
    rule: string,
  ): Promise<ChatMessageRow>;
}

/** The database's rate limit; the message is already friendly. */
export class ChatRateLimitError extends Error {}
/** The database's length check. */
export class ChatLengthError extends Error {}

export interface Sender {
  id: string;
}

export type ChatError =
  "not-configured" | "login" | "empty" | "too-long" | "rate-limit" | "failed";

export type ChatFailure = { ok: false; code: ChatError; error: string };

export type SendResult =
  | {
      ok: true;
      conversationId: string;
      /** The user's message, then the bot's reply when there is one. */
      messages: ChatMessageRow[];
      quickReplies: readonly string[];
    }
  | ChatFailure;

const fail = (code: ChatError, error: string): ChatFailure => ({
  ok: false,
  code,
  error,
});

const TOO_LONG = `Messages can be up to ${MAX_MESSAGE} characters.`;

/**
 * Sends the visitor's message, then lets the bot answer when a rule matches
 * and the quiet rules allow it. Without the secret (`bot` false) the
 * message is still sent; only the bot is off. A failed bot reply never fails
 * the send: the user's message is already saved.
 */
export async function sendChatMessage(
  deps: { store: ChatStore; sender: Sender; bot: boolean; now?: () => number },
  input: unknown,
): Promise<SendResult> {
  const { store, sender } = deps;
  if (typeof input !== "string") return fail("empty", "Type a message first.");
  const body = input.trim();
  if (!body) return fail("empty", "Type a message first.");
  if ([...body].length > MAX_MESSAGE) return fail("too-long", TOO_LONG);

  let conversation: ConversationRow;
  let message: ChatMessageRow;
  try {
    conversation = await store.conversation();
    message = await store.postUserMessage(conversation.id, sender.id, body);
  } catch (e) {
    if (e instanceof ChatRateLimitError) return fail("rate-limit", e.message);
    if (e instanceof ChatLengthError) return fail("too-long", TOO_LONG);
    console.error("[chat] couldn't send a message", errorText(e));
    return fail("failed", "Couldn't send your message. Try again.");
  }

  const messages = [message];
  let quickReplies: readonly string[] = [];
  if (deps.bot) {
    const now = (deps.now ?? Date.now)();
    try {
      const recent = await store.recent(
        conversation.id,
        new Date(now - QUIET_MS).toISOString(),
      );
      const decision = botDecision(body, recent, now);
      if (decision.reply !== null) {
        messages.push(
          await store.postBotReply(
            conversation.id,
            decision.reply,
            decision.rule,
          ),
        );
        quickReplies = decision.quickReplies;
      }
    } catch (e) {
      // e.g. an admin replied in between (the bot only answers a user's
      // message). The user's message is saved either way.
      console.error("[chat] the bot couldn't answer", errorText(e));
    }
  }

  return { ok: true, conversationId: conversation.id, messages, quickReplies };
}

/** An error's message, never its details (they may echo the request). */
function errorText(e: unknown): string {
  return e instanceof Error ? e.message.slice(0, 200) : "unknown error";
}
