import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { JSON_ESTIMATES_AS_OF, jsonCatalogue } from "@/lib/parts";
import { supabaseConfig, type SupabaseConfig } from "@/lib/supabase/config";
import { publishOverlay, type CatalogueOverlay } from "./overlay-channel";
import {
  diffCatalogue,
  ITEM_COLUMNS,
  LISTING_COLUMNS,
  rowsToItems,
  type ItemRow,
  type ListingRow,
} from "./rows";

/**
 * Where the site's catalogue comes from (Phase 16b).
 *
 * - **No Supabase settings:** the JSON in data/, exactly as before. Supabase
 *   isn't even loaded.
 * - **Settings, database reachable:** the database's items and listings, sent
 *   to pages only as their differences from the JSON (lib/catalogue/rows.ts),
 *   so a database that matches the JSON adds nothing to any page.
 * - **Settings, database unreachable or not set up yet:** the JSON, exactly as
 *   before, and a warning in the server log. It tries again within a minute.
 *
 * Cached ('use cache', tag "catalogue") so pages stay static: they are built
 * with it and rebuilt in the background when an admin saves
 * (updateTag("catalogue")) or, at the latest, every hour.
 */

export const CATALOGUE_TAG = "catalogue";
/** How long a page build waits for the database before falling back to the JSON. */
export const FETCH_TIMEOUT_MS = 4000;

export interface CatalogueResult {
  overlay: CatalogueOverlay | null;
  source: "database" | "json";
  /** Why it's the JSON, when settings exist. */
  reason?: "not-configured" | "unreachable" | "empty";
  /** Database rows the site couldn't use (it kept the JSON's version). */
  skipped?: string[];
}

export interface CatalogueRows {
  items: ItemRow[];
  listings: ListingRow[];
  estimatesAsOf?: string;
}

/** Reads every item, listing and setting as anon (they're public), with a timeout. */
export async function fetchCatalogueRows(
  config: SupabaseConfig,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<CatalogueRows> {
  const { createClient } = await import("@supabase/supabase-js");
  const signal = AbortSignal.timeout(timeoutMs);
  const db = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal }) },
  });
  const [items, listings, settings] = await Promise.all([
    // No retries: the JSON is the fallback, and a page build shouldn't wait.
    db.from("items").select(ITEM_COLUMNS).range(0, 4999).retry(false),
    db.from("listings").select(LISTING_COLUMNS).range(0, 19999).retry(false),
    db
      .from("site_settings")
      .select("key, value")
      .eq("key", "estimates_as_of")
      .retry(false),
  ]);
  const error = items.error ?? listings.error ?? settings.error;
  if (error) throw new Error(error.message || "database error");
  const asOf = settings.data?.[0]?.value;
  return {
    items: (items.data ?? []) as unknown as ItemRow[],
    listings: (listings.data ?? []) as unknown as ListingRow[],
    estimatesAsOf:
      typeof asOf === "string" && /^\d{4}-\d{2}-\d{2}$/.test(asOf)
        ? asOf
        : undefined,
  };
}

/** The uncached work, exported for the tests. */
export async function readCatalogue(
  config: SupabaseConfig | null = supabaseConfig(),
  fetchRows = fetchCatalogueRows,
): Promise<CatalogueResult & { retrySoon: boolean }> {
  if (!config)
    return {
      overlay: null,
      source: "json",
      reason: "not-configured",
      retrySoon: false,
    };
  try {
    const rows = await fetchRows(config);
    if (!rows.items.length)
      return {
        overlay: null,
        source: "json",
        reason: "empty",
        retrySoon: false,
      };
    const { items, skipped } = rowsToItems(rows.items, rows.listings);
    if (skipped.length)
      console.warn(
        `[catalogue] ${skipped.length} database item(s) didn't pass the checks; using the JSON for: ${skipped.join(", ")}`,
      );
    return {
      overlay: diffCatalogue(
        jsonCatalogue(),
        JSON_ESTIMATES_AS_OF,
        items,
        rows.estimatesAsOf,
      ),
      source: "database",
      skipped,
      retrySoon: false,
    };
  } catch (e) {
    console.warn(
      `[catalogue] couldn't read the database, showing the JSON catalogue: ${e instanceof Error ? e.message : String(e)}`,
    );
    return {
      overlay: null,
      source: "json",
      reason: "unreachable",
      retrySoon: true,
    };
  }
}

export async function getCatalogue(): Promise<CatalogueResult> {
  "use cache";
  cacheTag(CATALOGUE_TAG);
  const { retrySoon, ...result } = await readCatalogue();
  if (!supabaseConfig()) cacheLife("max");
  // Long enough to stay in the static shell (Next: expire ≥ 5 min), short
  // enough that a page built while the database was down soon recovers.
  else if (retrySoon) cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
  else cacheLife("hours");
  return result;
}

/**
 * Server Components and Server Actions call this before using the catalogue
 * (lib/parts.ts): it applies the database's overlay on the server. The browser
 * gets the same overlay from the root layout.
 */
export async function loadCatalogue(): Promise<CatalogueResult> {
  const result = await getCatalogue();
  publishOverlay(result.overlay);
  return result;
}
