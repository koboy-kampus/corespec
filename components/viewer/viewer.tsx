"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "cn";
import { useMediaQuery } from "@/hooks/use-build";
import type { SceneProps } from "./scene";

/** Shown while three.js and the scene load. */
export function ViewerSkeleton() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col items-center justify-center gap-4"
    >
      <div className="aspect-[4/5] h-[55%] max-h-72 animate-pulse rounded-card border border-line bg-surface-2/60" />
      <p className="label-micro text-micro-sm text-fg-3">Loading 3D viewer</p>
    </div>
  );
}

// three.js needs the browser, so the scene is never rendered on the server.
const Scene = dynamic(() => import("./scene"), {
  ssr: false,
  loading: () => <ViewerSkeleton />,
});

type ViewerProps = Omit<SceneProps, "reducedMotion" | "paused"> & {
  className?: string;
};

/** Sizes the canvas to its box, respects reduced motion and pauses the spin when off screen. */
export function Viewer({ className, ...props }: ViewerProps) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || props.mode !== "showcase") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [props.mode]);

  return (
    <div ref={ref} className={cn("relative size-full", className)}>
      <Scene {...props} reducedMotion={reducedMotion} paused={!onScreen} />
    </div>
  );
}
