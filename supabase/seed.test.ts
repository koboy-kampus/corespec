import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { ALL_ITEMS, ESTIMATES_AS_OF } from "@/lib/parts";
import {
  canonicalItem,
  diffCatalogue,
  ITEM_COLUMNS,
  rowsToItems,
  type ItemRow,
  type ListingRow,
} from "@/lib/catalogue/rows";
import { seedSql } from "@/lib/catalogue/seed-sql";

/**
 * supabase/seed.sql (Phase 16b): up to date with the JSON, safe to run twice,
 * and gives exactly the JSON's catalogue, item by item, listings included.
 * `npm run db:seed-sql` rewrites it (this file with -u).
 */

const dir = __dirname;
const read = (p: string) => readFileSync(join(dir, p), "utf8");
const migrations = readdirSync(join(dir, "migrations"))
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => read(join("migrations", f)));

async function seededDb(times: number) {
  const db = new PGlite();
  await db.exec(read("tests/supabase-shim.sql"));
  for (const sql of migrations) await db.exec(sql);
  for (let i = 0; i < times; i++) await db.exec(read("seed.sql"));
  return db;
}

async function readBack(db: PGlite) {
  const items = (
    await db.query<ItemRow>(`select ${ITEM_COLUMNS} from public.items`)
  ).rows;
  const listings = (
    await db.query<ListingRow>(
      `select item_id, marketplace, url, price_idr, to_char(checked_at, 'YYYY-MM-DD') as checked_at from public.listings`,
    )
  ).rows;
  const setting = (
    await db.query<{ value: string }>(
      `select value from public.site_settings where key = 'estimates_as_of'`,
    )
  ).rows[0]?.value;
  return { items, listings, setting };
}

describe("supabase/seed.sql", { timeout: 60_000 }, () => {
  it("is generated from the current JSON (npm run db:seed-sql)", async () => {
    await expect(seedSql(ALL_ITEMS, ESTIMATES_AS_OF)).toMatchFileSnapshot(
      "seed.sql",
    );
  });

  it("gives exactly the JSON's catalogue, item by item, including the checked listings", async () => {
    const db = await seededDb(1);
    const back = await readBack(db);
    const { items, skipped } = rowsToItems(back.items, back.listings);

    expect(skipped).toEqual([]);
    expect(items).toHaveLength(ALL_ITEMS.length);
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const json of ALL_ITEMS)
      expect(canonicalItem(byId.get(json.id)!), json.id).toBe(
        canonicalItem(json),
      );

    // The 4 listings checked by hand, exactly.
    const jsonListings = ALL_ITEMS.flatMap((i) =>
      (i.listings ?? []).map((l) => ({ id: i.id, ...l })),
    );
    expect(jsonListings).toHaveLength(4);
    expect(back.listings).toHaveLength(4);
    for (const l of jsonListings)
      expect(back.listings).toContainEqual({
        item_id: l.id,
        marketplace: l.marketplace,
        url: l.url,
        price_idr: l.priceIDR,
        checked_at: l.checkedAt,
      });

    // Same order within each category as the JSON files.
    for (const category of new Set(ALL_ITEMS.map((i) => i.category)))
      expect(
        items.filter((i) => i.category === category).map((i) => i.id),
        category,
      ).toEqual(
        ALL_ITEMS.filter((i) => i.category === category).map((i) => i.id),
      );

    expect(back.setting).toBe(ESTIMATES_AS_OF);
    // …so the site has nothing to change: the overlay is empty.
    expect(diffCatalogue(ALL_ITEMS, ESTIMATES_AS_OF, items, back.setting)).toBe(
      null,
    );
    await db.close();
  });

  it("is idempotent: a second run changes nothing and logs nothing", async () => {
    const once = await seededDb(1);
    const audit = async (db: PGlite) =>
      (
        await db.query<{ n: number }>(
          "select count(*)::int as n from public.audit_log",
        )
      ).rows[0].n;
    const before = await audit(once);
    const firstRows = await readBack(once);
    await once.exec(read("seed.sql"));
    expect(await readBack(once)).toEqual(firstRows);
    expect(await audit(once)).toBe(before);
    await once.close();
  });

  it("puts an edited item and its listings back to the JSON when run again", async () => {
    const db = await seededDb(1);
    await db.exec(`
      update public.items set price_idr = 1, active = false where id = 'cpu-amd-ryzen-5-7600';
      delete from public.listings where item_id = 'cpu-amd-ryzen-5-7600';
      insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
      values ('cpu-amd-ryzen-5-5600', 'blibli', 'https://www.blibli.com/p/x', 1, current_date - 1);
    `);
    await db.exec(read("seed.sql"));
    const back = await readBack(db);
    const { items } = rowsToItems(back.items, back.listings);
    expect(diffCatalogue(ALL_ITEMS, ESTIMATES_AS_OF, items, back.setting)).toBe(
      null,
    );
    await db.close();
  });
});
