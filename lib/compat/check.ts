import { resolveBuild } from "@/lib/parts";
import type { Build, ResolvedBuild } from "@/types/parts";
import { RULES, type CompatResult, type Severity } from "./rules";

const ORDER: Record<Severity, number> = { error: 0, warning: 1, info: 2 };

/** Run every rule on an already-resolved build. Errors first, then warnings, then info. */
export function checkResolved(build: ResolvedBuild): CompatResult[] {
  return RULES.map((rule) => rule(build))
    .filter((r): r is CompatResult => r !== null)
    .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

/**
 * The single source of truth for compatibility: the builder UI, the 3D viewer
 * (coral outline on flagged parts) and the tests all read this.
 */
export function check(parts: Build["parts"]): CompatResult[] {
  return checkResolved(resolveBuild(parts));
}

/** Ids of parts involved in errors or warnings. */
export function flaggedPartIds(results: CompatResult[]): Set<string> {
  return new Set(
    results.filter((r) => r.severity !== "info").flatMap((r) => r.partIds),
  );
}

export type { CompatResult, Severity };
