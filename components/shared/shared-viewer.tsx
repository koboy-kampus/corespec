"use client";

import { useMemo, useState } from "react";
import { Move3d } from "lucide-react";
import { CaseDrawing } from "@/components/landing/case-drawing";
import { ExplodeToggle } from "@/components/viewer/explode-toggle";
import { Viewer } from "@/components/viewer/viewer";
import { deriveBuild } from "@/lib/derive";
import type { Build } from "@/types/parts";

/**
 * The 3D view of a shared build, with orbit controls and flagged parts glowing.
 * It sits in a scrolling page, so a plain wheel and a one-finger swipe scroll the
 * page; Ctrl+wheel, pinch and two fingers move the camera.
 */
export function SharedViewer({ parts }: { parts: Build["parts"] }) {
  const { resolved, severityByCategory } = useMemo(
    () => deriveBuild(parts),
    [parts],
  );
  const [exploded, setExploded] = useState(false);
  return (
    <>
      <Viewer
        exploded={exploded}
        mode="builder"
        embedded
        parts={resolved}
        flags={severityByCategory}
        className="absolute inset-0"
        fallback={
          <div className="flex size-full items-center justify-center">
            <CaseDrawing
              gpuLengthMm={resolved.gpu?.lengthMm}
              psuWatts={resolved.psu?.watts}
              className="h-full max-h-[80%] w-auto max-w-[92%]"
            />
          </div>
        }
      />
      <p className="pointer-events-none absolute top-3.5 left-3.5 flex items-center gap-1.5 label-micro text-micro-sm text-fg-3 pointer-coarse:hidden">
        <Move3d className="size-3.5" aria-hidden />
        Drag to rotate · Ctrl + scroll to zoom
      </p>
      <p className="pointer-events-none absolute bottom-3.5 left-3.5 hidden items-center gap-1.5 label-micro text-micro-sm text-fg-3 pointer-coarse:flex">
        <Move3d className="size-3.5" aria-hidden />
        Two fingers to rotate and zoom
      </p>
      <ExplodeToggle
        exploded={exploded}
        onChange={setExploded}
        className="absolute top-3 right-3"
      />
    </>
  );
}
