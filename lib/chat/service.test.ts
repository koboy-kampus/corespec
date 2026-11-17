import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChatMessageRow, ConversationRow } from "@/types/supabase";
import { FALLBACK_REPLY, FALLBACK_RULE, QUICK_REPLIES } from "./bot";
import {
  ChatLengthError,
  ChatRateLimitError,
  MAX_MESSAGE,
  sendChatMessage,
  type ChatStore,
} from "./service";

/**
 * sendChatMessage with an in-memory store that follows the database's rules
 * that matter here (the rate limit, "the bot only answers a user's message").
 * The real rules are tested against Postgres in supabase/tests/rls.sql.
 */

const alice = { id: "a0000000-0000-4000-8000-000000000001" };
const NOW = Date.parse("2026-11-18T10:00:00.000Z");

function memoryStore(opts: { rateLimitAfter?: number } = {}) {
  const conv: ConversationRow = {
    id: "c0000000-0000-4000-8000-000000000001",
    owner: alice.id,
    status: "open",
    last_message_at: null,
    user_last_read_at: null,
    admin_last_read_at: null,
    created_at: new Date(NOW - 3_600_000).toISOString(),
  };
  const messages: ChatMessageRow[] = [];
  let clock = NOW;
  const add = (m: Omit<ChatMessageRow, "id" | "created_at">) => {
    const row = {
      ...m,
      id: `m${messages.length + 1}`,
      created_at: new Date(clock++).toISOString(),
    };
    messages.push(row);
    return row;
  };
  const store: ChatStore & {
    messages: ChatMessageRow[];
    addAdmin: (minAgo: number) => void;
  } = {
    messages,
    async conversation() {
      return conv;
    },
    async postUserMessage(conversationId, senderId, body) {
      const mine = messages.filter((m) => m.sender_role === "user").length;
      if (opts.rateLimitAfter !== undefined && mine >= opts.rateLimitAfter)
        throw new ChatRateLimitError(
          "You're sending messages too fast. Wait a few seconds and try again.",
        );
      if ([...body].length > MAX_MESSAGE) throw new ChatLengthError("too long");
      return add({
        conversation_id: conversationId,
        sender_role: "user",
        sender_id: senderId,
        body,
        bot_rule: null,
      });
    },
    async recent(_id, sinceIso) {
      return messages.filter((m) => m.created_at >= sinceIso);
    },
    async postBotReply(conversationId, body, rule) {
      if (messages.at(-1)?.sender_role !== "user")
        throw new Error("The bot only answers a user's message");
      return add({
        conversation_id: conversationId,
        sender_role: "bot",
        sender_id: null,
        body,
        bot_rule: rule,
      });
    },
    addAdmin(minAgo) {
      messages.push({
        id: `a${messages.length + 1}`,
        conversation_id: conv.id,
        sender_role: "admin",
        sender_id: "admin-id",
        body: "Admin here",
        bot_rule: null,
        created_at: new Date(NOW - minAgo * 60_000).toISOString(),
      });
    },
  };
  return store;
}

const send = (store: ChatStore, body: unknown, bot = true) =>
  sendChatMessage({ store, sender: alice, bot, now: () => NOW }, body);

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe("sendChatMessage", () => {
  it("saves the trimmed message and the bot answers a matching rule", async () => {
    const store = memoryStore();
    const r = await send(store, "  Harganya asli?  ");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.messages.map((m) => [m.sender_role, m.bot_rule])).toEqual([
      ["user", null],
      ["bot", "prices"],
    ]);
    expect(r.messages[0].body).toBe("Harganya asli?");
    expect(r.quickReplies).toEqual(QUICK_REPLIES);
  });

  it("refuses empty, non-text and over-long messages before touching the database", async () => {
    const store = memoryStore();
    for (const body of ["", "   \n\t", undefined, 42, { body: "x" }])
      expect(await send(store, body)).toMatchObject({
        ok: false,
        code: "empty",
      });
    expect(await send(store, "x".repeat(MAX_MESSAGE + 1))).toEqual({
      ok: false,
      code: "too-long",
      error: "Messages can be up to 1000 characters.",
    });
    expect(store.messages).toEqual([]);
    // Exactly the limit is fine (an emoji counts as one character, as in Postgres).
    expect((await send(store, "😀".repeat(MAX_MESSAGE))).ok).toBe(true);
  });

  it("passes the database's rate-limit message on as is", async () => {
    const store = memoryStore({ rateLimitAfter: 5 });
    for (let i = 0; i < 5; i++)
      expect((await send(store, `hi ${i}`)).ok).toBe(true);
    expect(await send(store, "one more")).toEqual({
      ok: false,
      code: "rate-limit",
      error:
        "You're sending messages too fast. Wait a few seconds and try again.",
    });
  });

  it("stays quiet while an admin is active, but still saves the message", async () => {
    const store = memoryStore();
    store.addAdmin(3);
    const r = await send(store, "harga?");
    expect(r.ok && r.messages.map((m) => m.sender_role)).toEqual(["user"]);
    expect(r.ok && r.quickReplies).toEqual([]);
  });

  it("sends the fallback once, then stays quiet for 10 minutes", async () => {
    const store = memoryStore();
    const first = await send(store, "what's the weather");
    expect(first.ok && first.messages.at(-1)).toMatchObject({
      sender_role: "bot",
      bot_rule: FALLBACK_RULE,
      body: FALLBACK_REPLY,
    });
    const second = await send(store, "and tomorrow?");
    expect(second.ok && second.messages.map((m) => m.sender_role)).toEqual([
      "user",
    ]);
    // A matching rule still answers.
    const third = await send(store, "checkout?");
    expect(third.ok && third.messages.at(-1)?.bot_rule).toBe("checkout");
  });

  it("without the secret, sends the message and leaves the answer to the admin", async () => {
    const store = memoryStore();
    const r = await send(store, "harga?", false);
    expect(r.ok && r.messages.map((m) => m.sender_role)).toEqual(["user"]);
  });

  it("keeps the user's message when the bot's reply fails", async () => {
    const store = memoryStore();
    store.postBotReply = async () => {
      throw new Error(
        "post_bot_reply: P0001 The bot only answers a user's message",
      );
    };
    const r = await send(store, "harga?");
    expect(r.ok && r.messages.map((m) => m.sender_role)).toEqual(["user"]);
    expect(errorSpy).toHaveBeenCalled();
  });

  it("gives a friendly error, without details, when the database fails", async () => {
    const store = memoryStore();
    store.conversation = async () => {
      throw new Error("connection refused");
    };
    expect(await send(store, "hi")).toEqual({
      ok: false,
      code: "failed",
      error: "Couldn't send your message. Try again.",
    });
  });
});

describe("the sendChatMessage Server Action", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/auth/dal");
    vi.doUnmock("@/lib/supabase/config");
  });

  it("refuses guests", async () => {
    vi.doMock("@/lib/supabase/config", () => ({
      isSupabaseConfigured: () => true,
    }));
    vi.doMock("@/lib/auth/dal", () => ({ getSession: async () => null }));
    const { sendChatMessage: action } = await import("./actions");
    expect(await action("hi")).toEqual({
      ok: false,
      code: "login",
      error: "Log in to chat.",
    });
  });

  it("is off without the Supabase settings", async () => {
    vi.doMock("@/lib/supabase/config", () => ({
      isSupabaseConfigured: () => false,
    }));
    const getSession = vi.fn();
    vi.doMock("@/lib/auth/dal", () => ({ getSession }));
    const { sendChatMessage: action } = await import("./actions");
    expect(await action("hi")).toMatchObject({
      ok: false,
      code: "not-configured",
    });
    expect(getSession).not.toHaveBeenCalled();
  });
});
