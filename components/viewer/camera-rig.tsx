"use client";

import { useEffect, useMemo, useRef, type ComponentRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3, type PerspectiveCamera } from "three";
import type { Vec3 } from "@/lib/viewer/layout";
import { clampDelta, easeInOutCubic } from "@/lib/viewer/spring";

type OrbitControlsImpl = ComponentRef<typeof OrbitControls>;

const TWEEN_S = 0.7;
/** How close a selected slot brings the camera, as a share of the home distance. */
const FOCUS_ZOOM = 0.72;
/** Home view: in front of the glass, a little above and toward the front of the case. */
const HOME_DIR = new Vector3(-0.32, 0.26, 1).normalize();

interface CameraRigProps {
  /** Case outer size in scene units, used to frame it. */
  caseSize: Vec3;
  /** Point to ease toward (scene units), or null for the home view. */
  focus: Vec3 | null;
  interactive: boolean;
}

/** Distance that fits the case's bounding sphere in both the vertical and horizontal field of view. */
function fitDistance(size: Vec3, fovDeg: number, aspect: number): number {
  const r = Math.hypot(...size) / 2;
  const v = (fovDeg * Math.PI) / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  return (r / Math.sin(Math.min(v, h) / 2)) * 0.9;
}

/**
 * Frames the case, eases the camera toward the selected slot, and (in the builder)
 * adds orbit controls with damping and limits. Dragging cancels any running ease.
 */
export function CameraRig({ caseSize, focus, interactive }: CameraRigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height));
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControlsImpl>(null);
  const lookAt = useRef(new Vector3());
  const tween = useRef<{
    fromPos: Vector3;
    fromTarget: Vector3;
    toPos: Vector3;
    toTarget: Vector3;
    t: number;
  } | null>(null);
  const placed = useRef(false);

  const [sx, sy, sz] = caseSize;
  const dist = useMemo(
    () => fitDistance([sx, sy, sz], camera.fov, aspect),
    [sx, sy, sz, camera.fov, aspect],
  );
  const [fx, fy, fz] = focus ?? [NaN, NaN, NaN];

  useEffect(() => {
    const toTarget = focus ? new Vector3(fx, fy, fz) : new Vector3(0, 0, 0);
    const toPos = toTarget
      .clone()
      .addScaledVector(HOME_DIR, focus ? dist * FOCUS_ZOOM : dist);
    if (!placed.current) {
      // First frame: jump straight to the home view.
      camera.position.copy(toPos);
      lookAt.current.copy(toTarget);
      controls.current?.target.copy(toTarget);
      camera.lookAt(toTarget);
      placed.current = true;
    } else {
      tween.current = {
        fromPos: camera.position.clone(),
        fromTarget: (controls.current?.target ?? lookAt.current).clone(),
        toPos,
        toTarget,
        t: 0,
      };
    }
    invalidate();
    // focus is read through fx/fy/fz so a new array with the same point doesn't restart the ease
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fx, fy, fz, dist, camera, invalidate]);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const cancel = () => {
      tween.current = null;
    };
    c.addEventListener("start", cancel);
    return () => c.removeEventListener("start", cancel);
  }, [interactive]);

  useFrame((_, rawDelta) => {
    const delta = clampDelta(rawDelta);
    const tw = tween.current;
    if (!tw) return;
    tw.t = Math.min(1, tw.t + delta / TWEEN_S);
    const e = easeInOutCubic(tw.t);
    camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
    lookAt.current.lerpVectors(tw.fromTarget, tw.toTarget, e);
    if (controls.current) {
      controls.current.target.copy(lookAt.current);
      controls.current.update();
    } else {
      camera.lookAt(lookAt.current);
    }
    if (tw.t >= 1) tween.current = null;
    invalidate();
  });

  if (!interactive) return null;
  return (
    <OrbitControls
      ref={controls}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={dist * 0.3}
      maxDistance={dist * 1.6}
      minPolarAngle={Math.PI * 0.12}
      maxPolarAngle={Math.PI * 0.62}
      rotateSpeed={0.7}
    />
  );
}
