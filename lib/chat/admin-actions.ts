"use server";

import { getSession } from "@/lib/auth/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { ChatMessageRow, ConversationStatus } from "@/types/supabase";
import type { InboxRow } from "./inbox";
import { isoOrNull, PAGE_SIZE } from "./panel";
import { ChatLengthError, MAX_MESSAGE } from "./service";
import { supabaseAdminChat } from "./store";

/**
 * The admin inbox's Server Actions (Phase 18b, /admin/chat). Admins only: each
 * one checks the role on the server, and RLS checks it again in the database.
 */

type Failure = { ok: false; error: string };
const notAllowed: Failure = { ok: false, error: "Admins only." };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function admin() {
  if (!isSupabaseConfigured()) return null;
  const s = await getSession();
  return s && s.viewer.role === "admin" ? s : null;
}

/** Every conversation, newest first (the polling fallback reloads this). */
export async function loadInbox(): Promise<
  { ok: true; rows: InboxRow[] } | Failure
> {
  const s = await admin();
  if (!s) return notAllowed;
  try {
    return { ok: true, rows: await supabaseAdminChat(s.supabase).inbox() };
  } catch {
    return { ok: false, error: "Couldn't load the conversations." };
  }
}

export interface Thread {
  ok: true;
  id: string;
  name: string;
  status: ConversationStatus;
  messages: ChatMessageRow[];
  hasEarlier: boolean;
}

/** A conversation's messages (newest page, or the one before `beforeIso`); marks it read. */
export async function loadThread(
  id: unknown,
  beforeIso?: unknown,
): Promise<Thread | Failure> {
  const s = await admin();
  if (!s) return notAllowed;
  if (typeof id !== "string" || !UUID.test(id))
    return { ok: false, error: "No such conversation." };
  const db = supabaseAdminChat(s.supabase);
  try {
    const conv = await db.conversation(id);
    if (!conv) return { ok: false, error: "No such conversation." };
    const before = isoOrNull(beforeIso);
    const [rows, name] = await Promise.all([
      db.page(id, before, PAGE_SIZE + 1),
      db.ownerName(conv.owner),
    ]);
    if (!before) await db.markRead(id).catch(() => undefined);
    const hasEarlier = rows.length > PAGE_SIZE;
    return {
      ok: true,
      id,
      name,
      status: conv.status,
      messages: hasEarlier ? rows.slice(rows.length - PAGE_SIZE) : rows,
      hasEarlier,
    };
  } catch {
    return { ok: false, error: "Couldn't load the conversation." };
  }
}

/** New messages in a thread after `afterIso` (polling); marks it read. */
export async function pollThread(
  id: unknown,
  afterIso: unknown,
): Promise<{ ok: true; messages: ChatMessageRow[] } | Failure> {
  const s = await admin();
  if (!s) return notAllowed;
  const after = isoOrNull(afterIso);
  if (typeof id !== "string" || !UUID.test(id) || !after)
    return { ok: true, messages: [] };
  const db = supabaseAdminChat(s.supabase);
  try {
    const messages = await db.after(id, after);
    if (messages.length) await db.markRead(id).catch(() => undefined);
    return { ok: true, messages };
  } catch {
    return { ok: false, error: "Couldn't refresh the conversation." };
  }
}

/** Marks a thread read while the admin has it open. */
export async function markThreadRead(id: unknown): Promise<void> {
  const s = await admin();
  if (!s || typeof id !== "string" || !UUID.test(id)) return;
  await supabaseAdminChat(s.supabase)
    .markRead(id)
    .catch(() => undefined);
}

/** The admin's reply. No rate limit for admins. */
export async function sendAdminReply(
  id: unknown,
  body: unknown,
): Promise<{ ok: true; message: ChatMessageRow } | Failure> {
  const s = await admin();
  if (!s) return notAllowed;
  if (typeof id !== "string" || !UUID.test(id))
    return { ok: false, error: "No such conversation." };
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return { ok: false, error: "Type a reply first." };
  if ([...text].length > MAX_MESSAGE)
    return {
      ok: false,
      error: `Messages can be up to ${MAX_MESSAGE} characters.`,
    };
  try {
    const message = await supabaseAdminChat(s.supabase).postAdmin(
      id,
      s.viewer.id,
      text,
    );
    return { ok: true, message };
  } catch (e) {
    if (e instanceof ChatLengthError)
      return {
        ok: false,
        error: `Messages can be up to ${MAX_MESSAGE} characters.`,
      };
    return { ok: false, error: "Couldn't send the reply. Try again." };
  }
}

/** Close or reopen a conversation. */
export async function setConversationStatus(
  id: unknown,
  status: unknown,
): Promise<{ ok: true; status: ConversationStatus } | Failure> {
  const s = await admin();
  if (!s) return notAllowed;
  if (
    typeof id !== "string" ||
    !UUID.test(id) ||
    (status !== "open" && status !== "closed")
  )
    return { ok: false, error: "No such conversation." };
  try {
    const row = await supabaseAdminChat(s.supabase).setStatus(id, status);
    return row
      ? { ok: true, status: row.status }
      : { ok: false, error: "No such conversation." };
  } catch {
    return { ok: false, error: "Couldn't change the status. Try again." };
  }
}
