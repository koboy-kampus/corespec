"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { mainNav } from "@/lib/nav";
import { useUiStore } from "@/store/ui";

const jumpTargets = [
  { label: "Home", href: "/" },
  ...mainNav.filter((l): l is { label: string; href: string } => !!l.href),
  { label: "Style guide", href: "/styleguide" },
];

/**
 * Placeholder command palette (Ctrl/⌘ K). For now it only jumps between pages;
 * part search arrives with the builder data in later phases.
 */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q
      ? jumpTargets.filter((t) => t.label.toLowerCase().includes(q))
      : jumpTargets;
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogContent
        showCloseButton={false}
        className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-lg"
      >
        <DialogTitle className="sr-only">Search</DialogTitle>
        <DialogDescription className="sr-only">
          Jump to a page. Part search is coming soon.
        </DialogDescription>

        <form
          className="flex items-center gap-3 border-b border-line px-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (results[0]) {
              router.push(results[0].href);
              close();
            }
          }}
        >
          <Search className="size-4 shrink-0 text-fg-3" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search parts, builds, pages…"
            aria-label="Search"
            className="h-14 flex-1 bg-transparent text-body text-fg outline-none placeholder:text-fg-3 focus-visible:outline-none"
          />
          <Kbd>Esc</Kbd>
        </form>

        <div className="max-h-80 overflow-y-auto p-2">
          <p className="px-2 pt-2 pb-1.5 label-micro text-fg-3">Jump to</p>
          {results.length ? (
            <ul>
              {results.map((r, i) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    onClick={close}
                    className="flex items-center justify-between rounded-input px-2.5 py-2 text-ui text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg"
                  >
                    {r.label}
                    {i === 0 ? (
                      <CornerDownLeft
                        className="size-3.5 text-fg-3"
                        aria-hidden
                      />
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-2.5 py-6 text-center text-ui text-fg-3">
              No pages match “{query}”.
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line bg-surface-2/40 px-4 py-3">
          <span className="text-[13px] leading-5 text-fg-3">
            Part and build search is on the way.
          </span>
          <Badge variant="accent">Coming soon</Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}
