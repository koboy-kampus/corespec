/**
 * A damped spring, stepped once per frame. With the defaults a part dropped from
 * 160 mm settles in about 400 ms with a small bounce.
 */
export interface SpringConfig {
  stiffness: number;
  damping: number;
}
export const DROP_SPRING: SpringConfig = { stiffness: 260, damping: 22 };

export interface SpringState {
  x: number;
  v: number;
}

/** Advance one step toward `target`. `dt` is in seconds and is clamped so a slow frame can't explode. */
export function stepSpring(
  s: SpringState,
  target: number,
  dt: number,
  cfg: SpringConfig = DROP_SPRING,
): SpringState {
  const h = Math.min(dt, 1 / 30);
  // Two half-steps keep it stable on 30 fps devices.
  let { x, v } = s;
  for (let i = 0; i < 2; i++) {
    const a = -cfg.stiffness * (x - target) - cfg.damping * v;
    v += a * (h / 2);
    x += v * (h / 2);
  }
  return { x, v };
}

/** True once the spring is close enough to stop requesting frames. */
export function isSettled(s: SpringState, target: number, eps = 0.05): boolean {
  return Math.abs(s.x - target) < eps && Math.abs(s.v) < eps * 10;
}

/**
 * With frameloop="demand" the first frame after an idle spell reports the whole idle
 * gap as its delta. Clamp it so animations always start from the beginning.
 */
export function clampDelta(delta: number): number {
  return Math.min(Math.max(delta, 0), 1 / 30);
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
}
export function easeInOutCubic(t: number): number {
  const c = Math.min(Math.max(t, 0), 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}
