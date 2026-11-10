import type { Monitor, Speakers } from "@/types/parts";

/**
 * Desk geometry shared by the desk-width rule (Phase 11) and the 3D desk (Phase 12),
 * so the warning and the picture always agree. Millimetres.
 */
export const DESK = {
  /** Space between the monitor and each speaker. */
  speakerGapMm: 50,
  /** Used when no desk is picked (drawn faded in the 3D view). */
  fallback: { widthMm: 1200, depthMm: 600, heightMm: 750 },
} as const;

/**
 * Width the monitor and speakers take along the back of the desk: the monitor in
 * the middle, one speaker each side (a pair, so twice the satellite's width).
 */
export function frontageMm(monitor?: Monitor, speakers?: Speakers): number {
  const screen = monitor?.dims?.l ?? 0;
  const pair = speakers ? 2 * ((speakers.dims?.l ?? 0) + DESK.speakerGapMm) : 0;
  return screen + pair;
}
