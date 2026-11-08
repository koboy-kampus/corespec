"use client";

import { useState } from "react";
import { ChevronDown, Layers, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatIDRCompact } from "@/lib/format";
import { presets, presetSummary } from "@/lib/presets";
import { useBuildStore } from "@/store/build";

/** "Load preset" menu and "Reset" (with confirmation). */
export function BuildActions({ hasParts }: { hasParts: boolean }) {
  const loadPreset = useBuildStore((s) => s.loadPreset);
  const reset = useBuildStore((s) => s.reset);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="flex gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            icon={<Layers />}
            iconRight={<ChevronDown className="size-3.5" />}
          >
            Load preset
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Replace current parts with</DropdownMenuLabel>
          {presets.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={() => loadPreset(p.id)}
              className="justify-between gap-4"
            >
              <span className="text-fg">{p.name}</span>
              <span className="spec text-spec-sm text-accent">
                {formatIDRCompact(presetSummary(p).totalIDR)}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Button
          variant="ghost"
          size="sm"
          icon={<RotateCcw />}
          disabled={!hasParts}
          onClick={() => setConfirmOpen(true)}
        >
          Reset
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start over?</DialogTitle>
            <DialogDescription>
              This clears every slot and the build name.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => {
                reset();
                setConfirmOpen(false);
              }}
            >
              Reset build
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
