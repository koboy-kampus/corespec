"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadChat,
  markChatRead,
  pollChat,
  sendChatMessage,
} from "@/lib/chat/actions";
import {
  asMessage,
  lastAt,
  mergeMessages,
  startLive,
  type Connect,
  type LiveStatus,
} from "@/lib/chat/live";
import {
  dropPending,
  newPending,
  setPendingState,
  settlePending,
  withPending,
  type PendingMessage,
} from "@/lib/chat/pending";
import type { ChatMessageRow } from "@/types/supabase";
import { ChatPanelView, wantsQuickReplies } from "./chat-parts";

/**
 * The user's chat panel (Phase 18b). Loaded with `import()` only when the chat
 * button is pressed, together with Realtime (lib/chat/realtime.ts), so no
 * page carries any of it until then.
 *
 * A dialog: a full-height sheet on phones, a 380 × 560 card on larger
 * screens. Escape closes it and focus goes back to the chat button.
 */

/** Realtime, loaded on first use. */
const connect: Connect = async (topic, handlers) =>
  (await import("@/lib/chat/realtime")).realtimeConnect(topic, handlers);

const ROLE_NAME = { admin: "Admin", bot: "Bot", user: "You" } as const;

export function ChatDialog({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Where focus goes when the panel closes (the chat button). */
  returnFocus?: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 md:bg-black/20" />
        <Dialog.Content
          data-testid="chat-panel"
          className="fixed inset-0 z-50 flex h-[100dvh] w-full max-w-[100vw] flex-col overflow-x-hidden overscroll-none bg-surface outline-none md:inset-auto md:right-4 md:bottom-4 md:h-[560px] md:max-h-[calc(100dvh-2rem)] md:w-[380px] md:overflow-hidden md:rounded-card md:border md:border-line md:shadow-2xl"
          onCloseAutoFocus={(e) => {
            // Radix returns focus to its own Trigger; the chat button isn't one.
            e.preventDefault();
            returnFocus?.();
          }}
          onOpenAutoFocus={(e) => {
            // Focus the text box (when there is one) instead of the first button.
            const box = (e.currentTarget as HTMLElement).querySelector(
              "textarea",
            );
            if (box) {
              e.preventDefault();
              box.focus();
            }
          }}
        >
          <ChatPanel />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  // The user's messages on their way to the server (optimistic sending).
  const [pending, setPending] = useState<PendingMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [hasEarlier, setHasEarlier] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginNeeded, setLoginNeeded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [announce, setAnnounce] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const latest = useRef<ChatMessageRow[]>([]);
  const stickToBottom = useRef(true);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const add = useCallback((incoming: ChatMessageRow[], fromOthers: boolean) => {
    setMessages((cur) => {
      const next = mergeMessages(cur, incoming);
      latest.current = next;
      return next;
    });
    // A saved copy (from the action or Realtime) replaces the "Sending…" one.
    setPending((cur) => settlePending(cur, incoming));
    if (fromOthers) {
      const news = incoming.filter((m) => m.sender_role !== "user");
      const last = news.at(-1);
      if (last) {
        setAnnounce(`${ROLE_NAME[last.sender_role]}: ${last.body}`);
        // The panel is open, so whatever arrives is read (once things settle).
        if (readTimer.current) clearTimeout(readTimer.current);
        readTimer.current = setTimeout(() => void markChatRead(), 1500);
      }
    }
  }, []);

  // First open: the newest page, then mark it read.
  useEffect(() => {
    let cancelled = false;
    void loadChat().then((r) => {
      if (cancelled) return;
      setLoaded(true);
      if (!r.ok) {
        if (r.code === "login") setLoginNeeded(true);
        else setError(r.error);
        return;
      }
      setConversationId(r.conversationId);
      setHasEarlier(r.hasEarlier);
      add(r.messages, false);
      if (r.conversationId) void markChatRead();
    });
    return () => {
      cancelled = true;
      if (readTimer.current) clearTimeout(readTimer.current);
    };
  }, [add]);

  // Live updates once there is a conversation (after the first message).
  useEffect(() => {
    if (!conversationId) return;
    return startLive(
      {
        topic: `chat:${conversationId}`,
        onMessage: (payload) => {
          const m = asMessage(payload);
          if (m && m.conversation_id === conversationId) add([m], true);
        },
        onStatus: setStatus,
        poll: async () => {
          const r = await pollChat(lastAt(latest.current));
          if (r.ok) add(r.messages, true);
        },
      },
      connect,
    );
  }, [conversationId, add]);

  // Keep the newest message in view, unless the user scrolled up to read.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      stickToBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loaded]);

  /**
   * Shows the message at once ("Sending…"), then swaps in the saved row, or
   * marks it "Not sent — Retry". `retryId` resends a failed one.
   */
  async function send(text: string, retryId?: string) {
    const body = text.trim();
    if (sending || !body) return;
    const fresh = retryId ? null : newPending(body);
    const id = retryId ?? fresh!.id;
    if (fresh) {
      setPending((cur) => [...cur, fresh]);
      setDraft("");
    } else setPending((cur) => setPendingState(cur, id, "sending"));
    stickToBottom.current = true;
    setSending(true);
    setError(null);
    const notSent = (message: string) => {
      setError(message);
      setPending((cur) => setPendingState(cur, id, "failed"));
    };
    try {
      const r = await sendChatMessage(body);
      if (!r.ok) {
        if (r.code === "login") setLoginNeeded(true);
        notSent(r.error);
        return;
      }
      setPending((cur) => dropPending(cur, id));
      setConversationId(r.conversationId);
      add(r.messages.slice(0, 1), false);
      add(r.messages.slice(1), true);
    } catch {
      notSent(
        "Couldn't send your message. Check your connection and try again.",
      );
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function retry(id: string) {
    const p = pending.find((m) => m.id === id);
    if (p) void send(p.body, id);
  }

  async function loadEarlier() {
    const first = latest.current[0];
    if (!first) return;
    setLoadingEarlier(true);
    stickToBottom.current = false;
    const r = await loadChat(first.created_at);
    setLoadingEarlier(false);
    if (r.ok) {
      setHasEarlier(r.hasEarlier);
      add(r.messages, false);
    }
  }

  const shown = withPending(messages, pending);
  const titleId = "chat-title";
  const descriptionId = "chat-description";
  return (
    <>
      <ChatPanelView
        Title={Dialog.Title}
        Description={Dialog.Description}
        titleId={titleId}
        descriptionId={descriptionId}
        status={conversationId ? status : null}
        messages={shown}
        onRetry={retry}
        hasEarlier={hasEarlier}
        loadingEarlier={loadingEarlier}
        onLoadEarlier={loadEarlier}
        showQuickReplies={loaded && wantsQuickReplies(shown)}
        onQuickReply={(q) => void send(q)}
        draft={draft}
        onDraft={setDraft}
        onSend={() => void send(draft)}
        sending={sending}
        error={error}
        notice={
          loginNeeded ? (
            <>
              Your session has ended.{" "}
              <Link href="/login" className="text-accent underline">
                Log in
              </Link>{" "}
              to chat.
            </>
          ) : undefined
        }
        closeButton={
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Close chat">
              <X />
            </Button>
          </Dialog.Close>
        }
        listRef={listRef}
        inputRef={inputRef}
      />
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </>
  );
}
