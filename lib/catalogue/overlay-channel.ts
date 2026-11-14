import type { Item } from "@/types/parts";

/**
 * The catalogue the site shows is the JSON in data/ (bundled, so it works with
 * no database at all), plus an *overlay*: the items the database has that differ
 * from it (Phase 16b). When the database matches the JSON, or can't be reached,
 * the overlay is null and nothing changes.
 *
 * This module is the hand-off point and imports nothing, on purpose: the root
 * layout publishes the overlay here (components/catalogue/catalogue-overlay.tsx)
 * without pulling the catalogue into every page's JavaScript. lib/parts.ts
 * subscribes when it loads and applies it.
 */
export interface CatalogueOverlay {
  /** Changes whenever the content does, so applying the same overlay twice is free. */
  key: string;
  /** Items that differ from the JSON (or aren't in it), complete. */
  items: Item[];
  /** "Estimates as of", when the database's differs from data/meta.json. */
  estimatesAsOf?: string;
}

type Listener = (overlay: CatalogueOverlay | null) => void;

let current: CatalogueOverlay | null = null;
const listeners = new Set<Listener>();

export function publishOverlay(overlay: CatalogueOverlay | null): void {
  if ((overlay?.key ?? null) === (current?.key ?? null)) return;
  current = overlay;
  for (const l of listeners) l(overlay);
}

/** Calls `listener` now with the current overlay, and again on every change. */
export function subscribeOverlay(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}
