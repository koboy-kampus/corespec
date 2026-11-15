"use client";

import { useId, useState } from "react";
import { Check, CloudOff, Link2, RefreshCw } from "lucide-react";
import { cn } from "cn";
import { useAuthHint } from "@/components/account/use-auth-hint";
import { ShareDialog } from "@/components/builds/share-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { Tip } from "@/components/ui/tooltip";
import { flushSync } from "@/lib/account/sync-client";
import { sharePath } from "@/lib/share";
import { useAccountStore } from "@/store/account";
import { useBuildStore } from "@/store/build";

/**
 * On /builder the navbar's "Start Building" would link to the page you're on,
 * so it shows these instead: "Share build" (copies the build's /b/… link) and
 * whether the build is saved. Guests save in this browser; a logged-in user's
 * account builds also sync (components/account/account-sync.tsx).
 */

type Status = "saved" | "syncing" | "synced" | "failed";

const STATUS: Record<
  Status,
  { text: string; detail: string; icon: typeof Check }
> = {
  saved: { text: "Saved", detail: "Saved in this browser", icon: Check },
  syncing: {
    text: "Syncing…",
    detail: "Saving to your account",
    icon: RefreshCw,
  },
  synced: { text: "Synced", detail: "Saved to your account", icon: Check },
  failed: {
    text: "Sync failed – retry",
    detail: "Couldn't save to your account. It's still saved in this browser.",
    icon: CloudOff,
  },
};

function useSaveStatus(): Status {
  const hint = useAuthHint();
  const sync = useAccountStore((s) => s.sync);
  const owned = useBuildStore(
    (s) => !!s.account && s.build.owner === s.account,
  );
  // A guest build (or accounts off): saved in this browser, nothing to sync.
  if (!hint || !owned || sync === "idle") return "saved";
  return sync;
}

/** "Saved" / "Synced" / "Syncing…" / "Sync failed – retry", with an icon. */
export function SaveStatus({
  className,
  compact = false,
}: {
  className?: string;
  /** Below 640px, icon only (the text stays for screen readers); the menu has it in full. */
  compact?: boolean;
}) {
  const status = useSaveStatus();
  const { text, detail, icon: Icon } = STATUS[status];
  const label = compact ? "max-sm:sr-only" : undefined;
  const look = cn(
    "inline-flex items-center gap-1.5 text-[13px] leading-5 whitespace-nowrap",
    status === "failed" ? "text-warn" : "text-fg-3",
  );
  return (
    // Polite: read out when it changes, without interrupting.
    <div
      aria-live="polite"
      data-testid="save-status"
      data-status={status}
      className={className}
    >
      {status === "failed" ? (
        <button
          type="button"
          onClick={() => void flushSync()}
          className={cn(
            look,
            "cursor-pointer rounded-input px-1 underline decoration-warn/40 underline-offset-4 hover:decoration-warn",
            compact && "max-sm:size-8 max-sm:justify-center",
          )}
          title={detail}
        >
          <Icon className="size-3.5 shrink-0" aria-hidden />
          <span className={label}>{text}</span>
        </button>
      ) : (
        <span className={look} title={detail}>
          <Icon
            className={cn(
              "size-3.5 shrink-0",
              status === "syncing" && "animate-spin motion-reduce:animate-none",
            )}
            aria-hidden
          />
          <span className={label}>{text}</span>
          <span className="sr-only">: {detail}</span>
        </span>
      )}
    </div>
  );
}

/** Copies the current build's share link, with a "Link copied" toast. */
export function ShareBuildButton({
  size = "sm",
  compact = false,
  className,
  onCopied,
}: {
  size?: "sm" | "lg";
  /** Below 640px, icon only (still named "Share build"). */
  compact?: boolean;
  className?: string;
  /** After a copy (the mobile menu closes itself). */
  onCopied?: () => void;
}) {
  const build = useBuildStore((s) => s.build);
  const [fallbackOpen, setFallbackOpen] = useState(false);
  const whyId = useId();
  const empty = Object.keys(build.parts).length === 0;

  async function share() {
    if (empty) return;
    const url = `${window.location.origin}${sharePath(build)}`;
    try {
      await navigator.clipboard.writeText(url);
      onCopied?.();
      toast("Link copied");
    } catch {
      // Clipboard blocked: show the link to copy by hand.
      setFallbackOpen(true);
    }
  }

  const button = (
    <Button
      size={size}
      icon={<Link2 />}
      // aria-disabled, not disabled: it stays focusable, so the tooltip that
      // says why can be reached with the keyboard too.
      aria-disabled={empty || undefined}
      aria-describedby={empty ? whyId : undefined}
      onClick={() => void share()}
      className={cn(
        empty &&
          "pointer-events-auto cursor-not-allowed border-line-strong bg-surface text-fg-3 shadow-none hover:brightness-100",
        compact && "max-sm:w-8 max-sm:px-0",
        className,
      )}
      data-testid="share-build"
    >
      <span className={compact ? "max-sm:sr-only" : undefined}>
        Share build
      </span>
    </Button>
  );

  return (
    <>
      {empty ? <Tip content="Add a part to share">{button}</Tip> : button}
      {empty ? (
        <span id={whyId} className="sr-only">
          Add a part to share
        </span>
      ) : null}
      <ShareDialog
        build={build}
        open={fallbackOpen}
        onOpenChange={setFallbackOpen}
      />
    </>
  );
}
