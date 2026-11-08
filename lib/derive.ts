import { check, flaggedPartIds } from "@/lib/compat/check";
import { buildTotalIDR, resolveBuild } from "@/lib/parts";
import { estimateDrawW } from "@/lib/power";
import type { Build, Category } from "@/types/parts";

export type SlotFlag = "error" | "warning";

/** Everything the UI shows about a set of parts: resolved parts, checks, total, draw. */
export function deriveBuild(parts: Build["parts"]) {
  const resolved = resolveBuild(parts);
  const results = check(parts);
  const severityByCategory: Partial<Record<Category, SlotFlag>> = {};
  for (const r of results) {
    if (r.severity === "info") continue;
    for (const part of Object.values(resolved)) {
      if (!r.partIds.includes(part.id)) continue;
      if (severityByCategory[part.category] !== "error") {
        severityByCategory[part.category] = r.severity;
      }
    }
  }
  return {
    parts,
    resolved,
    results,
    flagged: flaggedPartIds(results),
    severityByCategory,
    totalIDR: buildTotalIDR(parts),
    drawW: estimateDrawW(resolved),
    filled: Object.keys(resolved).length,
    errors: results.filter((r) => r.severity === "error").length,
    warnings: results.filter((r) => r.severity === "warning").length,
  };
}

export type DerivedBuild = ReturnType<typeof deriveBuild>;
