"use client";

import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { hasWebGL } from "@/components/viewer/scene-common";
import type { ResolvedBuild, ResolvedSetup } from "@/types/parts";

/**
 * Renders the order's PC and desk scenes off screen, one after the other, and
 * hands back a PNG of each (Phase 17b). The box is a fixed 600 × 450 CSS pixels
 * at pixel ratio 2, so every capture is 1200 × 900 whatever the screen (a
 * phone gets the same picture as a desktop). The assembled home view, no glow,
 * no animation. Loaded only when "Download receipt" is clicked.
 */

export const CAPTURE = { width: 600, height: 450, pixelRatio: 2 } as const;
/** Give up on a picture after this long (slow phone, stuck model). */
const CAPTURE_TIMEOUT_MS = 20_000;

const Scene = dynamic(() => import("@/components/viewer/scene"), {
  ssr: false,
});
const DeskScene = dynamic(() => import("@/components/viewer/desk-scene"), {
  ssr: false,
});

export interface Captures {
  pc: string | null;
  /** Left out when the order has no setup items. */
  desk?: string | null;
}

/** A crashed scene counts as a failed picture, not a failed receipt. */
class CaptureBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const NO_FLAGS = {};
const NO_WARNINGS: never[] = [];

export function CaptureStage({
  resolved,
  setup,
  onDone,
}: {
  resolved: ResolvedBuild;
  /** The setup items, or undefined for a PC-only order (no desk picture). */
  setup?: ResolvedSetup;
  onDone: (captures: Captures) => void;
}) {
  // No WebGL: no pictures (the PDF says "3D preview unavailable"). Checked
  // here, not through the scenes' fallback: the Canvas always renders its
  // fallback (inside the <canvas> tag), so it can't signal "no WebGL".
  const [step, setStep] = useState<"pc" | "desk" | "done">(() =>
    hasWebGL() ? "pc" : "done",
  );
  const got = useRef<Captures>({ pc: null });
  // Each step finishes once, whichever comes first: the picture, a crash or
  // the timeout.
  const finished = useRef<Set<string>>(new Set());

  const finish = useCallback(
    (which: "pc" | "desk", png: string | null) => {
      if (finished.current.has(which)) return;
      finished.current.add(which);
      if (which === "pc") {
        got.current.pc = png;
        setStep(setup ? "desk" : "done");
      } else {
        got.current.desk = png;
        setStep("done");
      }
    },
    [setup],
  );

  useEffect(() => {
    if (step === "done") {
      onDone(setup ? got.current : { pc: got.current.pc });
      return;
    }
    const t = setTimeout(() => finish(step, null), CAPTURE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [step, setup, onDone, finish]);

  if (step === "done") return null;
  const which = step;
  const fallback = null;
  return (
    <div
      aria-hidden
      data-testid="receipt-capture"
      // Off screen but laid out, so the canvas gets its full size.
      style={{
        position: "fixed",
        left: -10_000,
        top: 0,
        width: CAPTURE.width,
        height: CAPTURE.height,
        pointerEvents: "none",
      }}
    >
      <CaptureBoundary key={which} onError={() => finish(which, null)}>
        {which === "pc" ? (
          <Scene
            parts={resolved}
            flags={NO_FLAGS}
            mode="builder"
            reducedMotion
            skipIntro
            fallback={fallback}
            pixelRatio={CAPTURE.pixelRatio}
            onCapture={(png) => finish("pc", png)}
          />
        ) : (
          <DeskScene
            setup={setup!}
            pcCase={resolved.case}
            warnings={NO_WARNINGS}
            reducedMotion
            skipIntro
            fallback={fallback}
            pixelRatio={CAPTURE.pixelRatio}
            onCapture={(png) => finish("desk", png)}
          />
        )}
      </CaptureBoundary>
    </div>
  );
}
