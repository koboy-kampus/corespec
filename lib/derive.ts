import { check, checkSetup, flaggedPartIds } from "@/lib/compat/check";
import { buildTotals, resolveBuild, resolveSetup } from "@/lib/parts";
import { estimateDrawW } from "@/lib/power";
import type { Build, PcCategory, SetupCategory } from "@/types/parts";

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
  // Setup rules never block a build: their warnings mark the setup slots only.
  const setupResults = checkSetup(parts);
  const setupSeverity: Partial<Record<SetupCategory, "warning">> = {};
  for (const r of setupResults) {
    if (r.severity !== "warning") continue;
    for (const item of Object.values(setup))
      if (r.partIds.includes(item.id)) setupSeverity[item.category] = "warning";
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
    /** Setup rule results (warning/info), shown under their own heading. */
    setupResults,
    /** Setup items involved in a setup warning (the desk view's amber glow). */
    setupFlagged: flaggedPartIds(setupResults),
    setupSeverity,
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
    /** Setup warnings (setup rules never error), for the Setup tab count. */
    setupWarnings: setupResults.filter((r) => r.severity === "warning").length,
  };
}

export type DerivedBuild = ReturnType<typeof deriveBuild>;
