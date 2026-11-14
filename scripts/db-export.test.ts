import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { format } from "prettier";
import { describe, expect, it } from "vitest";
import { exportCatalogue, priceCsv } from "./db-export-lib.mjs";

/**
 * npm run db:export (Phase 16b): a database seeded from the JSON exports back
 * to exactly the same files, byte for byte, and an admin's edit shows up as
 * exactly that edit.
 */

const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

async function seeded() {
  const db = new PGlite();
  await db.exec(read("supabase/tests/supabase-shim.sql"));
  for (const f of readdirSync(join(root, "supabase/migrations")).sort())
    await db.exec(read(join("supabase/migrations", f)));
  await db.exec(read("supabase/seed.sql"));
  return db;
}

type Row = Record<string, unknown>;

async function exportFrom(db: PGlite) {
  const items = (
    await db.query<Row>(
      "select id, category, brand, name, tier, price_idr, dims, specs, model_id, active, position from public.items",
    )
  ).rows;
  const listings = (
    await db.query<Row>(
      "select item_id, marketplace, url, price_idr, to_char(checked_at, 'YYYY-MM-DD') as checked_at from public.listings",
    )
  ).rows;
  const paths = new Map<string, string>();
  const current = new Map<string, Row[]>();
  for (const d of ["data/parts", "data/setup"])
    for (const f of readdirSync(join(root, d))) {
      const list = JSON.parse(read(join(d, f))) as Row[];
      paths.set(String(list[0].category), join(d, f));
      current.set(String(list[0].category), list);
    }
  const { files, onlyInJson } = exportCatalogue(
    items as never,
    listings as never,
    current,
  );
  const texts = new Map<string, string>();
  for (const [c, list] of files)
    texts.set(
      paths.get(c)!,
      await format(JSON.stringify(list, null, 2), { parser: "json" }),
    );
  const csv = priceCsv(
    read("data/price-check.csv"),
    [...files.values()].flat(),
  );
  return { texts, csv, onlyInJson };
}

describe("npm run db:export", { timeout: 60_000 }, () => {
  it("gives back exactly the JSON and CSV the database was seeded from", async () => {
    const db = await seeded();
    const { texts, csv, onlyInJson } = await exportFrom(db);
    expect(onlyInJson).toEqual([]);
    expect(texts.size).toBe(20);
    for (const [path, text] of texts) expect(text, path).toBe(read(path));
    expect(csv).toBe(read("data/price-check.csv"));
    await db.close();
  });

  it("writes an admin's edits, and only those", async () => {
    const db = await seeded();
    await db.exec(`
      update public.items set price_idr = 1700000 where id = 'cpu-amd-ryzen-5-5600';
      insert into public.listings (item_id, marketplace, url, price_idr, checked_at)
      values ('cpu-amd-ryzen-5-5600', 'tokopedia', 'https://www.tokopedia.com/s/r5-5600', 1690000, '2026-11-12');
    `);
    const { texts, csv } = await exportFrom(db);
    const changed = [...texts]
      .filter(([p, t]) => t !== read(p))
      .map(([p]) => p);
    expect(changed).toEqual([join("data/parts", "cpu.json")]);
    const cpu = JSON.parse(texts.get(join("data/parts", "cpu.json"))!) as Row[];
    expect(cpu.find((i) => i.id === "cpu-amd-ryzen-5-5600")).toMatchObject({
      priceIDR: 1700000,
      listings: [
        {
          marketplace: "tokopedia",
          url: "https://www.tokopedia.com/s/r5-5600",
          priceIDR: 1690000,
          checkedAt: "2026-11-12",
        },
      ],
    });
    expect(csv).toContain(
      "cpu-amd-ryzen-5-5600,AMD Ryzen 5 5600,tokopedia,https://www.tokopedia.com/s/r5-5600,1690000,2026-11-12",
    );
    await db.close();
  });
});
