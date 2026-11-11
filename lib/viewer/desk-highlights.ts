import type { CompatResult } from "@/lib/compat/rules";
import type { Case, ResolvedSetup, SetupItem } from "@/types/parts";
import {
  itemBounds,
  layoutDesk,
  type DeskKey,
  type DeskLayout,
} from "./desk-layout";

/** What the desk view marks for the setup warnings (Phase 12). */
export interface DeskHighlights {
  /** Items that glow amber. */
  glow: Partial<Record<DeskKey, true>>;
  /** Desk edges that something hangs over: they get a thin amber line. */
  edges: ("left" | "right")[];
}

/** Only these can hang over the desk's sides (they're what the desk-width rule adds up). */
const WIDE: DeskKey[] = ["monitor", "speakers"];

/**
 * Turns the setup rule results into highlights. The desk-width warning marks only
 * the items that actually hang over the edge, and that edge, not the whole desk;
 * every other warning marks the items it names.
 */
export function deskHighlights(
  layout: DeskLayout,
  results: Pick<CompatResult, "id" | "severity" | "partIds">[],
): DeskHighlights {
  const glow: DeskHighlights["glow"] = {};
  const edges = new Set<"left" | "right">();
  const half = layout.desk.widthMm / 2;
  for (const r of results) {
    if (r.severity !== "warning") continue;
    if (r.id === "desk-width") {
      for (const item of layout.items) {
        if (!WIDE.includes(item.key)) continue;
        const b = itemBounds(item);
        const left = b.min[0] < -half - 0.5;
        const right = b.max[0] > half + 0.5;
        if (left) edges.add("left");
        if (right) edges.add("right");
        if (left || right) glow[item.key] = true;
      }
      continue;
    }
    for (const item of layout.items)
      if (r.partIds.includes(item.id)) glow[item.key] = true;
  }
  return { glow, edges: [...edges].sort() };
}

/**
 * For the desk view's screen-reader text: the items that glow, in setup order,
 * and whether something hangs over the desk's edge.
 */
export function deskSummary(
  setup: ResolvedSetup,
  pcCase: Case | undefined,
  results: Pick<CompatResult, "id" | "severity" | "partIds">[],
): { flagged: SetupItem[]; overhang: boolean } {
  const { glow, edges } = deskHighlights(layoutDesk(setup, pcCase), results);
  const flagged = Object.values(setup).filter((i) => glow[i.category]);
  return { flagged, overhang: edges.length > 0 };
}
