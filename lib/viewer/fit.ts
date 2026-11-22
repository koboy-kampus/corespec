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

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: Vec3): Vec3 => {
  const n = Math.hypot(...a);
  return [a[0] / n, a[1] / n, a[2] / n];
};
const along = (p: Vec3, d: Vec3, k: number): Vec3 => [
  p[0] + d[0] * k,
  p[1] + d[1] * k,
  p[2] + d[2] * k,
];

type Box = { min: Vec3; max: Vec3 };

/**
 * How far some boxes' corners reach on screen, seen from `target + dir · dist`
 * looking at `target`: the extents in normalised device coordinates (−1…1 is
 * the edge of the view), or null if a corner is behind the camera.
 */
export function screenExtent(
  boxes: Box[],
  target: Vec3,
  dir: Vec3,
  dist: number,
  fovDeg: number,
  aspect: number,
): { x: [number, number]; y: [number, number] } | null {
  const back = norm(dir);
  const forward: Vec3 = [-back[0], -back[1], -back[2]];
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const cam = along(target, back, dist);
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * aspect;
  const x: [number, number] = [Infinity, -Infinity];
  const y: [number, number] = [Infinity, -Infinity];
  for (const box of boxes)
    for (const cx of [box.min[0], box.max[0]])
      for (const cy of [box.min[1], box.max[1]])
        for (const cz of [box.min[2], box.max[2]]) {
          const v = sub([cx, cy, cz], cam);
          const depth = dot(v, forward);
          if (depth <= 1e-6) return null;
          const sx = dot(v, right) / (depth * tanH);
          const sy = dot(v, up) / (depth * tanV);
          x[0] = Math.min(x[0], sx);
          x[1] = Math.max(x[1], sx);
          y[0] = Math.min(y[0], sy);
          y[1] = Math.max(y[1], sy);
        }
  return { x, y };
}

/**
 * The camera that frames some boxes from direction `dir` so they fill `fill`
 * of the view (0.78 = 78% of the width or the height, whichever they reach
 * first), centred. Each box's own corners count, not one box around them all,
 * whose empty corners would leave a margin. Any units; returns the point to
 * look at and the distance.
 */
export function frameBox(
  boxes: Box[],
  dir: Vec3,
  fovDeg: number,
  aspect: number,
  fill: number,
): { target: Vec3; dist: number } {
  const back = norm(dir);
  const forward: Vec3 = [-back[0], -back[1], -back[2]];
  const right = norm(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  const tanV = Math.tan((fovDeg * Math.PI) / 360);
  const tanH = tanV * aspect;
  const min = [0, 1, 2].map((i) =>
    Math.min(...boxes.map((b) => b.min[i])),
  ) as Vec3;
  const max = [0, 1, 2].map((i) =>
    Math.max(...boxes.map((b) => b.max[i])),
  ) as Vec3;
  let target: Vec3 = [0, 1, 2].map((i) => (min[i] + max[i]) / 2) as Vec3;
  const size = Math.hypot(...sub(max, min)) || 1;
  /** How much of the view the box takes (its larger half-extent, centred). */
  const reach = (t: Vec3, d: number) => {
    const e = screenExtent(boxes, t, dir, d, fovDeg, aspect);
    if (!e) return Infinity;
    return Math.max((e.x[1] - e.x[0]) / 2, (e.y[1] - e.y[0]) / 2);
  };
  let dist = size;
  // Find the distance, then centre the box on screen, a few times over: the
  // centring moves the box in depth a little, which changes the distance.
  for (let pass = 0; pass < 4; pass++) {
    let lo = size * 1e-3;
    let hi = size * 1e3;
    for (let i = 0; i < 60; i++) {
      const mid = Math.sqrt(lo * hi);
      if (reach(target, mid) > fill) lo = mid;
      else hi = mid;
    }
    dist = hi;
    const e = screenExtent(boxes, target, dir, dist, fovDeg, aspect)!;
    const mx = ((e.x[0] + e.x[1]) / 2) * dist * tanH;
    const my = ((e.y[0] + e.y[1]) / 2) * dist * tanV;
    target = along(along(target, right, mx), up, my);
  }
  return { target, dist };
}
