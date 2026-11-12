"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloudOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { guestBuilds, type SyncSent } from "@/lib/account/merge";
import { syncBuilds } from "@/lib/account/sync";
import {
  dismissImport,
  importDismissed,
  registerFlush,
} from "@/lib/account/sync-client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useAccountStore } from "@/store/account";
import { isBlank, useBuildStore } from "@/store/build";
import type { Build } from "@/types/parts";
import { announceAuthChange, useAuthHint } from "./use-auth-hint";

/** Wait this long after the last change before syncing. */
const DEBOUNCE_MS = 1000;
/** After a failed sync (offline, server error), try again after these waits. */
const RETRY_MS = [5_000, 15_000, 60_000];
/** "Signed out" can be two tabs renewing the token at once: retry once first. */
const SIGNED_OUT_RETRY_MS = 1500;

type State = ReturnType<typeof useBuildStore.getState>;

/** What this browser would send: its account builds (not blank) and pending deletes. */
function snapshot(s: State): SyncSent {
  return {
    builds: [s.build, ...s.saved].filter(
      (b) => !!s.account && b.owner === s.account && !isBlank(b),
    ),
    tombstones: s.tombstones,
  };
}

/** Changes only when something worth syncing changed. */
const signature = (s: State) =>
  JSON.stringify([
    s.account,
    snapshot(s).builds.map((b: Build) => [b.id, b.updatedAt]),
    s.tombstones.map((t) => t.id),
  ]);

/**
 * Keeps a logged-in browser's builds in step with the account: once on load,
 * then about a second after each change. Mounted on every page (root layout),
 * but does nothing for guests or when accounts aren't configured.
 */
export function AccountSync() {
  if (!isSupabaseConfigured()) return null;
  return (
    <>
      <Suspense fallback={null}>
        <HintWatcher />
      </Suspense>
      <SyncEngine />
    </>
  );
}

/** Rechecks the login hint after every navigation (a login ends in a redirect). */
function HintWatcher() {
  const pathname = usePathname();
  useEffect(() => announceAuthChange(), [pathname]);
  return null;
}

function SyncEngine() {
  const hint = useAuthHint();
  const [notice, setNotice] = useState<{
    message: string;
    logIn: boolean;
  } | null>(null);
  const [offer, setOffer] = useState<{ userId: string; count: number } | null>(
    null,
  );
  const offered = useRef(false);

  useEffect(() => {
    if (!hint) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running: Promise<void> | null = null;
    let queued = false;
    let failures = 0;
    let signedOutOnce = false;
    let synced = "";

    const schedule = (ms: number) => {
      clearTimeout(timer);
      timer = setTimeout(() => void run(), ms);
    };

    const once = async () => {
      const before = useBuildStore.getState();
      const sent = snapshot(before);
      let res: Awaited<ReturnType<typeof syncBuilds>> | null = null;
      try {
        res = await syncBuilds({ account: before.account, ...sent });
      } catch {
        res = null; // offline, or the server didn't answer
      }
      if (stopped) return;

      if (!res || (!res.ok && res.reason === "error")) {
        schedule(RETRY_MS[Math.min(failures++, RETRY_MS.length - 1)]);
        return;
      }
      if (!res.ok) {
        if (res.reason === "signed-out" && !signedOutOnce) {
          signedOutOnce = true;
          schedule(SIGNED_OUT_RETRY_MS);
        } else if (res.reason === "signed-out" || res.reason === "limit") {
          setNotice({
            message: res.message,
            logIn: res.reason === "signed-out",
          });
        }
        return;
      }

      failures = 0;
      signedOutOnce = false;
      setNotice(null);
      const store = useBuildStore.getState();
      store.setAccount(res.userId);
      store.applyAccountSync(
        res.switched ? { builds: [], tombstones: [] } : sent,
        res,
      );
      useAccountStore.getState().set(res.displayName, res.role);
      const after = useBuildStore.getState();
      synced = signature(after);

      // First sync after logging in: offer to import this browser's guest builds.
      if (!offered.current) {
        offered.current = true;
        const count = guestBuilds(after, isBlank).length;
        if (count > 0 && !importDismissed(res.userId))
          setOffer({ userId: res.userId, count });
      }
    };

    const run = (): Promise<void> => {
      if (stopped) return Promise.resolve();
      if (running) {
        queued = true;
        return running;
      }
      clearTimeout(timer);
      running = once().finally(() => {
        running = null;
        if (queued && !stopped) {
          queued = false;
          schedule(DEBOUNCE_MS);
        }
      });
      return running;
    };

    const start = async () => {
      await useAccountStore.persist.rehydrate();
      if (!useBuildStore.persist.hasHydrated())
        await useBuildStore.persist.rehydrate();
      if (stopped) return;
      void run();
    };
    void start();

    const unsubscribe = useBuildStore.subscribe((s) => {
      if (
        !stopped &&
        useBuildStore.persist.hasHydrated() &&
        signature(s) !== synced
      )
        schedule(DEBOUNCE_MS);
    });
    registerFlush(run);

    return () => {
      stopped = true;
      clearTimeout(timer);
      unsubscribe();
      registerFlush(null);
    };
  }, [hint]);

  return (
    <>
      {notice ? (
        <div
          role="status"
          className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-edge sm:max-w-sm"
        >
          <CloudOff className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <div className="flex min-w-0 flex-col gap-2 text-[14px] leading-5 text-fg-2">
            <p>{notice.message} Your builds stay safe in this browser.</p>
            {notice.logIn ? (
              <Link
                href="/login"
                className="w-fit text-fg underline decoration-line-strong underline-offset-4 hover:decoration-accent"
              >
                Log in again
              </Link>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Dismiss"
            icon={<X />}
            onClick={() => setNotice(null)}
            className="-mt-1 -mr-1"
          />
        </div>
      ) : null}

      <Dialog
        open={offer !== null}
        onOpenChange={(open) => {
          if (!open && offer) dismissImport(offer.userId);
          if (!open) setOffer(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Import {offer?.count === 1 ? "1 build" : `${offer?.count} builds`}{" "}
              from this browser?
            </DialogTitle>
            <DialogDescription>
              {offer?.count === 1 ? "A build" : "Builds"} you made before
              logging in {offer?.count === 1 ? "is" : "are"} only saved in this
              browser. Import {offer?.count === 1 ? "it" : "them"} into your
              account to keep {offer?.count === 1 ? "it" : "them"} on every
              device. You can also do this later from My account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                if (offer) dismissImport(offer.userId);
                setOffer(null);
              }}
            >
              Not now
            </Button>
            <Button
              onClick={() => {
                useBuildStore.getState().importGuestBuilds();
                setOffer(null);
              }}
            >
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
