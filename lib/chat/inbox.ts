import type {
  ChatMessageRow,
  ConversationRow,
  ConversationStatus,
} from "@/types/supabase";
import { needsAdmin } from "./bot";

/**
 * The admin's inbox (Phase 18b): one row per conversation with its owner's
 * name, the latest message, unread and "needs admin" (worked out from the
 * messages, not stored: see needsAdmin()).
 */

export type InboxFilter = "all" | "needs-admin" | "open" | "closed";
export const INBOX_FILTERS: readonly InboxFilter[] = [
  "all",
  "needs-admin",
  "open",
  "closed",
];

/** Enough of a message for the inbox. */
export type InboxMessage = Pick<
  ChatMessageRow,
  "conversation_id" | "sender_role" | "bot_rule" | "body" | "created_at"
>;

export interface InboxRow {
  id: string;
  owner: string;
  name: string;
  status: ConversationStatus;
  lastAt: string | null;
  /** The latest message, cut to one line. */
  preview: string;
  previewRole: ChatMessageRow["sender_role"] | null;
  /** A user's message is newer than the admins' read mark. */
  unread: boolean;
  needsAdmin: boolean;
}

export const PREVIEW_LENGTH = 90;

export function preview(body: string): string {
  const line = body.replace(/\s+/g, " ").trim();
  return line.length > PREVIEW_LENGTH
    ? `${line.slice(0, PREVIEW_LENGTH - 1)}…`
    : line;
}

/** Inbox rows, newest conversation first. `messages`: any order. */
export function inboxRows(
  conversations: readonly ConversationRow[],
  messages: readonly InboxMessage[],
  names: Readonly<Record<string, string>>,
): InboxRow[] {
  const byConv = new Map<string, InboxMessage[]>();
  for (const m of messages) {
    const list = byConv.get(m.conversation_id) ?? [];
    list.push(m);
    byConv.set(m.conversation_id, list);
  }
  return conversations
    .map((c) => {
      const list = (byConv.get(c.id) ?? []).sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );
      const last = list.at(-1);
      return {
        id: c.id,
        owner: c.owner,
        name: names[c.owner] ?? "Deleted account",
        status: c.status,
        lastAt: c.last_message_at ?? last?.created_at ?? null,
        preview: last ? preview(last.body) : "",
        previewRole: last?.sender_role ?? null,
        unread: list.some(
          (m) =>
            m.sender_role === "user" &&
            (!c.admin_last_read_at || m.created_at > c.admin_last_read_at),
        ),
        needsAdmin: needsAdmin(list),
      };
    })
    .sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
}

export function filterInbox(
  rows: readonly InboxRow[],
  filter: InboxFilter,
): InboxRow[] {
  switch (filter) {
    case "needs-admin":
      return rows.filter((r) => r.needsAdmin);
    case "open":
      return rows.filter((r) => r.status === "open");
    case "closed":
      return rows.filter((r) => r.status === "closed");
    default:
      return [...rows];
  }
}

/**
 * A new message arrived live (chat:admin): update that conversation's row and
 * move it to the top. `open`: the admin is looking at that thread now, so it
 * doesn't count as unread. Returns null for a conversation the list doesn't
 * have yet (the caller reloads the list).
 */
export function applyLiveMessage(
  rows: readonly InboxRow[],
  m: Pick<
    ChatMessageRow,
    "conversation_id" | "sender_role" | "bot_rule" | "body" | "created_at"
  >,
  open: string | null,
): InboxRow[] | null {
  const row = rows.find((r) => r.id === m.conversation_id);
  if (!row) return null;
  const next: InboxRow = {
    ...row,
    status: m.sender_role === "user" ? "open" : row.status,
    lastAt: m.created_at,
    preview: preview(m.body),
    previewRole: m.sender_role,
    unread: m.sender_role === "user" ? open !== m.conversation_id : row.unread,
    needsAdmin:
      m.sender_role === "admin"
        ? false
        : m.sender_role === "bot"
          ? m.bot_rule === "human" || m.bot_rule === "fallback"
          : row.needsAdmin,
  };
  return [next, ...rows.filter((r) => r.id !== row.id)];
}

/** How many conversations have unread user messages (the /admin link). */
export const unreadCount = (rows: readonly InboxRow[]) =>
  rows.filter((r) => r.unread).length;
