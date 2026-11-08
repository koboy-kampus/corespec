import type { ResolvedBuild } from "@/types/parts";

/** Wattage model from REI.md §4. */
export const POWER = {
  boardW: 50,
  perRamStickW: 5,
  perDriveW: 5,
  fansW: 15,
  /** PSU should be at least this multiple of the estimated draw. */
  headroom: 1.3,
} as const;

/**
 * Estimated draw = CPU TDP + GPU TDP + 50 W (board) + 5 W × RAM sticks
 * + 5 W per drive + 15 W fans.
 */
export function estimateDrawW(build: ResolvedBuild): number {
  return (
    (build.cpu?.tdpW ?? 0) +
    (build.gpu?.tdpW ?? 0) +
    POWER.boardW +
    POWER.perRamStickW * (build.ram?.sticks ?? 0) +
    POWER.perDriveW * (build.storage ? 1 : 0) +
    POWER.fansW
  );
}

/** Smallest PSU wattage that meets the 1.3× headroom target. */
export function recommendedPsuW(drawW: number): number {
  return Math.ceil(drawW * POWER.headroom);
}
