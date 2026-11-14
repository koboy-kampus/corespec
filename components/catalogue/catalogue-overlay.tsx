"use client";

import type { ReactNode } from "react";
import {
  publishOverlay,
  type CatalogueOverlay as Overlay,
} from "@/lib/catalogue/overlay-channel";

/**
 * Hands the database's catalogue changes (Phase 16b) to the browser before
 * anything below it renders. It imports only the tiny hand-off module, never
 * the catalogue itself, so pages that don't use the catalogue load no more
 * JavaScript. With no changes (the usual case) `overlay` is null.
 */
export function CatalogueOverlay({
  overlay,
  children,
}: {
  overlay: Overlay | null;
  children: ReactNode;
}) {
  // During render on purpose: children read the catalogue as they render.
  // Applying the same overlay again is a no-op.
  publishOverlay(overlay);
  return children;
}
