"use client";

import { useState } from "react";
import { FALLBACK_REPLY, BOT_RULES } from "@/lib/chat/bot";
import type { InboxFilter, InboxRow } from "@/lib/chat/inbox";
import type { LiveStatus } from "@/lib/chat/live";
import { InboxView, ThreadView, type ThreadState } from "./admin-inbox";
import {
  ChatPanelView,
  wantsQuickReplies,
  type ChatMessage,
} from "./chat-parts";

/**
 * /styleguide/chat (Phase 18b): the chat panel and the admin inbox with
 * sample messages in every state, so the e2e suite can run axe and a
 * phone-width check without a login (the real ones need one).
 */

const reply = (id: string) => BOT_RULES.find((r) => r.id === id)!.reply;
const at = (min: number) =>
  new Date(Date.UTC(2026, 10, 18, 3, min)).toISOString();
let n = 0;
const msg = (
  sender_role: ChatMessage["sender_role"],
  body: string,
  min: number,
  bot_rule: string | null = null,
): ChatMessage => ({
  id: `s${++n}`,
  sender_role,
  body,
  created_at: at(min),
  bot_rule,
});

const BOT_REPLY = [
  msg("user", "Are the prices real?", 1),
  msg("bot", reply("prices"), 1, "prices"),
];
const ADMIN_REPLY = [
  ...BOT_REPLY,
  msg("user", "Can the admin check the RTX price for me?", 3),
  msg("bot", reply("human"), 3, "human"),
  msg(
    "admin",
    "Hi! I checked it this morning: Tokopedia has it for Rp 11.285.000.",
    6,
  ),
];
const FALLBACK = [
  msg("user", "Do you deliver to Bandung?", 8),
  msg("bot", FALLBACK_REPLY, 8, "fallback"),
];

const STATES: {
  id: string;
  title: string;
  status: LiveStatus | null;
  messages: ChatMessage[];
  error?: string;
  draft?: string;
}[] = [
  {
    id: "empty",
    title: "Empty, with quick replies",
    status: null,
    messages: [],
  },
  { id: "bot", title: "Bot reply", status: "live", messages: BOT_REPLY },
  { id: "admin", title: "Admin reply", status: "live", messages: ADMIN_REPLY },
  {
    id: "error",
    title: "Error (rate limit)",
    status: "live",
    messages: BOT_REPLY,
    error:
      "You're sending messages too fast. Wait a few seconds and try again.",
    draft: "One more question",
  },
  {
    id: "sending",
    title: "Sending, and not sent",
    status: "live",
    messages: [
      ...BOT_REPLY,
      { ...msg("user", "How does checkout work?", 2), state: "failed" },
      { ...msg("user", "Download receipt", 2), state: "sending" },
    ],
    error: "Couldn't send your message. Check your connection and try again.",
  },
  {
    id: "reconnecting",
    title: "Reconnecting (polling)",
    status: "reconnecting",
    messages: FALLBACK,
  },
];

const ROWS: InboxRow[] = [
  {
    id: "c1",
    owner: "u1",
    name: "Budi Santoso",
    status: "open",
    lastAt: at(8),
    preview: "Do you deliver to Bandung?",
    previewRole: "user",
    unread: true,
    needsAdmin: true,
  },
  {
    id: "c2",
    owner: "u2",
    name: "Siti Rahma",
    status: "open",
    lastAt: at(6),
    preview:
      "Hi! I checked it this morning: Tokopedia has it for Rp 11.285.000.",
    previewRole: "admin",
    unread: false,
    needsAdmin: false,
  },
  {
    id: "c3",
    owner: "u3",
    name: "Andi",
    status: "closed",
    lastAt: at(1),
    preview: reply("prices"),
    previewRole: "bot",
    unread: false,
    needsAdmin: false,
  },
];

const THREAD: ThreadState = {
  id: "c2",
  name: "Siti Rahma",
  status: "open",
  messages: ADMIN_REPLY as ThreadState["messages"],
  hasEarlier: true,
};

const noop = () => {};

/** One panel state; the text box is live, so the resize can be tried. */
function SamplePanel({ sample: s }: { sample: (typeof STATES)[number] }) {
  const [draft, setDraft] = useState(s.draft ?? "");
  return (
    <ChatPanelView
      titleId={`t-${s.id}`}
      descriptionId={`d-${s.id}`}
      status={s.status}
      messages={s.messages}
      hasEarlier={s.id === "admin"}
      showQuickReplies={wantsQuickReplies(s.messages)}
      onQuickReply={noop}
      draft={draft}
      onDraft={setDraft}
      onSend={() => setDraft("")}
      error={s.error}
      onRetry={noop}
    />
  );
}

export function ChatSamples() {
  const [filter, setFilter] = useState<InboxFilter>("all");
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="panels" className="flex flex-col gap-4">
        <h2 id="panels" className="text-h3 text-fg">
          Chat panel
        </h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {STATES.map((s) => (
            <figure
              key={s.id}
              data-testid={`chat-sample-${s.id}`}
              className="flex flex-col gap-2"
            >
              <figcaption className="label-micro text-fg-3">
                {s.title}
              </figcaption>
              <div className="h-[560px] overflow-hidden rounded-card border border-line bg-surface">
                <SamplePanel sample={s} />
              </div>
            </figure>
          ))}
        </div>
      </section>
      <section
        aria-labelledby="inbox"
        className="flex flex-col gap-4"
        data-testid="chat-sample-inbox"
      >
        <h2 id="inbox" className="text-h3 text-fg">
          Admin inbox
        </h2>
        <InboxView
          rows={ROWS}
          filter={filter}
          onFilter={setFilter}
          openId="c2"
          onOpen={noop}
          status="live"
          thread={
            <ThreadView
              thread={THREAD}
              onBack={noop}
              onEarlier={noop}
              draft=""
              onDraft={noop}
              onSend={noop}
              onToggleStatus={noop}
            />
          }
        />
      </section>
    </div>
  );
}
