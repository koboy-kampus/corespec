// The pure part of `npm run db:export` (Phase 16b): database rows → the JSON
// files in data/ and data/price-check.csv. scripts/db-export.mjs does the
// fetching and writing; scripts/db-export.test.ts checks that exporting a
// database seeded from the JSON gives back exactly the same files.

/** @typedef {{ id: string, category: string, brand: string, name: string, tier: string, price_idr: number, dims: Record<string, number> | null, specs: Record<string, unknown>, model_id: string | null, active: boolean, position: number }} ItemRow */
/** @typedef {{ item_id: string, marketplace: string, url: string, price_idr: number, checked_at: string }} ListingRow */

const BASE_ORDER = [
  "id",
  "category",
  "brand",
  "name",
  "priceIDR",
  "tier",
  "dims",
];

/** @param {{ priceIDR: number, url: string }[]} list */
const sortListings = (list) =>
  [...list].sort(
    (a, b) =>
      a.priceIDR - b.priceIDR || (a.url < b.url ? -1 : a.url > b.url ? 1 : 0),
  );

/**
 * One row as a catalogue item, keys in the same order the JSON already has
 * for it (so the diff shows only real changes).
 * @param {ItemRow} row
 * @param {ListingRow[]} listings
 * @param {Record<string, unknown> | undefined} existing
 */
export function rowToJson(row, listings, existing) {
  /** @type {Record<string, unknown>} */
  const values = {
    id: row.id,
    category: row.category,
    brand: row.brand,
    name: row.name,
    priceIDR: row.price_idr,
    tier: row.tier,
    ...(row.dims
      ? { dims: { l: row.dims.l, w: row.dims.w, h: row.dims.h } }
      : {}),
    ...row.specs,
    ...(row.model_id ? { modelId: row.model_id } : {}),
    ...(row.active ? {} : { active: false }),
  };
  const list = sortListings(
    listings.map((l) => ({
      marketplace: l.marketplace,
      url: l.url,
      priceIDR: l.price_idr,
      checkedAt: String(l.checked_at).slice(0, 10),
    })),
  );
  if (list.length) values.listings = list;

  const order = existing
    ? Object.keys(existing)
    : [...BASE_ORDER, ...Object.keys(row.specs)];
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const k of order) if (k in values) out[k] = values[k];
  for (const k of Object.keys(values))
    if (!(k in out) && k !== "listings") out[k] = values[k];
  if (values.listings) {
    delete out.listings;
    out.listings = values.listings;
  }
  return out;
}

/**
 * New contents for each category file.
 * @param {ItemRow[]} items
 * @param {ListingRow[]} listings
 * @param {Map<string, Record<string, unknown>[]>} current category → its JSON items now
 * @returns {{ files: Map<string, Record<string, unknown>[]>, onlyInJson: string[] }}
 */
export function exportCatalogue(items, listings, current) {
  /** @type {Map<string, ListingRow[]>} */
  const byItem = new Map();
  for (const l of listings)
    byItem.set(l.item_id, [...(byItem.get(l.item_id) ?? []), l]);
  const existing = new Map(
    [...current.values()].flat().map((i) => [/** @type {string} */ (i.id), i]),
  );
  /** @type {Map<string, Record<string, unknown>[]>} */
  const files = new Map();
  const inDb = new Set(items.map((r) => r.id));
  const sorted = [...items].sort(
    (a, b) => a.position - b.position || (a.id < b.id ? -1 : 1),
  );
  for (const category of current.keys()) {
    const rows = sorted.filter((r) => r.category === category);
    const out = rows.map((r) =>
      rowToJson(r, byItem.get(r.id) ?? [], existing.get(r.id)),
    );
    // Items the database doesn't have stay (old links use them), at the end.
    for (const old of current.get(category) ?? [])
      if (!inDb.has(/** @type {string} */ (old.id))) out.push(old);
    files.set(category, out);
  }
  const onlyInJson = [...existing.keys()].filter((id) => !inDb.has(id));
  return { files, onlyInJson };
}

/** @param {string} v */
const cell = (v) => (/[",\n\r;]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/**
 * data/price-check.csv from the exported items: one row per listing, or one
 * empty row for an item nobody has checked. Keeps the CSV's current row order;
 * new items go at the end.
 * @param {string} currentCsv
 * @param {Record<string, unknown>[]} items every exported item
 */
export function priceCsv(currentCsv, items) {
  const order = [];
  const seen = new Set();
  for (const line of currentCsv.replace(/^﻿/, "").split(/\r?\n/).slice(1)) {
    const id = line.split(/[,;]/)[0]?.trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  const byId = new Map(items.map((i) => [/** @type {string} */ (i.id), i]));
  for (const id of byId.keys()) if (!seen.has(id)) order.push(id);
  const lines = ["id,name,marketplace,url,price,checked"];
  for (const id of order) {
    const item = byId.get(id);
    if (!item) continue;
    const name = cell(`${item.brand} ${item.name}`);
    const list =
      /** @type {{ marketplace: string, url: string, priceIDR: number, checkedAt: string }[]} */ (
        item.listings ?? []
      );
    if (!list.length) lines.push(`${id},${name},,,,`);
    for (const l of list)
      lines.push(
        [
          id,
          name,
          l.marketplace,
          cell(l.url),
          String(l.priceIDR),
          l.checkedAt,
        ].join(","),
      );
  }
  return `${lines.join("\n")}\n`;
}
