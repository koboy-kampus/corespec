"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { Group, Material, Object3D } from "three";
import type { Vec3 } from "@/lib/viewer/layout";
import {
  clampDelta,
  easeOutCubic,
  isSettled,
  stepSpring,
} from "@/lib/viewer/spring";

const FADE_IN_S = 0.2;
const LEAVE_S = 0.3;

interface AnimatedProps {
  /** Resting position, in the same units as the parent group (mm). */
  target: Vec3;
  /** How far above the target it drops from, and lifts to when leaving. */
  drop: number;
  leaving: boolean;
  onExited: () => void;
  instant: boolean;
  children: ReactNode;
}

/** Fades every material under `root`, remembering each one's resting opacity. */
function applyOpacity(root: Object3D, f: number) {
  root.traverse((o) => {
    const m = (o as Object3D & { material?: Material | Material[] }).material;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      const data = mat.userData as { baseOpacity?: number };
      data.baseOpacity ??= mat.opacity;
      mat.opacity = data.baseOpacity * f;
      mat.transparent = data.baseOpacity < 1 || f < 0.999;
    }
  });
}

/**
 * Drops its children onto `target` with a spring, follows the target if it moves
 * (say, a new board shifts the socket), and lifts and fades away when `leaving`.
 */
export function Animated({
  target,
  drop,
  leaving,
  onExited,
  instant,
  children,
}: AnimatedProps) {
  const ref = useRef<Group>(null);
  const invalidate = useThree((s) => s.invalidate);
  // Where it first appears; after that useFrame moves it, so React never re-applies this.
  const [start] = useState<Vec3>(() => [
    target[0],
    instant ? target[1] : target[1] + drop,
    target[2],
  ]);
  const anim = useRef({
    axes: target.map((t, i) => ({
      x: i === 1 && !instant ? t + drop : t,
      v: 0,
    })),
    opacity: instant ? 1 : 0,
    leaveT: 0,
    lastOpacity: -1,
    exited: false,
  });

  // Start (or restart) the frame loop whenever something changes.
  const [tx, ty, tz] = target;
  useEffect(() => invalidate(), [tx, ty, tz, leaving, invalidate]);

  useEffect(() => {
    if (leaving && instant) onExited();
  }, [leaving, instant, onExited]);

  useFrame((_, rawDelta) => {
    const delta = clampDelta(rawDelta);
    const g = ref.current;
    const a = anim.current;
    if (!g || a.exited) return;
    let busy = false;

    if (leaving) {
      a.leaveT += delta;
      const p = easeOutCubic(a.leaveT / LEAVE_S);
      a.axes[1].x +=
        (target[1] + drop * 0.75 - a.axes[1].x) * Math.min(1, delta * 12);
      a.opacity = 1 - p;
      if (a.leaveT >= LEAVE_S) {
        a.exited = true;
        onExited();
        return;
      }
      busy = true;
    } else {
      a.axes = a.axes.map((s, i) => {
        if (isSettled(s, target[i])) return { x: target[i], v: 0 };
        busy = true;
        return stepSpring(s, target[i], delta);
      });
      if (a.opacity < 1) {
        a.opacity = Math.min(1, a.opacity + delta / FADE_IN_S);
        busy = true;
      }
    }

    g.position.set(a.axes[0].x, a.axes[1].x, a.axes[2].x);
    if (a.opacity !== a.lastOpacity) {
      applyOpacity(g, a.opacity);
      a.lastOpacity = a.opacity;
    }
    if (busy) invalidate();
  });

  return (
    <group ref={ref} position={start}>
      {children}
    </group>
  );
}
