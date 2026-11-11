"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "cn";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useNearAndIdle } from "@/hooks/use-near-and-idle";
import { Viewer } from "@/components/viewer/viewer";
import { HERO_POSTER } from "@/lib/hero-poster";
import type { ResolvedBuild } from "@/types/parts";

/** Before the live scene starts, after going idle: the first interaction or this long. */
const QUIET_MS = 3000;

/**
 * The landing hero's slowly swaying 3D build (the showcase preset), poster first:
 * the page shows a still image of the scene, and the live scene mounts only once
 * the hero is on screen, the page has loaded and gone idle, and the user has
 * interacted (or a few quiet seconds have passed). It draws nothing until every
 * model is in, then replaces the poster in one frame, so the swap is invisible.
 * With reduced motion the poster stays and the 3D never loads.
 */
export function HeroViewer({ parts }: { parts: ResolvedBuild }) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef<HTMLDivElement>(null);
  const start = useNearAndIdle(ref, true, {
    margin: "0px",
    minVisible: 0.25,
    quietMs: QUIET_MS,
  });
  const [live, setLive] = useState(false);
  const onReady = useCallback(() => setLive(true), []);

  return (
    <div
      ref={ref}
      data-testid="hero-viewer"
      data-live={live || undefined}
      className="relative mx-auto aspect-square w-full max-w-[520px] lg:mr-auto lg:ml-0 lg:max-w-[500px]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, pre-sized poster; next/image would add a wrapper and a loader for nothing */}
      <img
        src={HERO_POSTER.src}
        width={HERO_POSTER.size}
        height={HERO_POSTER.size}
        alt=""
        aria-hidden
        fetchPriority="high"
        className={cn("absolute inset-0 size-full", live && "invisible")}
      />
      {start && !reducedMotion ? (
        <div className={cn("absolute inset-0", !live && "opacity-0")}>
          <Viewer
            mode="showcase"
            parts={parts}
            skipIntro
            onReady={onReady}
            // The poster stays visible underneath if WebGL is missing or fails.
            fallback={null}
          />
        </div>
      ) : null}
    </div>
  );
}
