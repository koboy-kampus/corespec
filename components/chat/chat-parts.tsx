"use client";

import {
  useId,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";
import { cn } from "cn";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUICK_REPLIES } from "@/lib/chat/quick-replies";
import type { LiveStatus } from "@/lib/chat/live";
import type { ChatMessageRow } from "@/types/supabase";

/**
 * The chat's building blocks (Phase 18b), with no data fetching, so the user's
 * panel, the admin inbox and /styleguide/chat render the same markup.
 */

export const MAX_MESSAGE = 1000;

export type ChatMessage = Pick<
  ChatMessageRow,
  "id" | "sender_role" | "body" | "created_at" | "bot_rule"
>;

const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

export const timeWIB = (iso: string) => TIME.format(new Date(iso));

const STATUS_TEXT: Record<LiveStatus, string> = {
  connecting: "Connecting",
  live: "Live",
  reconnecting: "Reconnecting",
};

export function LiveDot({ status }: { status: LiveStatus | null }) {
  if (!status) return null;
  return (
    <span className="flex items-center gap-1.5 label-micro text-fg-3">
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          status === "live" ? "bg-ok" : "animate-pulse bg-warn",
        )}
      />
      {STATUS_TEXT[status]}
    </span>
  );
}

/** Who wrote it, from the reader's side: "user" sees You/Admin/Bot, "admin" sees name/You/Bot. */
function senderLabel(
  m: ChatMessage,
  side: "user" | "admin",
  userName: string,
): string {
  if (m.sender_role === "bot") return "Bot";
  if (side === "user") return m.sender_role === "user" ? "You" : "Admin";
  return m.sender_role === "admin" ? "You (admin)" : userName;
}

export function MessageBubble({
  message,
  side,
  userName = "User",
}: {
  message: ChatMessage;
  side: "user" | "admin";
  userName?: string;
}) {
  const mine =
    (side === "user" && message.sender_role === "user") ||
    (side === "admin" && message.sender_role === "admin");
  const bot = message.sender_role === "bot";
  return (
    <li
      className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
    >
      <span className="flex items-center gap-1.5 text-[12px] leading-4 text-fg-3">
        {bot ? (
          <span className="flex items-center gap-1 rounded-chip border border-line px-1.5 py-px label-micro text-fg-2">
            <Bot className="size-3" aria-hidden />
            Bot
          </span>
        ) : (
          <span>{senderLabel(message, side, userName)}</span>
        )}
        <time dateTime={message.created_at}>{timeWIB(message.created_at)}</time>
      </span>
      <p
        className={cn(
          "max-w-[85%] rounded-[16px] px-3 py-2 text-[14px] leading-5 break-words whitespace-pre-wrap",
          mine
            ? "rounded-br-[4px] bg-accent-strong text-white"
            : bot
              ? "rounded-bl-[4px] border border-line bg-surface-2 text-fg"
              : "rounded-bl-[4px] bg-surface-2 text-fg",
        )}
      >
        {message.body}
      </p>
    </li>
  );
}

export function MessageList({
  messages,
  side,
  userName,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  empty,
  listRef,
}: {
  messages: readonly ChatMessage[];
  side: "user" | "admin";
  userName?: string;
  hasEarlier?: boolean;
  loadingEarlier?: boolean;
  onLoadEarlier?: () => void;
  empty?: ReactNode;
  listRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={listRef}
      // Scrollable, so keyboard users can focus it and scroll with the arrows.
      tabIndex={0}
      role="group"
      aria-label="Messages"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      {hasEarlier ? (
        <div className="mb-3 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadEarlier}
            disabled={loadingEarlier}
          >
            {loadingEarlier ? "Loading…" : "Load earlier"}
          </Button>
        </div>
      ) : null}
      {messages.length ? (
        <ol className="flex flex-col gap-3">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              side={side}
              userName={userName}
            />
          ))}
        </ol>
      ) : (
        empty
      )}
    </div>
  );
}

export function QuickReplies({
  onPick,
  disabled,
}: {
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <ul
      aria-label="Quick questions"
      className="flex flex-wrap gap-1.5 px-4 pb-2"
    >
      {QUICK_REPLIES.map((q) => (
        <li key={q}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(q)}
            className="rounded-full border border-line bg-surface px-3 py-1 text-[13px] leading-5 text-fg-2 hover:border-line-hover hover:text-fg disabled:opacity-50"
          >
            {q}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** The text box: a counter, Enter sends, Shift+Enter is a new line. */
export function Composer({
  value,
  onChange,
  onSend,
  busy,
  error,
  label,
  placeholder,
  disabled,
  inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy?: boolean;
  error?: string | null;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  inputRef?: Ref<HTMLTextAreaElement>;
}) {
  const id = useId();
  const length = [...value].length;
  const over = length > MAX_MESSAGE;
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (!busy && !over && value.trim()) onSend();
    }
  };
  return (
    <form
      className="flex flex-col gap-1.5 border-t border-line px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!busy && !over && value.trim()) onSend();
      }}
    >
      {error ? (
        <p
          role="alert"
          id={`${id}-error`}
          className="px-1 text-[13px] leading-5 text-accent"
        >
          {error}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
        <textarea
          id={id}
          ref={inputRef}
          rows={2}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          aria-describedby={`${id}-count${error ? ` ${id}-error` : ""}`}
          aria-invalid={over || undefined}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-input border border-line bg-canvas px-3 py-2 text-[14px] leading-5 text-fg placeholder:text-fg-3 focus-visible:border-accent focus-visible:outline-none disabled:opacity-60"
        />
        <Button
          type="submit"
          size="icon"
          aria-label={busy ? "Sending" : "Send"}
          disabled={busy || over || !value.trim() || disabled}
          icon={<Send />}
        />
      </div>
      <p
        id={`${id}-count`}
        className={cn(
          "px-1 text-right spec text-[11px] leading-4",
          over ? "text-accent" : "text-fg-3",
        )}
      >
        {length}/{MAX_MESSAGE}
        <span className="sr-only"> characters</span>
      </p>
    </form>
  );
}

/** The user's panel without its data: the header, the list, chips and the box. */
type TextProps = { id?: string; className: string; children: ReactNode };

export function ChatPanelView({
  Title = "h2",
  Description = "p",
  titleId,
  descriptionId,
  status,
  messages,
  hasEarlier,
  loadingEarlier,
  onLoadEarlier,
  showQuickReplies,
  onQuickReply,
  draft,
  onDraft,
  onSend,
  sending,
  error,
  notice,
  closeButton,
  listRef,
  inputRef,
}: {
  /** The dialog's own title and description elements, when inside one. */
  Title?: ComponentType<TextProps> | "h2";
  Description?: ComponentType<TextProps> | "p";
  titleId: string;
  descriptionId: string;
  status: LiveStatus | null;
  messages: readonly ChatMessage[];
  hasEarlier?: boolean;
  loadingEarlier?: boolean;
  onLoadEarlier?: () => void;
  showQuickReplies: boolean;
  onQuickReply: (text: string) => void;
  draft: string;
  onDraft: (v: string) => void;
  onSend: () => void;
  sending?: boolean;
  error?: string | null;
  /** Replaces the box (e.g. "Log in to chat"). */
  notice?: ReactNode;
  closeButton?: ReactNode;
  listRef?: Ref<HTMLDivElement>;
  inputRef?: Ref<HTMLTextAreaElement>;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <Title
              // A dialog's own Title keeps the id its aria-labelledby uses
              // (even an explicit undefined would replace it).
              {...(Title === "h2" ? { id: titleId } : {})}
              className="text-h4 text-fg"
            >
              CoreSpec chat
            </Title>
            <LiveDot status={status} />
          </div>
          <Description
            {...(Description === "p" ? { id: descriptionId } : {})}
            className="text-[12px] leading-4 text-fg-3"
          >
            A bot answers common questions; the admin replies when online.
          </Description>
        </div>
        {closeButton}
      </div>
      <MessageList
        messages={messages}
        side="user"
        hasEarlier={hasEarlier}
        loadingEarlier={loadingEarlier}
        onLoadEarlier={onLoadEarlier}
        listRef={listRef}
        empty={
          <p className="py-6 text-center text-[14px] leading-5 text-fg-2">
            Ask about prices, compatibility, checkout or receipts. Pick a
            question below or type your own.
          </p>
        }
      />
      {notice ? (
        <div className="border-t border-line px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] text-[14px] leading-5 text-fg-2">
          {notice}
        </div>
      ) : (
        <>
          {showQuickReplies ? (
            <QuickReplies onPick={onQuickReply} disabled={sending} />
          ) : null}
          <Composer
            value={draft}
            onChange={onDraft}
            onSend={onSend}
            busy={sending}
            error={error}
            label="Message"
            placeholder="Type a message"
            inputRef={inputRef}
          />
        </>
      )}
    </div>
  );
}

/** Chips after a bot reply, or in an empty conversation. */
export const wantsQuickReplies = (messages: readonly ChatMessage[]) =>
  !messages.length || messages.at(-1)!.sender_role === "bot";
