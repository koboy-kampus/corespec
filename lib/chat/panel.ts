import "server-only";
import type { ChatMessageRow, ConversationRow } from "@/types/supabase";

/**
 * What the user's chat panel reads (Phase 18b): its history, new messages
 * since the last one it has (the polling fallback), the read mark and the
 * unread check. The database passed in, as in service.ts.
 */

/** Messages per page ("Load earlier" asks for the page before). */
export const PAGE_SIZE = 50;

export interface ChatReader {
  /** The visitor's own conversation, or null before their first message. */
  own(userId: string): Promise<ConversationRow | null>;
  /** Up to `limit` messages before `beforeIso` (or the newest), oldest first. */
  page(
    conversationId: string,
    beforeIso: string | null,
    limit: number,
  ): Promise<ChatMessageRow[]>;
  /** Messages after `afterIso`, oldest first. */
  after(conversationId: string, afterIso: string): Promise<ChatMessageRow[]>;
  /** mark_chat_read(). */
  markRead(conversationId: string): Promise<void>;
  /** Whether a message from `roles` is newer than `sinceIso` (null: any). */
  hasNewer(
    conversationId: string,
    roles: ChatMessageRow["sender_role"][],
    sinceIso: string | null,
  ): Promise<boolean>;
}

export interface ChatHistory {
  conversationId: string | null;
  status: ConversationRow["status"] | null;
  messages: ChatMessageRow[];
  /** More messages before the first one. */
  hasEarlier: boolean;
}

/** A page of history: the newest, or the one before `beforeIso`. */
export async function loadHistory(
  reader: ChatReader,
  userId: string,
  beforeIso: string | null,
): Promise<ChatHistory> {
  const conv = await reader.own(userId);
  if (!conv)
    return {
      conversationId: null,
      status: null,
      messages: [],
      hasEarlier: false,
    };
  // One extra tells whether there is an earlier page.
  const rows = await reader.page(conv.id, beforeIso, PAGE_SIZE + 1);
  const hasEarlier = rows.length > PAGE_SIZE;
  return {
    conversationId: conv.id,
    status: conv.status,
    messages: hasEarlier ? rows.slice(rows.length - PAGE_SIZE) : rows,
    hasEarlier,
  };
}

/** New messages since the last one the panel has (the polling fallback). */
export async function pollMessages(
  reader: ChatReader,
  userId: string,
  afterIso: string | null,
): Promise<ChatMessageRow[]> {
  const conv = await reader.own(userId);
  if (!conv) return [];
  if (!afterIso) return (await loadHistory(reader, userId, null)).messages;
  return reader.after(conv.id, afterIso);
}

/** Whether the admin or the bot wrote since the user last read the chat. */
export async function hasUnread(
  reader: ChatReader,
  userId: string,
): Promise<boolean> {
  const conv = await reader.own(userId);
  if (!conv || !conv.last_message_at) return false;
  if (conv.user_last_read_at && conv.user_last_read_at >= conv.last_message_at)
    return false;
  return reader.hasNewer(conv.id, ["admin", "bot"], conv.user_last_read_at);
}

/** Valid ISO timestamps only; anything else is treated as "none". */
export function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}
