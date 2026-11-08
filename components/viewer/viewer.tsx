"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { cn } from "cn";
import { useMediaQuery } from "@/hooks/use-build";
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
class SceneBoundary extends Component<
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
};

const ROTATE_STEP = 0.18; // radians per key press
const ZOOM_STEP = 0.85;

/** Arrow keys orbit, +/- zoom, R resets. Returns true when the key was handled. */
function handleCameraKey(key: string, cam: CameraKeys): boolean {
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

/** Sizes the canvas to its box, respects reduced motion and pauses the spin when off screen. */
export function Viewer({ className, onResetView, ...props }: ViewerProps) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const ref = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const cameraKeysRef = useRef<CameraKeys | null>(null);
  const interactive = props.mode === "builder";

  useEffect(() => {
    const el = ref.current;
    if (!el || props.mode !== "showcase") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [props.mode]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative size-full rounded-card focus-visible:-outline-offset-2",
        className,
      )}
      {...(interactive
        ? {
            // A focusable 3D widget with its own keys, so screen readers pass them through.
            tabIndex: 0,
            role: "application",
            "aria-label":
              "3D build preview. Arrow keys rotate, plus and minus zoom, R resets the view.",
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
      <SceneBoundary fallback={props.fallback}>
        <Scene
          {...props}
          reducedMotion={reducedMotion}
          paused={!onScreen}
          cameraKeysRef={interactive ? cameraKeysRef : undefined}
        />
      </SceneBoundary>
    </div>
  );
}
