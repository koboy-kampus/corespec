"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import dynamic from "next/dynamic";
import { cn } from "cn";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useNearAndIdle } from "@/hooks/use-near-and-idle";
import { reportError } from "@/lib/sentry";
import type { CameraKeys } from "./camera-rig";
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

/** If the 3D scene crashes (lost GPU, driver bug), show the static drawing instead. */
export class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn(
      "3D viewer failed; showing the static drawing instead.",
      error,
    );
    reportError(error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

type ViewerProps = Omit<
  SceneProps,
  "reducedMotion" | "paused" | "cameraKeysRef"
> & {
  className?: string;
  /** Called when R resets the camera, so the page can clear its selected slot too. */
  onResetView?: () => void;
  /**
   * Show the fallback drawing first and load the 3D scene only once the viewer is
   * near the screen and the page is idle. For pages where the 3D view is a bonus
   * (landing hero, shared builds), not the tool itself (the builder).
   */
  lazy?: boolean;
};

const ROTATE_STEP = 0.18; // radians per key press
const ZOOM_STEP = 0.85;

/** Arrow keys orbit, +/- zoom, R resets. Returns true when the key was handled. */
export function handleCameraKey(key: string, cam: CameraKeys): boolean {
  switch (key) {
    case "ArrowLeft":
      cam.rotate(ROTATE_STEP, 0);
      return true;
    case "ArrowRight":
      cam.rotate(-ROTATE_STEP, 0);
      return true;
    case "ArrowUp":
      cam.rotate(0, -ROTATE_STEP * 0.7);
      return true;
    case "ArrowDown":
      cam.rotate(0, ROTATE_STEP * 0.7);
      return true;
    case "+":
    case "=":
      cam.zoom(ZOOM_STEP);
      return true;
    case "-":
    case "_":
      cam.zoom(1 / ZOOM_STEP);
      return true;
    case "r":
    case "R":
      cam.reset();
      return true;
    default:
      return false;
  }
}

/** What a shell hands its scene. */
export interface ShellContext {
  reducedMotion: boolean;
  paused: boolean;
  cameraKeysRef?: RefObject<CameraKeys | null>;
}

interface ShellProps {
  className?: string;
  onResetView?: () => void;
  lazy?: boolean;
  /** "builder" is interactive (keys, orbit); "showcase" is the landing hero. */
  mode: "builder" | "showcase";
  embedded?: boolean;
  fallback: ReactNode;
  /** Screen-reader name of the interactive 3D widget. */
  label?: string;
  children: (ctx: ShellContext) => ReactNode;
}

/**
 * Sizes the canvas to its box, respects reduced motion, pauses the showcase spin
 * when off screen, waits (when lazy), handles camera keys and the embedded
 * wheel/touch rules, and falls back to the drawing if the scene crashes. Shared by
 * the PC viewer and the desk viewer (Phase 12).
 */
export function ViewerShell({
  className,
  onResetView,
  lazy = false,
  mode,
  embedded = false,
  fallback,
  label = "3D build preview. Arrow keys rotate, plus and minus zoom, R resets the view.",
  children,
}: ShellProps) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef<HTMLDivElement>(null);
  // The hero is decoration: wait until a quarter of it is on screen (on phones it
  // starts just below the fold). Elsewhere, start as it comes near.
  const ready = useNearAndIdle(
    ref,
    lazy,
    mode === "showcase" ? { margin: "0px", minVisible: 0.25 } : undefined,
  );
  const [onScreen, setOnScreen] = useState(true);
  const cameraKeysRef = useRef<CameraKeys | null>(null);
  const interactive = mode === "builder";

  // The showcase sways only while it's on screen and the tab is visible.
  const [tabVisible, setTabVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || mode !== "showcase") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    const onVisibility = () =>
      setTabVisible(document.visibilityState === "visible");
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !embedded) return;
    // Wheel: capture phase on the wrapper runs before the orbit controls' listener.
    // Stopping it there (without preventDefault) lets the browser scroll the page.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) e.stopPropagation();
    };
    // Touch: the page may pan (see .viewer-embedded in globals.css), so a two-finger
    // gesture would scroll too. Cancelling its moves keeps it for rotate and pinch.
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2 && e.cancelable) e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { capture: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel, { capture: true });
      el.removeEventListener("touchmove", onTouchMove);
    };
  }, [embedded]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative size-full rounded-card focus-visible:-outline-offset-2",
        embedded && "viewer-embedded",
        className,
      )}
      {...(interactive
        ? {
            // A focusable 3D widget with its own keys, so screen readers pass them through.
            tabIndex: 0,
            role: "application",
            "aria-label": label,
            onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
              if (e.altKey || e.ctrlKey || e.metaKey || !cameraKeysRef.current)
                return;
              if (handleCameraKey(e.key, cameraKeysRef.current)) {
                e.preventDefault();
                if (e.key === "r" || e.key === "R") onResetView?.();
              }
            },
          }
        : {})}
    >
      {ready ? (
        <SceneBoundary fallback={fallback}>
          {children({
            reducedMotion,
            paused: !onScreen || !tabVisible,
            cameraKeysRef: interactive ? cameraKeysRef : undefined,
          })}
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}

/** The PC build viewer: the shell plus the PC scene. */
export function Viewer({
  className,
  onResetView,
  lazy = false,
  ...props
}: ViewerProps) {
  return (
    <ViewerShell
      className={className}
      onResetView={onResetView}
      lazy={lazy}
      mode={props.mode}
      embedded={props.embedded}
      fallback={props.fallback}
    >
      {(ctx) => <Scene {...props} {...ctx} />}
    </ViewerShell>
  );
}
