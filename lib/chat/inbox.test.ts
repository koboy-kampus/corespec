import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConversationRow } from "@/types/supabase";
import {
  applyLiveMessage,
  filterInbox,
  inboxRows,
  preview,
  PREVIEW_LENGTH,
  unreadCount,
  type InboxMessage,
} from "./inbox";
import {
  hasUnread,
  isoOrNull,
  loadHistory,
  PAGE_SIZE,
  pollMessages,
  type ChatReader,
} from "./panel";

const at = (s: number) =>
  new Date(Date.UTC(2026, 10, 18, 3, 0, s)).toISOString();

const conv = (
  id: string,
  over: Partial<ConversationRow> = {},
): ConversationRow => ({
  id,
  owner: `owner-${id}`,
  status: "open",
  last_message_at: null,
  user_last_read_at: null,
  admin_last_read_at: null,
  created_at: at(0),
  ...over,
});
const m = (
  conversation_id: string,
  sender_role: InboxMessage["sender_role"],
  s: number,
  bot_rule: string | null = null,
  body = `${sender_role} at ${s}`,
): InboxMessage => ({
  conversation_id,
  sender_role,
  bot_rule,
  body,
  created_at: at(s),
});

describe("inboxRows", () => {
  it("one row per conversation, newest first, with name, preview, unread and needs-admin", () => {
    const rows = inboxRows(
      [
        conv("a", { last_message_at: at(5), admin_last_read_at: at(3) }),
        conv("b", { last_message_at: at(9) }),
        conv("c", { last_message_at: at(2), status: "closed" }),
      ],
      [
        m("a", "user", 1),
        m("a", "bot", 2, "human"),
        m("a", "user", 5, null, "Still there?"),
        m("b", "user", 8),
        m("b", "bot", 9, "prices"),
        m("c", "user", 1),
        m("c", "admin", 2, null, "Done"),
      ],
      { "owner-a": "Alice", "owner-b": "Bob" },
    );
    expect(rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
    expect(rows.find((r) => r.id === "a")).toMatchObject({
      name: "Alice",
      preview: "Still there?",
      previewRole: "user",
      unread: true, // a user message after the admins' read mark
      needsAdmin: true,
    });
    expect(rows.find((r) => r.id === "b")).toMatchObject({
      unread: true,
      needsAdmin: false,
    });
    expect(rows.find((r) => r.id === "c")).toMatchObject({
      name: "Deleted account",
      unread: true,
      needsAdmin: false,
      status: "closed",
    });
  });

  it("isn't unread when the admins read after the last user message", () => {
    const [row] = inboxRows(
      [conv("a", { admin_last_read_at: at(5) })],
      [m("a", "user", 4), m("a", "bot", 6, "prices")],
      {},
    );
    expect(row.unread).toBe(false);
  });
});

describe("filterInbox and unreadCount", () => {
  const rows = inboxRows(
    [
      conv("a", { last_message_at: at(3) }),
      conv("b", { status: "closed", last_message_at: at(2) }),
    ],
    [m("a", "user", 1), m("a", "bot", 3, "fallback"), m("b", "user", 2)],
    {},
  );
  it("filters by needs admin, open and closed", () => {
    expect(filterInbox(rows, "all").map((r) => r.id)).toEqual(["a", "b"]);
    expect(filterInbox(rows, "needs-admin").map((r) => r.id)).toEqual(["a"]);
    expect(filterInbox(rows, "open").map((r) => r.id)).toEqual(["a"]);
    expect(filterInbox(rows, "closed").map((r) => r.id)).toEqual(["b"]);
    expect(unreadCount(rows)).toBe(2);
  });
});

describe("applyLiveMessage", () => {
  const rows = inboxRows(
    [
      conv("a", { last_message_at: at(5) }),
      conv("b", { last_message_at: at(3), admin_last_read_at: at(9) }),
    ],
    [m("a", "user", 5), m("b", "user", 3)],
    {},
  );

  it("moves the conversation to the top with the new preview and unread", () => {
    const next = applyLiveMessage(
      rows,
      m("b", "user", 10, null, "New!"),
      null,
    )!;
    expect(next.map((r) => r.id)).toEqual(["b", "a"]);
    expect(next[0]).toMatchObject({
      preview: "New!",
      unread: true,
      lastAt: at(10),
    });
  });

  it("doesn't count it unread when that thread is open", () => {
    expect(applyLiveMessage(rows, m("b", "user", 10), "b")![0].unread).toBe(
      false,
    );
  });

  it("sets needs-admin from the bot's rule and clears it on an admin reply", () => {
    const flagged = applyLiveMessage(rows, m("a", "bot", 6, "human"), null)!;
    expect(flagged[0].needsAdmin).toBe(true);
    const answered = applyLiveMessage(flagged, m("a", "admin", 7), null)!;
    expect(answered[0].needsAdmin).toBe(false);
  });

  it("reopens a closed conversation when the user writes", () => {
    const closed = rows.map((r) => ({ ...r, status: "closed" as const }));
    expect(applyLiveMessage(closed, m("a", "user", 9), null)![0].status).toBe(
      "open",
    );
  });

  it("returns null for a conversation the list doesn't have", () => {
    expect(applyLiveMessage(rows, m("zzz", "user", 9), null)).toBeNull();
  });
});

describe("preview", () => {
  it("is one line and cut with an ellipsis", () => {
    expect(preview("a\n\nb   c")).toBe("a b c");
    const long = preview("x".repeat(200));
    expect(long).toHaveLength(PREVIEW_LENGTH);
    expect(long.endsWith("…")).toBe(true);
  });
});

/** An in-memory reader with one conversation. */
function reader(
  count: number,
  over: Partial<ConversationRow> = {},
): ChatReader & { reads: number } {
  const c = conv("a", {
    owner: "me",
    last_message_at: count ? at(count) : null,
    ...over,
  });
  const all = Array.from({ length: count }, (_, i) => ({
    id: `m${i + 1}`,
    conversation_id: "a",
    sender_role: (i % 2 ? "bot" : "user") as "user" | "bot",
    sender_id: i % 2 ? null : "me",
    body: `#${i + 1}`,
    bot_rule: i % 2 ? "prices" : null,
    created_at: at(i + 1),
  }));
  const r = {
    reads: 0,
    async own(userId: string) {
      return userId === "me" && count >= 0 ? c : null;
    },
    async page(_id: string, before: string | null, limit: number) {
      const list = all.filter((x) => !before || x.created_at < before);
      return list.slice(Math.max(0, list.length - limit));
    },
    async after(_id: string, after: string) {
      return all.filter((x) => x.created_at > after);
    },
    async markRead() {
      r.reads++;
    },
    async hasNewer(_id: string, roles: string[], since: string | null) {
      return all.some(
        (x) =>
          roles.includes(x.sender_role) && (!since || x.created_at > since),
      );
    },
  };
  return r;
}

describe("the panel's reads", () => {
  it("loads the newest page and says whether there are earlier ones", async () => {
    const h = await loadHistory(reader(PAGE_SIZE + 5), "me", null);
    expect(h.messages).toHaveLength(PAGE_SIZE);
    expect(h.messages[0].body).toBe("#6");
    expect(h.hasEarlier).toBe(true);
    const earlier = await loadHistory(
      reader(PAGE_SIZE + 5),
      "me",
      h.messages[0].created_at,
    );
    expect(earlier.messages.map((x) => x.body)).toEqual([
      "#1",
      "#2",
      "#3",
      "#4",
      "#5",
    ]);
    expect(earlier.hasEarlier).toBe(false);
  });

  it("is empty before the first message (no conversation yet)", async () => {
    expect(await loadHistory(reader(0), "someone-else", null)).toEqual({
      conversationId: null,
      status: null,
      messages: [],
      hasEarlier: false,
    });
  });

  it("polls only what's newer", async () => {
    const msgs = await pollMessages(reader(10), "me", at(8));
    expect(msgs.map((x) => x.body)).toEqual(["#9", "#10"]);
    expect(await pollMessages(reader(10), "someone-else", at(8))).toEqual([]);
  });

  it("is unread when the bot or admin wrote after the user's read mark", async () => {
    expect(await hasUnread(reader(4), "me")).toBe(true);
    expect(await hasUnread(reader(4, { user_last_read_at: at(4) }), "me")).toBe(
      false,
    );
    expect(await hasUnread(reader(4, { user_last_read_at: at(3) }), "me")).toBe(
      true,
    );
    expect(await hasUnread(reader(0), "me")).toBe(false);
  });

  it("accepts only real timestamps from the browser", () => {
    expect(isoOrNull(at(1))).toBe(at(1));
    expect(isoOrNull("yesterday")).toBeNull();
    expect(isoOrNull(42)).toBeNull();
    expect(isoOrNull("2026-11-18T03:00:00Z'); drop table x;--")).toBeNull();
  });
});

describe("the admin Server Actions", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth/dal");
    vi.doUnmock("@/lib/supabase/config");
  });

  async function as(role: "user" | "admin" | null) {
    vi.doMock("@/lib/supabase/config", () => ({
      isSupabaseConfigured: () => true,
    }));
    const from = vi.fn(() => {
      throw new Error("the database must not be reached");
    });
    vi.doMock("@/lib/auth/dal", () => ({
      getSession: async () =>
        role
          ? {
              viewer: { id: "x", email: "", displayName: "X", role },
              supabase: { from, rpc: from },
            }
          : null,
    }));
    return { actions: await import("./admin-actions"), from };
  }

  it("refuse guests and non-admins before touching the database", async () => {
    for (const role of [null, "user"] as const) {
      const { actions, from } = await as(role);
      const id = "00000000-0000-4000-8000-000000000001";
      expect(await actions.loadInbox()).toEqual({
        ok: false,
        error: "Admins only.",
      });
      expect(await actions.loadThread(id)).toEqual({
        ok: false,
        error: "Admins only.",
      });
      expect(await actions.sendAdminReply(id, "hi")).toEqual({
        ok: false,
        error: "Admins only.",
      });
      expect(await actions.setConversationStatus(id, "closed")).toEqual({
        ok: false,
        error: "Admins only.",
      });
      expect(from).not.toHaveBeenCalled();
      vi.resetModules();
    }
  });

  it("check the reply and the ids before touching the database", async () => {
    const { actions, from } = await as("admin");
    const id = "00000000-0000-4000-8000-000000000001";
    expect(await actions.sendAdminReply(id, "   ")).toEqual({
      ok: false,
      error: "Type a reply first.",
    });
    expect(await actions.sendAdminReply(id, "x".repeat(1001))).toEqual({
      ok: false,
      error: "Messages can be up to 1000 characters.",
    });
    expect(await actions.sendAdminReply("not-a-uuid", "hi")).toEqual({
      ok: false,
      error: "No such conversation.",
    });
    expect(await actions.setConversationStatus(id, "archived")).toEqual({
      ok: false,
      error: "No such conversation.",
    });
    expect(from).not.toHaveBeenCalled();
  });
});

describe("getRealtimeToken", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth/dal");
    vi.doUnmock("@/lib/supabase/config");
  });

  it("is null for guests and the session's token (with its expiry) for a user", async () => {
    vi.doMock("@/lib/supabase/config", () => ({
      isSupabaseConfigured: () => true,
    }));
    let session: unknown = null;
    vi.doMock("@/lib/auth/dal", () => ({ getSession: async () => session }));
    const { getRealtimeToken } = await import("./actions");
    expect(await getRealtimeToken()).toBeNull();
    session = {
      viewer: { id: "x", email: "", displayName: "X", role: "user" },
      supabase: {
        auth: {
          getSession: async () => ({
            data: {
              session: { access_token: "tok", expires_at: 1_800_000_000 },
            },
          }),
        },
      },
    };
    expect(await getRealtimeToken()).toEqual({
      token: "tok",
      expiresAt: 1_800_000_000_000,
    });
  });
});
