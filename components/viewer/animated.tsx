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

type FadeData = {
  baseOpacity?: number;
  animF?: number;
  fade?: number;
  depthWrite?: boolean;
};

function setOpacity(mat: Material, data: FadeData) {
  const base = data.baseOpacity ?? 1;
  mat.opacity = base * (data.animF ?? 1) * (data.fade ?? 1);
  mat.transparent = base < 1 || mat.opacity < 0.999;
  // Only items given an extra fade (setFade) change depthWrite: faded, they
  // shouldn't hide what's behind them. The enter/leave fade leaves it alone.
  if (data.fade !== undefined) {
    data.depthWrite ??= mat.depthWrite;
    mat.depthWrite = data.fade < 0.999 ? false : data.depthWrite;
  }
}

function eachMaterial(root: Object3D, fn: (m: Material, d: FadeData) => void) {
  root.traverse((o) => {
    const m = (o as Object3D & { material?: Material | Material[] }).material;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      const data = mat.userData as FadeData;
      data.baseOpacity ??= mat.opacity;
      fn(mat, data);
    }
  });
}

/** Fades every material under `root` for the enter/leave animation. */
function applyOpacity(root: Object3D, f: number) {
  eachMaterial(root, (mat, data) => {
    data.animF = f;
    setOpacity(mat, data);
  });
}

/**
 * An extra fade on top of the enter/leave animation, e.g. the desk view's chair when
 * it stands between the camera and the screen.
 */
export function setFade(root: Object3D, fade: number) {
  eachMaterial(root, (mat, data) => {
    data.fade = fade;
    setOpacity(mat, data);
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
