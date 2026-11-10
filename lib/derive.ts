import { check, flaggedPartIds } from "@/lib/compat/check";
import { buildTotals, resolveBuild, resolveSetup } from "@/lib/parts";
import { estimateDrawW } from "@/lib/power";
import type { Build, PcCategory } from "@/types/parts";

export type SlotFlag = "error" | "warning";

/** Everything the UI shows about a set of parts: resolved parts, checks, totals, draw. */
export function deriveBuild(parts: Build["parts"]) {
  const resolved = resolveBuild(parts);
  const setup = resolveSetup(parts);
  const results = check(parts);
  const severityByCategory: Partial<Record<PcCategory, SlotFlag>> = {};
  for (const r of results) {
    if (r.severity === "info") continue;
    for (const part of Object.values(resolved)) {
      if (!r.partIds.includes(part.id)) continue;
      if (severityByCategory[part.category] !== "error") {
        severityByCategory[part.category] = r.severity;
      }
    }
  }
  const { pcIDR, setupIDR, totalIDR } = buildTotals(parts);
  return {
    parts,
    /** The PC parts (what the checks, power estimate and 3D viewer use). */
    resolved,
    /** The setup items. */
    setup,
    results,
    flagged: flaggedPartIds(results),
    severityByCategory,
    pcIDR,
    setupIDR,
    /** PC and setup together. */
    totalIDR,
    drawW: estimateDrawW(resolved),
    /** PC slots filled, out of 8. */
    filled: Object.keys(resolved).length,
    /** Setup slots filled (all optional). */
    setupFilled: Object.keys(setup).length,
    errors: results.filter((r) => r.severity === "error").length,
    warnings: results.filter((r) => r.severity === "warning").length,
  };
}

export type DerivedBuild = ReturnType<typeof deriveBuild>;
