"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { sharePath } from "@/lib/share";
import type { Build } from "@/types/parts";

interface ShareDialogProps {
  build: Pick<Build, "name" | "parts">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** A read-only link to the build, with a copy button. The link is a snapshot. */
export function ShareDialog({ build, open, onOpenChange }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const path = sharePath(build);
  // Only rendered in the browser (the dialog content mounts when opened).
  const url =
    typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  async function copy(input: HTMLInputElement | null) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: select the text so Ctrl+C works.
      input?.select();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setCopied(false);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share “{build.name}”</DialogTitle>
          <DialogDescription>
            Anyone with this link can view the build and copy it to their own
            builds. It&apos;s a snapshot: later changes won&apos;t show up.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void copy(e.currentTarget.querySelector("input"));
          }}
        >
          <label className="min-w-0 flex-1">
            <span className="sr-only">Share link</span>
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="h-10 w-full truncate rounded-input border border-line bg-canvas px-3 spec text-spec text-fg-2 focus-visible:border-line-strong focus-visible:outline-none"
            />
          </label>
          <Button
            type="submit"
            icon={copied ? <Check /> : <Copy />}
            aria-live="polite"
          >
            {copied ? "Copied" : "Copy link"}
          </Button>
        </form>
        <a
          href={path}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 self-start text-[13px] text-fg-3 hover:text-fg"
        >
          Preview the shared page
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </DialogContent>
    </Dialog>
  );
}
