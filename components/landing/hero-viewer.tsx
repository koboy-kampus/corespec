"use client";

import { Viewer } from "@/components/viewer/viewer";
import { showcase } from "@/lib/showcase";
import { CaseDrawing } from "./case-drawing";

/**
 * The landing hero's slowly swaying 3D build (the showcase preset). The drawing
 * shows first; the 3D scene loads once the page is idle (and only if it's near the
 * screen, so phones that never scroll to it never download three.js).
 */
export function HeroViewer() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px] lg:mr-auto lg:ml-0 lg:max-w-[500px]">
      <Viewer
        mode="showcase"
        lazy
        parts={showcase.parts}
        fallback={
          <CaseDrawing
            gpuLengthMm={showcase.gpu.lengthMm}
            psuWatts={showcase.psuWatts}
            className="size-full"
          />
        }
      />
    </div>
  );
}
