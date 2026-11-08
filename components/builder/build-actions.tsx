"use client";

import { useState } from "react";
import { ChevronDown, Layers, Plus, Share2 } from "lucide-react";
import { ShareDialog } from "@/components/builds/share-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tip } from "@/components/ui/tooltip";
import { formatIDRCompact } from "@/lib/format";
import { presets, presetSummary } from "@/lib/presets";
import { isBlank, useBuildStore } from "@/store/build";

/**
 * "Load preset", "Share" and "New build". New build keeps the current one in
 * My builds, so nothing is ever thrown away from here (deleting lives on /builds).
 */
export function BuildActions({ hasParts }: { hasParts: boolean }) {
  const build = useBuildStore((s) => s.build);
  const loadPreset = useBuildStore((s) => s.loadPreset);
  const newBuild = useBuildStore((s) => s.newBuild);
  const [shareOpen, setShareOpen] = useState(false);

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

      <Button
        variant="secondary"
        size="sm"
        icon={<Share2 />}
        disabled={!hasParts}
        onClick={() => setShareOpen(true)}
      >
        Share
      </Button>
      <ShareDialog build={build} open={shareOpen} onOpenChange={setShareOpen} />

      <Tip content="Keep this build in My builds and start a new one">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="New build"
          disabled={isBlank(build)}
          onClick={newBuild}
          icon={<Plus />}
        />
      </Tip>
    </div>
  );
}
