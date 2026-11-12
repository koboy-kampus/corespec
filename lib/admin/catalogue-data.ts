import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import {
  ITEM_COLUMNS,
  rowsToItems,
  type ItemRow,
  type ListingRow,
} from "@/lib/catalogue/rows";
import { daysSince, STALE_DAYS } from "@/lib/prices";
import type { Item } from "@/types/parts";

/**
 * The catalogue as the database has it right now, for the admin pages (Phase
 * 16b). Never the cached copy the public pages use: admins see what they saved.
 */

export interface AdminListing extends ListingRow {
  id: string;
}

export interface AdminCatalogue {
  items: Item[];
  listings: AdminListing[];
  /** Rows the site can't use (it shows the JSON's version of these). */
  skipped: string[];
  error?: string;
}

export async function readAdminCatalogue(
  supabase: Supabase,
): Promise<AdminCatalogue> {
  const [items, listings] = await Promise.all([
    supabase.from("items").select(ITEM_COLUMNS).range(0, 4999),
    supabase
      .from("listings")
      .select("id, item_id, marketplace, url, price_idr, checked_at")
      .range(0, 19999),
  ]);
  const error = items.error?.message ?? listings.error?.message;
  if (error) return { items: [], listings: [], skipped: [], error };
  const l = (listings.data ?? []) as unknown as AdminListing[];
  const { items: list, skipped } = rowsToItems(
    (items.data ?? []) as unknown as ItemRow[],
    l,
  );
  return { items: list, listings: l, skipped };
}

export function isStaleCheck(checkedAt: string, now = new Date()): boolean {
  return daysSince(checkedAt, now) > STALE_DAYS;
}
