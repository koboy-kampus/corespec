"use client";

import dynamic from "next/dynamic";
import { cn } from "cn";
import { ViewerShell, ViewerSkeleton } from "./viewer";
import type { DeskSceneProps } from "./desk-scene";

/**
 * The desk view's screen-reader text. It runs the desk layout (to know what hangs
 * over the edge), so it loads with the desk scene, not with the PC builder.
 */
export const DeskDescription = dynamic(
  () => import("./desk-description").then((m) => m.DeskDescription),
  { ssr: false },
);

// Its own chunk: the PC builder and the landing page never download the desk scene.
const DeskScene = dynamic(() => import("./desk-scene"), {
  ssr: false,
  loading: () => <ViewerSkeleton />,
});

type DeskViewerProps = Omit<
  DeskSceneProps,
  "reducedMotion" | "cameraKeysRef"
> & {
  className?: string;
  onResetView?: () => void;
  lazy?: boolean;
};

/** The 3D desk view (Phase 12), in the same shell as the PC viewer. */
export function DeskViewer({
  className,
  onResetView,
  lazy = false,
  ...props
}: DeskViewerProps) {
  return (
    <div className={cn("relative", className)}>
      <ViewerShell
        className="absolute inset-0"
        onResetView={onResetView}
        lazy={lazy}
        mode="builder"
        embedded={props.embedded}
        fallback={props.fallback}
        label="3D desk preview. Arrow keys rotate, plus and minus zoom, R resets to the seated view."
      >
        {({ reducedMotion, cameraKeysRef }) => (
          <DeskScene
            {...props}
            reducedMotion={reducedMotion}
            cameraKeysRef={cameraKeysRef}
          />
        )}
      </ViewerShell>
      {/* Plain HTML over the canvas (the screen-reader text says it too). */}
      {props.setup.desk ? null : (
        <p
          aria-hidden
          className="pointer-events-none absolute top-14 left-1/2 -translate-x-1/2 rounded-input border border-line bg-surface-2/90 px-2.5 py-1 label-micro text-micro-sm whitespace-nowrap text-fg-2 backdrop-blur"
        >
          No desk picked
        </p>
      )}
    </div>
  );
}
