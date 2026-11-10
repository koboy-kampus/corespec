import { resolveBuild, resolveSetup } from "@/lib/parts";
import { SETUP_RULES, type SetupResult } from "./setup-rules";
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

/**
 * The setup rules (Phase 11): warnings and info only, run on the PC and setup
 * halves of the build. Warnings first, then info.
 */
export function checkSetup(parts: Build["parts"]): SetupResult[] {
  const input = { pc: resolveBuild(parts), setup: resolveSetup(parts) };
  return SETUP_RULES.map((rule) => rule(input))
    .filter((r): r is SetupResult => r !== null)
    .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
}

export type { SetupResult };
