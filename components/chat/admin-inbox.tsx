"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "cn";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  loadInbox,
  loadThread,
  markThreadRead,
  pollThread,
  sendAdminReply,
  setConversationStatus,
} from "@/lib/chat/admin-actions";
import {
  applyLiveMessage,
  filterInbox,
  type InboxFilter,
  type InboxRow,
} from "@/lib/chat/inbox";
import {
  asMessage,
  lastAt,
  mergeMessages,
  startLive,
  type Connect,
  type LiveStatus,
} from "@/lib/chat/live";
import type { ChatMessageRow, ConversationStatus } from "@/types/supabase";
import { Composer, LiveDot, MessageList, timeWIB } from "./chat-parts";

/**
 * The admin's inbox at /admin/chat (Phase 18b). Listens on `chat:admin`, so a
 * new message in any conversation moves it to the top live; polls every 5 s
 * while Realtime is down. On phones the list and the thread take turns.
 */

const connect: Connect = async (topic, handlers) =>
  (await import("@/lib/chat/realtime")).realtimeConnect(topic, handlers);

export const FILTER_LABEL: Record<InboxFilter, string> = {
  all: "All",
  "needs-admin": "Needs admin",
  open: "Open",
  closed: "Closed",
};

export interface ThreadState {
  id: string;
  name: string;
  status: ConversationStatus;
  messages: ChatMessageRow[];
  hasEarlier: boolean;
}

export function AdminInbox({ initialRows }: { initialRows: InboxRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const rowsRef = useRef(initialRows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadState | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const [announce, setAnnounce] = useState("");
  const openRef = useRef<string | null>(null);
  const threadRef = useRef<ThreadState | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const readTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const putThread = useCallback(
    (fn: (t: ThreadState | null) => ThreadState | null) => {
      setThread((cur) => {
        const next = fn(cur);
        threadRef.current = next;
        return next;
      });
    },
    [],
  );

  const reload = useCallback(async () => {
    const r = await loadInbox();
    if (r.ok)
      setRows(
        r.rows.map((row) =>
          row.id === openRef.current ? { ...row, unread: false } : row,
        ),
      );
  }, []);

  const addToThread = useCallback(
    (incoming: ChatMessageRow[]) => {
      putThread((t) =>
        t ? { ...t, messages: mergeMessages(t.messages, incoming) } : t,
      );
      if (readTimer.current) clearTimeout(readTimer.current);
      const id = openRef.current;
      readTimer.current = setTimeout(() => void markThreadRead(id), 1500);
    },
    [putThread],
  );

  useEffect(
    () =>
      startLive(
        {
          topic: "chat:admin",
          onMessage: (payload) => {
            const m = asMessage(payload);
            if (!m) return;
            // A conversation the list doesn't have yet: reload the list.
            if (!rowsRef.current.some((r) => r.id === m.conversation_id))
              void reload();
            else
              setRows(
                (cur) => applyLiveMessage(cur, m, openRef.current) ?? cur,
              );
            if (m.conversation_id === openRef.current) {
              addToThread([m]);
              if (m.sender_role !== "admin")
                setAnnounce(
                  `${m.sender_role === "bot" ? "Bot" : threadRef.current?.name}: ${m.body}`,
                );
            }
          },
          onStatus: setStatus,
          poll: async () => {
            await reload();
            const id = openRef.current;
            const t = threadRef.current;
            if (id && t) {
              const r = await pollThread(id, lastAt(t.messages));
              if (r.ok && r.messages.length && openRef.current === id)
                addToThread(r.messages);
            }
          },
        },
        connect,
      ),
    [reload, addToThread],
  );

  useEffect(() => {
    const el = listRef.current;
    if (el && !loadingEarlier) el.scrollTop = el.scrollHeight;
  }, [thread?.messages.length, loadingEarlier]);

  async function open(id: string) {
    openRef.current = id;
    setOpenId(id);
    setThreadError(null);
    setReplyError(null);
    setDraft("");
    setLoadingThread(true);
    putThread(() => null);
    const r = await loadThread(id);
    setLoadingThread(false);
    if (openRef.current !== id) return;
    if (!r.ok) {
      setThreadError(r.error);
      return;
    }
    putThread(() => ({
      id: r.id,
      name: r.name,
      status: r.status,
      messages: r.messages,
      hasEarlier: r.hasEarlier,
    }));
    setRows((cur) =>
      cur.map((row) => (row.id === id ? { ...row, unread: false } : row)),
    );
  }

  function close() {
    openRef.current = null;
    setOpenId(null);
    putThread(() => null);
  }

  async function earlier() {
    const t = threadRef.current;
    if (!t?.messages[0]) return;
    setLoadingEarlier(true);
    const r = await loadThread(t.id, t.messages[0].created_at);
    setLoadingEarlier(false);
    if (r.ok)
      putThread((cur) =>
        cur && cur.id === r.id
          ? {
              ...cur,
              hasEarlier: r.hasEarlier,
              messages: mergeMessages(cur.messages, r.messages),
            }
          : cur,
      );
  }

  async function reply() {
    const t = threadRef.current;
    if (!t || sending) return;
    setSending(true);
    setReplyError(null);
    try {
      const r = await sendAdminReply(t.id, draft);
      if (!r.ok) {
        setReplyError(r.error);
        return;
      }
      setDraft("");
      addToThread([r.message]);
      setRows((cur) => applyLiveMessage(cur, r.message, t.id) ?? cur);
    } catch {
      setReplyError("Couldn't send the reply. Check your connection.");
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    const t = threadRef.current;
    if (!t) return;
    setChanging(true);
    const next = t.status === "open" ? "closed" : "open";
    const r = await setConversationStatus(t.id, next);
    setChanging(false);
    if (!r.ok) {
      setReplyError(r.error);
      return;
    }
    putThread((cur) => (cur ? { ...cur, status: r.status } : cur));
    setRows((cur) =>
      cur.map((row) => (row.id === t.id ? { ...row, status: r.status } : row)),
    );
  }

  return (
    <>
      <InboxView
        rows={rows}
        filter={filter}
        onFilter={setFilter}
        openId={openId}
        onOpen={(id) => void open(id)}
        onBack={close}
        status={status}
        thread={
          openId ? (
            <ThreadView
              thread={thread}
              loading={loadingThread}
              error={threadError}
              onBack={close}
              onEarlier={() => void earlier()}
              loadingEarlier={loadingEarlier}
              draft={draft}
              onDraft={setDraft}
              onSend={() => void reply()}
              sending={sending}
              replyError={replyError}
              onToggleStatus={() => void toggleStatus()}
              changing={changing}
              listRef={listRef}
            />
          ) : null
        }
      />
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </>
  );
}

/** The inbox without its data (also used by /styleguide/chat). */
export function InboxView({
  rows,
  filter,
  onFilter,
  openId,
  onOpen,
  status,
  thread,
}: {
  rows: readonly InboxRow[];
  filter: InboxFilter;
  onFilter: (f: InboxFilter) => void;
  openId: string | null;
  onOpen: (id: string) => void;
  onBack?: () => void;
  status: LiveStatus | null;
  thread: ReactNode;
}) {
  const shown = filterInbox(rows, filter);
  return (
    <div className="grid min-h-[560px] overflow-hidden rounded-card border border-line bg-surface md:h-[min(720px,calc(100dvh-12rem))] md:grid-cols-[minmax(260px,340px)_1fr]">
      <section
        aria-label="Conversations"
        className={cn(
          "flex min-h-0 flex-col border-line md:border-r",
          openId ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex flex-col gap-3 border-b border-line p-3">
          <div className="flex items-center justify-between">
            <h2 className="text-h4 text-fg">Conversations</h2>
            <LiveDot status={status} />
          </div>
          <div
            role="group"
            aria-label="Filter"
            className="flex flex-wrap gap-1.5"
          >
            {(Object.keys(FILTER_LABEL) as InboxFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => onFilter(f)}
                className={
                  filter === f
                    ? "rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-[13px] text-accent"
                    : "rounded-full border border-line px-3 py-1 text-[13px] text-fg-2 hover:border-line-hover hover:text-fg"
                }
              >
                {FILTER_LABEL[f]}
                {f === "needs-admin"
                  ? ` (${rows.filter((r) => r.needsAdmin).length})`
                  : ""}
              </button>
            ))}
          </div>
        </div>
        {shown.length ? (
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {shown.map((r) => (
              <li key={r.id} className="border-b border-line last:border-b-0">
                <button
                  type="button"
                  onClick={() => onOpen(r.id)}
                  aria-current={openId === r.id ? "true" : undefined}
                  className={cn(
                    "flex w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-surface-2",
                    openId === r.id && "bg-surface-2",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-[14px] leading-5",
                        r.unread ? "font-semibold text-fg" : "text-fg",
                      )}
                    >
                      {r.name}
                    </span>
                    <span className="shrink-0 spec text-[11px] text-fg-3">
                      {r.lastAt ? timeWIB(r.lastAt) : ""}
                    </span>
                  </span>
                  <span className="truncate text-[13px] leading-5 text-fg-2">
                    {r.previewRole === "admin"
                      ? "You: "
                      : r.previewRole === "bot"
                        ? "Bot: "
                        : ""}
                    {r.preview || "No messages yet"}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {r.unread ? (
                      <span className="rounded-chip bg-accent-strong px-1.5 label-micro text-white">
                        Unread
                      </span>
                    ) : null}
                    {r.needsAdmin ? (
                      <span className="rounded-chip border border-warn/50 px-1.5 label-micro text-warn">
                        Needs admin
                      </span>
                    ) : null}
                    {r.status === "closed" ? (
                      <span className="rounded-chip border border-line px-1.5 label-micro text-fg-3">
                        Closed
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-[14px] leading-5 text-fg-2">
            {rows.length
              ? `No conversations under "${FILTER_LABEL[filter]}".`
              : "No conversations yet. They appear here as soon as a user writes."}
          </p>
        )}
      </section>
      <section
        aria-label="Conversation"
        className={cn("min-h-0 flex-col", openId ? "flex" : "hidden md:flex")}
      >
        {thread ?? (
          <p className="m-auto p-6 text-center text-[14px] leading-5 text-fg-2">
            Pick a conversation to read and reply.
          </p>
        )}
      </section>
    </div>
  );
}

export function ThreadView({
  thread,
  loading,
  error,
  onBack,
  onEarlier,
  loadingEarlier,
  draft,
  onDraft,
  onSend,
  sending,
  replyError,
  onToggleStatus,
  changing,
  listRef,
}: {
  thread: ThreadState | null;
  loading?: boolean;
  error?: string | null;
  onBack: () => void;
  onEarlier?: () => void;
  loadingEarlier?: boolean;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  sending?: boolean;
  replyError?: string | null;
  onToggleStatus: () => void;
  changing?: boolean;
  listRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className="flex h-full min-h-[560px] flex-col md:min-h-0">
      <div className="flex items-center gap-2 border-b border-line p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden"
          aria-label="Back to conversations"
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <h2 className="text-h4 min-w-0 flex-1 truncate text-fg">
          {thread?.name ?? (loading ? "Loading…" : "Conversation")}
        </h2>
        {thread ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onToggleStatus}
            disabled={changing}
          >
            {thread.status === "open" ? "Close" : "Reopen"}
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="p-4 text-[14px] leading-5 text-accent">
          {error}
        </p>
      ) : thread ? (
        <>
          <MessageList
            messages={thread.messages}
            side="admin"
            userName={thread.name}
            hasEarlier={thread.hasEarlier}
            loadingEarlier={loadingEarlier}
            onLoadEarlier={onEarlier}
            listRef={listRef}
            empty={
              <p className="py-6 text-center text-[14px] text-fg-2">
                No messages yet.
              </p>
            }
          />
          {thread.status === "closed" ? (
            <p className="border-t border-line px-4 py-2 text-[12px] leading-4 text-fg-3">
              Closed. It reopens when the user writes again; you can still
              reply.
            </p>
          ) : null}
          <Composer
            value={draft}
            onChange={onDraft}
            onSend={onSend}
            busy={sending}
            error={replyError}
            label={`Reply to ${thread.name}`}
            placeholder="Write a reply"
          />
        </>
      ) : (
        <p className="m-auto p-6 text-[14px] text-fg-2">Loading…</p>
      )}
    </div>
  );
}
