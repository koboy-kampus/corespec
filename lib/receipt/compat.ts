import { check, checkSetup } from "@/lib/compat/check";
import { RULES } from "@/lib/compat/rules";
import { SETUP_RULES } from "@/lib/compat/setup-rules";
import { resolveSetup } from "@/lib/parts";
import type { Build } from "@/types/parts";
import type { CompatSummary } from "./types";

/**
 * The receipt's compatibility line, worked out with today's rules and catalogue
 * (the order stores prices, not rule results), so it carries the date it was
 * checked. Needs the catalogue loaded: call it on the server.
 */
export function compatSummary(
  parts: Build["parts"],
  now: Date = new Date(),
): CompatSummary {
  const hasSetup = Object.keys(resolveSetup(parts)).length > 0;
  const results = [...check(parts), ...(hasSetup ? checkSetup(parts) : [])];
  return {
    checkedAt: now.toISOString(),
    ruleCount: RULES.length + (hasSetup ? SETUP_RULES.length : 0),
    errors: results.filter((r) => r.severity === "error").map((r) => r.message),
    warnings: results
      .filter((r) => r.severity === "warning")
      .map((r) => r.message),
  };
}
