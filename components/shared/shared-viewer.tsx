"use client";

import { useMemo } from "react";
import { CaseDrawing } from "@/components/landing/case-drawing";
import { Viewer } from "@/components/viewer/viewer";
import { deriveBuild } from "@/lib/derive";
import type { Build } from "@/types/parts";

/** The 3D view of a shared build, with orbit controls and flagged parts glowing. */
export function SharedViewer({ parts }: { parts: Build["parts"] }) {
  const { resolved, severityByCategory } = useMemo(
    () => deriveBuild(parts),
    [parts],
  );
  return (
    <Viewer
      mode="builder"
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
  );
}
