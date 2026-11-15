import { jsonCatalogue } from "@/lib/parts";
import { presets } from "@/lib/presets";

/**
 * When an admin may delete a catalogue item for good (not just deactivate it).
 *
 * - **Items from the repo** (data/parts, data/setup) can't be deleted: the
 *   JSON would bring them straight back. Deactivate them instead.
 * - **Items a preset uses** can't be deleted: the preset would open half empty.
 * - **Items a saved build uses** can't be deleted: the build would lose a part
 *   without its owner knowing. The count comes from the database
 *   (`item_usage_count`, admins only, a number and nothing else); the database
 *   also refuses the delete itself (supabase/migrations/…_item_delete.sql).
 *
 * Share links that hold a deleted item still open: the item is skipped and
 * counted (lib/share.ts `missingNote`).
 */

export type DeleteBlock =
  | { reason: "seed"; message: string }
  | { reason: "preset"; message: string }
  | { reason: "used"; message: string }
  | { reason: "unknown"; message: string };

export interface DeleteFacts {
  /** The item is in the repo's JSON. */
  seed: boolean;
  /** Names of the presets that use it. */
  presets: string[];
  /** Saved builds that use it, or null when that couldn't be checked. */
  usage: number | null;
}

export const SEED_MESSAGE = "Catalogue item from the repo: deactivate instead.";

/** Null when the item can be deleted; otherwise why not, as the admin sees it. */
export function deleteBlock(facts: DeleteFacts): DeleteBlock | null {
  if (facts.seed) return { reason: "seed", message: SEED_MESSAGE };
  if (facts.presets.length)
    return {
      reason: "preset",
      message: `Used by the preset${facts.presets.length > 1 ? "s" : ""} ${facts.presets.join(", ")}, so it can't be deleted.`,
    };
  if (facts.usage === null)
    return {
      reason: "unknown",
      message:
        "Couldn't check whether saved builds use this item, so it wasn't deleted. Try again in a moment.",
    };
  if (facts.usage > 0)
    return {
      reason: "used",
      message: `Used in ${facts.usage} saved build${facts.usage === 1 ? "" : "s"} — deactivate instead.`,
    };
  return null;
}

/** Whether the item is in the repo's JSON (whatever the database overlay says). */
export function isSeedItem(id: string): boolean {
  return jsonCatalogue().some((i) => i.id === id);
}

/** The presets that use an item, by name. */
export function presetsUsing(id: string): string[] {
  return presets
    .filter(
      (p) =>
        Object.values(p.parts).includes(id) ||
        Object.values(p.setup ?? {}).includes(id),
    )
    .map((p) => p.name);
}
