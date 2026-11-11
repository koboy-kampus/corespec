"use client";

import { CATEGORY_LABEL } from "@/lib/categories";
import type { CompatResult } from "@/lib/compat/rules";
import { DESK } from "@/lib/desk";
import { partLabel } from "@/lib/labels";
import { deskSummary } from "@/lib/viewer/desk-highlights";
import type { Case, ResolvedSetup } from "@/types/parts";

/**
 * The desk view's text twin (the canvas is hidden from screen readers): what's on
 * and around the desk, and what's flagged.
 */
export function DeskDescription({
  setup,
  pcCase,
  results,
}: {
  setup: ResolvedSetup;
  pcCase?: Case;
  results: Pick<CompatResult, "id" | "severity" | "partIds">[];
}) {
  const items = Object.values(setup);
  const { flagged, overhang } = deskSummary(setup, pcCase, results);
  const { widthMm, depthMm } = DESK.fallback;
  return (
    <p className="sr-only">
      3D desk preview showing{" "}
      {items.length
        ? items
            .map((i) => `${CATEGORY_LABEL[i.category]}: ${partLabel(i)}`)
            .join(", ")
        : "no setup items"}
      {pcCase ? `, and the PC in the ${partLabel(pcCase)}` : ""}.
      {setup.desk
        ? ""
        : ` No desk picked: a ${widthMm / 10} × ${depthMm / 10} cm stand-in desk is shown.`}
      {flagged.length
        ? ` Highlighted with warnings: ${flagged.map((i) => partLabel(i)).join(", ")}.`
        : ""}
      {overhang && setup.desk
        ? ` They hang over the edge of the ${partLabel(setup.desk)}.`
        : ""}
    </p>
  );
}
