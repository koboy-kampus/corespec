"use client";

import { useMemo, useState } from "react";
import { Monitor, Move3d } from "lucide-react";
import { cn } from "cn";
import { CaseDrawing } from "@/components/landing/case-drawing";
import {
  DeskDescription,
  DeskViewer,
} from "@/components/viewer/desk-viewer";
import { ExplodeToggle } from "@/components/viewer/explode-toggle";
import { Viewer } from "@/components/viewer/viewer";
import { ViewToggle } from "@/components/viewer/view-toggle";
import { deriveBuild } from "@/lib/derive";
import type { Build } from "@/types/parts";

/**
 * The 3D view of a shared build, with orbit controls and flagged parts glowing.
 * When the build has setup items, a PC | Desk switch shows the desk view too.
 * It sits in a scrolling page, so a plain wheel and a one-finger swipe scroll the
 * page; Ctrl+wheel, pinch and two fingers move the camera (in both views).
 */
export function SharedViewer({ parts }: { parts: Build["parts"] }) {
  const { resolved, severityByCategory, setup, setupResults, setupFilled } =
    useMemo(() => deriveBuild(parts), [parts]);
  const [exploded, setExploded] = useState(false);
  const [view, setView] = useState<"pc" | "desk">("pc");
  // The desk scene loads the first time it's shown, then stays mounted.
  const [deskSeen, setDeskSeen] = useState(false);
  if (view === "desk" && !deskSeen) setDeskSeen(true);
  const desk = view === "desk";

  return (
    <>
      {/* coral glow, fainter behind the desk so it doesn't tint it */}
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(254,46,75,0.16),transparent_60%)] transition-opacity duration-300",
          desk && "opacity-35",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          desk && "pointer-events-none opacity-0",
        )}
        inert={desk}
        aria-hidden={desk || undefined}
      >
        <Viewer
          exploded={exploded}
          mode="builder"
          embedded
          lazy
          skipIntro
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
      </div>
      {deskSeen ? (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-300",
            !desk && "pointer-events-none opacity-0",
          )}
          inert={!desk}
          aria-hidden={!desk || undefined}
          data-testid="desk-view"
        >
          <DeskViewer
            setup={setup}
            pcCase={resolved.case}
            warnings={setupResults}
            embedded
            skipIntro
            className="absolute inset-0"
            fallback={
              <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center">
                <Monitor className="size-6 text-fg-3" aria-hidden />
                <p className="max-w-xs text-[14px] leading-5 text-fg-2">
                  The 3D desk view isn&apos;t available in this browser. The
                  setup is listed beside it.
                </p>
              </div>
            }
          />
          {desk ? (
            <DeskDescription
              setup={setup}
              pcCase={resolved.case}
              results={setupResults}
            />
          ) : null}
        </div>
      ) : null}

      {setupFilled > 0 ? (
        <ViewToggle
          view={view}
          onChange={setView}
          className="absolute top-3 left-3 z-10"
        />
      ) : null}
      <p
        className={cn(
          "pointer-events-none absolute left-3.5 flex items-center gap-1.5 label-micro text-micro-sm text-fg-3 pointer-coarse:hidden",
          setupFilled > 0 ? "bottom-3.5" : "top-3.5",
        )}
      >
        <Move3d className="size-3.5" aria-hidden />
        Drag to rotate · Ctrl + scroll to zoom
      </p>
      <p className="pointer-events-none absolute bottom-3.5 left-3.5 hidden items-center gap-1.5 label-micro text-micro-sm text-fg-3 pointer-coarse:flex">
        <Move3d className="size-3.5" aria-hidden />
        Two fingers to rotate and zoom
      </p>
      {desk ? null : (
        <ExplodeToggle
          exploded={exploded}
          onChange={setExploded}
          className="absolute top-3 right-3"
        />
      )}
    </>
  );
}
