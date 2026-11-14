import type { Category, Item, Listing, Marketplace, Tier } from "@/types/parts";
import { checkItem, SPEC_FIELDS } from "./schema";
import { checkListing, sortListings } from "./listings";
import type { CatalogueOverlay } from "./overlay-channel";

/**
 * Database rows (supabase/migrations/20261112000400_catalogue.sql) ↔ the
 * site's `Item`. The base fields are columns; the category's own fields
 * (SPEC_FIELDS) live in `specs`. Pure functions, used by the site, the seed
 * generator and db:export.
 */

export interface ItemRow {
  id: string;
  category: Category;
  brand: string;
  name: string;
  tier: Tier;
  price_idr: number;
  dims: { l: number; w: number; h: number } | null;
  specs: Record<string, unknown>;
  model_id: string | null;
  active: boolean;
  position: number;
}

export interface ListingRow {
  item_id: string;
  marketplace: Marketplace;
  url: string;
  price_idr: number;
  checked_at: string;
}

export const ITEM_COLUMNS =
  "id, category, brand, name, tier, price_idr, dims, specs, model_id, active, position";
export const LISTING_COLUMNS =
  "item_id, marketplace, url, price_idr, checked_at";

/** An item as a row of public.items. `position` keeps the JSON's order in each category. */
export function itemToRow(item: Item, position: number): ItemRow {
  const specs: Record<string, unknown> = {};
  const rec = item as unknown as Record<string, unknown>;
  for (const f of SPEC_FIELDS[item.category]) specs[f.key] = rec[f.key];
  return {
    id: item.id,
    category: item.category,
    brand: item.brand,
    name: item.name,
    tier: item.tier,
    price_idr: item.priceIDR,
    dims: item.dims ? { l: item.dims.l, w: item.dims.w, h: item.dims.h } : null,
    specs,
    model_id: item.modelId ?? null,
    active: item.active !== false,
    position,
  };
}

export function listingToRow(itemId: string, l: Listing): ListingRow {
  return {
    item_id: itemId,
    marketplace: l.marketplace,
    url: l.url,
    price_idr: l.priceIDR,
    checked_at: l.checkedAt,
  };
}

/**
 * A row back into an `Item`, checked like the admin form checks it. Returns
 * undefined for a row the site can't use (it then keeps the JSON's version).
 */
export function rowToItem(
  row: ItemRow,
  listings: ListingRow[] = [],
): Item | undefined {
  const { item } = checkItem({
    ...(row.specs && typeof row.specs === "object" ? row.specs : {}),
    id: row.id,
    category: row.category,
    brand: row.brand,
    name: row.name,
    priceIDR: row.price_idr,
    tier: row.tier,
    dims: row.dims ?? undefined,
    modelId: row.model_id ?? undefined,
    active: row.active,
  });
  if (!item) return undefined;
  const checked: Listing[] = [];
  for (const r of listings) {
    // The database already refused future dates when the row was written.
    const { listing } = checkListing(
      {
        marketplace: r.marketplace,
        url: r.url,
        priceIDR: r.price_idr,
        checkedAt: String(r.checked_at).slice(0, 10),
      },
      "9999-12-31",
    );
    if (listing) checked.push(listing);
  }
  return (
    checked.length ? { ...item, listings: sortListings(checked) } : item
  ) as Item;
}

/** Every row, grouped and converted, in category then `position` order. */
export function rowsToItems(
  items: ItemRow[],
  listings: ListingRow[],
): { items: Item[]; skipped: string[] } {
  const byItem = new Map<string, ListingRow[]>();
  for (const l of listings) {
    const list = byItem.get(l.item_id) ?? [];
    list.push(l);
    byItem.set(l.item_id, list);
  }
  const out: Item[] = [];
  const skipped: string[] = [];
  for (const row of [...items].sort(
    (a, b) => a.position - b.position || (a.id < b.id ? -1 : 1),
  )) {
    const item = rowToItem(row, byItem.get(row.id));
    if (item) out.push(item);
    else skipped.push(row.id);
  }
  return { items: out, skipped };
}

/** A stable text form of an item, for comparing: key order and listing order don't matter. */
export function canonicalItem(item: Item): string {
  const rec = { ...(item as unknown as Record<string, unknown>) };
  if (rec.active !== false) delete rec.active;
  if (rec.modelId === undefined) delete rec.modelId;
  if (rec.dims === undefined) delete rec.dims;
  const listings = sortListings(item.listings ?? []);
  if (listings.length) rec.listings = listings;
  else delete rec.listings;
  return stableStringify(rec);
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .sort()
      .map(
        (k) =>
          `${JSON.stringify(k)}:${stableStringify((v as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return JSON.stringify(v);
}

/** FNV-1a, enough to tell overlays apart (not for security). */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * What the database changes compared with the JSON. Items only in the JSON
 * stay as they are (old share links keep working); items the database can't
 * describe were already dropped by rowToItem. Null when nothing differs.
 */
export function diffCatalogue(
  base: Item[],
  baseEstimatesAsOf: string,
  db: Item[],
  dbEstimatesAsOf: string | undefined,
): CatalogueOverlay | null {
  const byId = new Map(base.map((i) => [i.id, canonicalItem(i)]));
  const items = db.filter((i) => byId.get(i.id) !== canonicalItem(i));
  const estimatesAsOf =
    dbEstimatesAsOf && dbEstimatesAsOf !== baseEstimatesAsOf
      ? dbEstimatesAsOf
      : undefined;
  if (!items.length && !estimatesAsOf) return null;
  const body = { items, ...(estimatesAsOf ? { estimatesAsOf } : {}) };
  return { key: hash(stableStringify(body)), ...body };
}
