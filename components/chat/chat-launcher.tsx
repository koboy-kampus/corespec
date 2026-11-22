"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useAuthHint } from "@/components/account/use-auth-hint";
import { chatUnread } from "@/lib/chat/actions";

/**
 * The chat button (Phase 18b), bottom right, for logged-in visitors only and
 * never on /admin/*. Rendered by the root layout only when accounts are on.
 *
 * It's deliberately small: the panel, its Server Action calls and Realtime
 * load with `import()` on the first press. The unread dot asks the server at
 * most once a minute per tab (and once when the panel closes), not on every
 * navigation and not over a background socket.
 */

type Dialog = ComponentType<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  returnFocus?: () => void;
}>;

const CHECK_EVERY_MS = 60_000;
// sessionStorage is per tab, which is exactly the throttle's scope.
const CHECKED_KEY = "cs-chat-unread-at";
const UNREAD_KEY = "cs-chat-unread";

function readStore(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the check just runs more often.
  }
}

/** In Suspense: it reads the URL, which would otherwise make pages dynamic. */
export function ChatLauncher() {
  return (
    <Suspense fallback={null}>
      <Launcher />
    </Suspense>
  );
}

function Launcher() {
  const role = useAuthHint();
  const pathname = usePathname();
  const [Panel, setPanel] = useState<Dialog | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // The last answer in this tab survives reloads (the launcher itself stays
  // mounted across client-side navigations).
  const [unread, setUnread] = useState(
    () => typeof window !== "undefined" && readStore(UNREAD_KEY) === "1",
  );
  const checking = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const visible = !!role && !pathname.startsWith("/admin");

  const check = (force: boolean) => {
    if (checking.current) return;
    const last = Number(readStore(CHECKED_KEY) ?? 0);
    if (!force && Date.now() - last < CHECK_EVERY_MS) return;
    checking.current = true;
    writeStore(CHECKED_KEY, String(Date.now()));
    void chatUnread()
      .then((u) => {
        setUnread(u);
        writeStore(UNREAD_KEY, u ? "1" : "0");
      })
      .catch(() => undefined)
      .finally(() => {
        checking.current = false;
      });
  };

  // On load and on navigation, but the throttle above decides whether to ask.
  useEffect(() => {
    if (visible && !open) check(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, pathname]);

  if (!visible) return null;

  async function onPress() {
    if (Panel) {
      setOpen(true);
      return;
    }
    setLoading(true);
    try {
      const m = await import("./chat-panel");
      setPanel(() => m.ChatDialog);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        data-chat-launcher
        onClick={() => void onPress()}
        aria-busy={loading || undefined}
        aria-label={unread ? "Open chat, new messages" : "Open chat"}
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex size-12 items-center justify-center rounded-full border border-line bg-surface text-fg shadow-edge transition hover:border-line-hover hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <MessageCircle className="size-5" aria-hidden />
        {unread ? (
          <span
            aria-hidden
            data-testid="chat-unread"
            className="absolute top-1 right-1 size-2.5 rounded-full border-2 border-surface bg-accent"
          />
        ) : null}
      </button>
      {Panel ? (
        <Panel
          open={open}
          // After Radix has finished tearing the dialog down.
          returnFocus={() => setTimeout(() => buttonRef.current?.focus(), 0)}
          onOpenChange={(o) => {
            setOpen(o);
            if (o) return;
            // The panel marked everything read while open; ask once to be sure.
            setUnread(false);
            writeStore(UNREAD_KEY, "0");
            check(true);
          }}
        />
      ) : null}
    </>
  );
}
