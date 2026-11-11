import type { Vec3 } from "./layout";

/**
 * Camera distance that fits a box's bounding sphere in both the vertical and the
 * horizontal field of view. Any units; the result is in the same units as `size`.
 */
export function fitDistance(
  size: Vec3,
  fovDeg: number,
  aspect: number,
): number {
  const r = Math.hypot(...size) / 2;
  const v = (fovDeg * Math.PI) / 180;
  const h = 2 * Math.atan(Math.tan(v / 2) * aspect);
  return (r / Math.sin(Math.min(v, h) / 2)) * 0.9;
}
