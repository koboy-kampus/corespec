"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReturnFocus } from "@/hooks/use-return-focus";
import type { Preset } from "@/lib/presets";

interface PresetConfirmDialogProps {
  open: boolean;
  /** The preset waiting to be loaded. Kept while the dialog animates out. */
  preset: Preset | null;
  /** Where focus goes when the dialog closes (the menu item that opened it is gone by then). */
  returnFocus: () => HTMLElement | null;
  onReplace: (preset: Preset) => void;
  onStartNew: (preset: Preset) => void;
  onCancel: () => void;
}

/** Asks before a preset overwrites a build that already has parts. */
export function PresetConfirmDialog({
  open,
  preset,
  returnFocus,
  onReplace,
  onStartNew,
  onCancel,
}: PresetConfirmDialogProps) {
  const focus = useReturnFocus(returnFocus);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent {...focus}>
        <DialogHeader>
          <DialogTitle>Replace current parts?</DialogTitle>
          <DialogDescription>
            {preset
              ? `Loading “${preset.name}” replaces the parts in this build. Start as a new build to keep this one in My builds.`
              : null}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => preset && onStartNew(preset)}
          >
            Start as new build
          </Button>
          <Button onClick={() => preset && onReplace(preset)}>Replace</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
