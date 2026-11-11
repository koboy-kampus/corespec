"use client";

import { Viewer } from "@/components/viewer/viewer";
import type { ResolvedBuild } from "@/types/parts";
import { CaseDrawing } from "./case-drawing";

/**
 * The landing hero's slowly swaying 3D build (the showcase preset). The drawing
 * shows first; the 3D scene loads once the page is idle (and only if it's near the
 * screen, so phones that never scroll to it never download three.js).
 * The parts come from the server (lib/showcase), so the catalogue isn't shipped.
 */
export function HeroViewer({
  parts,
  gpuLengthMm,
  psuWatts,
}: {
  parts: ResolvedBuild;
  gpuLengthMm?: number;
  psuWatts?: number;
}) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] lg:mr-auto lg:ml-0 lg:max-w-[500px]">
      <Viewer
        mode="showcase"
        lazy
        parts={parts}
        fallback={
          <CaseDrawing
            gpuLengthMm={gpuLengthMm}
            psuWatts={psuWatts}
            className="size-full"
          />
        }
      />
    </div>
  );
}
