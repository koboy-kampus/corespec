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

/**
 * How many times the estimated draw the PSU can supply, rounded *down* to one
 * decimal so it never claims more headroom than there is (1.29× shows as 1.2×,
 * not as a passing 1.3×). Null without a PSU or a draw to compare.
 */
export function headroomRatio(
  drawW: number,
  psuW: number | undefined,
): number | null {
  if (!psuW || drawW <= 0) return null;
  // The epsilon keeps exact ratios like 650 / 500 = 1.3 from flooring to 1.2.
  return Math.floor((psuW / drawW) * 10 + 1e-9) / 10;
}

/** "1.3×": a ratio with one decimal and a multiplication sign. */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(1)}×`;
}

/** Smallest PSU wattage that meets the 1.3× headroom target. */
export function recommendedPsuW(drawW: number): number {
  return Math.ceil(drawW * POWER.headroom);
}
