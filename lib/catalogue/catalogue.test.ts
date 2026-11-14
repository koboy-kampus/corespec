import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import {
  ALL_ITEMS,
  applyCatalogueOverlay,
  buildTotals,
  ESTIMATES_AS_OF,
  getItem,
  getPartsByCategory,
  getPickableByCategory,
  jsonCatalogue,
  JSON_ESTIMATES_AS_OF,
  PRICES_AS_OF,
} from "@/lib/parts";
import { decodeBuild, encodeBuild } from "@/lib/share";
import { getShowcase } from "@/lib/showcase";
import { readPriceCsv } from "../../scripts/price-csv.mjs";
import type { Item } from "@/types/parts";
import { BASE_KEYS, checkItem, SPEC_FIELDS } from "./schema";
import { checkListing, todayJakarta } from "./listings";
import {
  canonicalItem,
  diffCatalogue,
  itemToRow,
  listingToRow,
  rowsToItems,
  type ItemRow,
  type ListingRow,
} from "./rows";
import { readCatalogue, type CatalogueRows } from "./load";
import { publishOverlay } from "./overlay-channel";

const JSON_COPY: Item[] = structuredClone(ALL_ITEMS);

function dbRows(items: Item[]): CatalogueRows {
  const pos = new Map<string, number>();
  const rows: ItemRow[] = [];
  const listings: ListingRow[] = [];
  for (const i of items) {
    const n = pos.get(i.category) ?? 0;
    pos.set(i.category, n + 1);
    rows.push(itemToRow(i, n));
    for (const l of i.listings ?? []) listings.push(listingToRow(i.id, l));
  }
  return { items: rows, listings, estimatesAsOf: JSON_ESTIMATES_AS_OF };
}

afterEach(() => publishOverlay(null));

describe("catalogue schema (Phase 16b)", () => {
  it("accepts every item in data/ unchanged", () => {
    for (const item of ALL_ITEMS) {
      const { item: out, errors } = checkItem(item);
      expect(errors, item.id).toEqual({});
      expect(canonicalItem(out as Item), item.id).toBe(
        canonicalItem({ ...item, listings: undefined } as Item),
      );
    }
  });

  it("names exactly the fields the JSON has, per category", () => {
    const base = new Set<string>(BASE_KEYS);
    for (const [category, fields] of Object.entries(SPEC_FIELDS)) {
      const inJson = new Set(
        ALL_ITEMS.filter((i) => i.category === category).flatMap((i) =>
          Object.keys(i).filter((k) => !base.has(k)),
        ),
      );
      expect([...inJson].sort(), category).toEqual(
        fields.map((f) => f.key).sort(),
      );
    }
  });

  it("refuses bad items", () => {
    const cpu = ALL_ITEMS.find((i) => i.category === "cpu")!;
    expect(checkItem({ ...cpu, id: "gpu-x" }).errors.id).toBeDefined();
    expect(checkItem({ ...cpu, priceIDR: 1.5 }).errors.priceIDR).toBeDefined();
    expect(checkItem({ ...cpu, socket: "AM3" }).errors.socket).toBeDefined();
    expect(checkItem({ ...cpu, dims: undefined }).errors.dims).toBeDefined();
    expect(checkItem({ ...cpu, category: "toaster" }).errors.category).toBe(
      "Unknown category.",
    );
  });
});

describe("listing rules: the same as prices:apply", () => {
  const today = "2026-11-12";
  const cases: [string, string, string, string, boolean][] = [
    ["shopee", "https://shopee.co.id/x-i.1.2", "2747000", "2026-11-11", true],
    ["tokopedia", "https://www.tokopedia.com/shop/x", "100", today, true],
    ["blibli", "https://www.blibli.com/p/x", "1", "2026-01-01", true],
    ["shopee", "http://shopee.co.id/x", "1", today, false],
    ["shopee", "https://shopee.example.com/x", "1", today, false],
    ["blibli", "https://shopee.co.id/x", "1", today, false],
    ["lazada", "https://www.lazada.co.id/x", "1", today, false],
    ["shopee", "https://shopee.co.id/x", "0", today, false],
    ["shopee", "https://shopee.co.id/x", "1.5", today, false],
    ["shopee", "https://shopee.co.id/x", "1", "2026-11-13", false],
    ["shopee", "https://shopee.co.id/x", "1", "2026-02-30", false],
  ];
  it.each(cases)("%s %s %s %s → %s", (m, url, price, date, ok) => {
    const csv = `id,name,marketplace,url,price,checked\ncpu-x,X,${m},${url},${price},${date}\n`;
    const fromCsv =
      readPriceCsv(csv, new Set(["cpu-x"]), new Date(2026, 10, 12)).errors
        .length === 0;
    const fromForm = !Object.keys(
      checkListing(
        {
          marketplace: m,
          url,
          priceIDR: /^\d+$/.test(price)
            ? Number(price)
            : Number(price) || price,
          checkedAt: date,
        },
        today,
      ).errors,
    ).length;
    expect(fromCsv).toBe(ok);
    expect(fromForm).toBe(ok);
  });

  it("is stricter than a browser about hosts hidden before an @", () => {
    expect(
      checkListing(
        {
          marketplace: "shopee",
          url: "https://evil.example@shopee.co.id/x",
          priceIDR: 1,
          checkedAt: "2026-01-01",
        },
        "2026-11-12",
      ).errors.url,
    ).toBeDefined();
  });

  it("uses Indonesian time for today", () => {
    // 18:00 UTC on the 12th is already the 13th in Jakarta (UTC+7).
    expect(todayJakarta(new Date("2026-11-12T18:00:00Z"))).toBe("2026-11-13");
  });
});

describe("database rows ↔ items", () => {
  it("round-trips every item, listings included", () => {
    const { items, skipped } = rowsToItems(
      dbRows(ALL_ITEMS).items,
      dbRows(ALL_ITEMS).listings,
    );
    expect(skipped).toEqual([]);
    const byId = (list: Item[]) =>
      list.map(canonicalItem).sort((a, b) => (a < b ? -1 : 1));
    expect(byId(items)).toEqual(byId(ALL_ITEMS));
  });

  it("finds no differences when the database matches the JSON", () => {
    const { items } = rowsToItems(
      dbRows(ALL_ITEMS).items,
      dbRows(ALL_ITEMS).listings,
    );
    expect(
      diffCatalogue(
        ALL_ITEMS,
        JSON_ESTIMATES_AS_OF,
        items,
        JSON_ESTIMATES_AS_OF,
      ),
    ).toBeNull();
  });

  it("skips a row the site can't use, keeping the JSON's version", () => {
    const rows = dbRows(ALL_ITEMS);
    rows.items[0] = { ...rows.items[0], specs: {}, price_idr: 1 };
    const { items, skipped } = rowsToItems(rows.items, rows.listings);
    expect(skipped).toEqual([rows.items[0].id]);
    expect(
      diffCatalogue(
        ALL_ITEMS,
        JSON_ESTIMATES_AS_OF,
        items,
        JSON_ESTIMATES_AS_OF,
      ),
    ).toBeNull();
  });
});

describe("the overlay on lib/parts", () => {
  const cpu = JSON_COPY.find((i) => i.id === "cpu-amd-ryzen-5-5600")!;
  const preset = { cpu: cpu.id };

  it("changes prices, listings, settings and the picker, then puts the JSON back exactly", () => {
    const edited: Item = {
      ...cpu,
      priceIDR: 1_234_000,
      active: false,
      listings: [
        {
          marketplace: "blibli",
          url: "https://www.blibli.com/p/r5-5600",
          priceIDR: 1_200_000,
          checkedAt: "2026-11-12",
        },
      ],
    };
    const added = {
      ...cpu,
      id: "cpu-amd-ryzen-5-5600-new-db-only",
      name: "Database only",
    } as Item;
    const before = getShowcase().totalIDR;

    applyCatalogueOverlay({
      key: "t1",
      items: [edited, added],
      estimatesAsOf: "2026-11-10",
    });
    expect(getItem(cpu.id)?.priceIDR).toBe(1_234_000);
    expect(buildTotals(preset).pcIDR).toBe(1_200_000); // the checked price wins
    expect(getPickableByCategory("cpu").map((i) => i.id)).not.toContain(cpu.id);
    expect(getPartsByCategory("cpu").map((i) => i.id)).toContain(cpu.id);
    expect(getItem(added.id)?.name).toBe("Database only");
    // A share link with the new item opens.
    const code = encodeBuild({ name: "x", parts: { cpu: added.id } });
    expect(decodeBuild(code)?.parts.cpu).toBe(added.id);
    expect(ESTIMATES_AS_OF).toBe("2026-11-10");
    expect(PRICES_AS_OF).toBe("2026-11-12");

    applyCatalogueOverlay(null);
    expect(jsonCatalogue().map(canonicalItem)).toEqual(
      JSON_COPY.map(canonicalItem),
    );
    for (const item of JSON_COPY)
      expect(canonicalItem(getItem(item.id)!), item.id).toBe(
        canonicalItem(item),
      );
    expect(getPickableByCategory("cpu").map((i) => i.id)).toContain(cpu.id);
    expect(ESTIMATES_AS_OF).toBe(JSON_ESTIMATES_AS_OF);
    expect(getShowcase().totalIDR).toBe(before);
    // The item only the database had is out of the picker, but still resolves.
    expect(getPickableByCategory("cpu").map((i) => i.id)).not.toContain(
      added.id,
    );
  });
});

describe("where the catalogue comes from", () => {
  let hang: Server | undefined;
  afterAll(() => hang?.close());

  it("Supabase off: the JSON, and the database is never asked", async () => {
    const fetchRows = vi.fn();
    const r = await readCatalogue(null, fetchRows);
    expect(r).toMatchObject({
      overlay: null,
      source: "json",
      reason: "not-configured",
    });
    expect(fetchRows).not.toHaveBeenCalled();
  });

  it("Supabase on but unreachable (connection refused): the JSON, retried soon", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const r = await readCatalogue({
      url: "http://127.0.0.1:9",
      key: "sb_publishable_test",
    });
    expect(r).toMatchObject({
      overlay: null,
      source: "json",
      reason: "unreachable",
      retrySoon: true,
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("showing the JSON catalogue"),
    );
    warn.mockRestore();
  });

  it("Supabase on but not answering: gives up after the timeout and uses the JSON", async () => {
    hang = createServer(() => {}); // accepts, never answers
    await new Promise<void>((r) => hang!.listen(0, "127.0.0.1", r));
    const { port } = hang.address() as AddressInfo;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { fetchCatalogueRows } = await import("./load");
    const started = Date.now();
    const r = await readCatalogue(
      { url: `http://127.0.0.1:${port}`, key: "sb_publishable_test" },
      (c) => fetchCatalogueRows(c, 300),
    );
    expect(Date.now() - started).toBeLessThan(3000);
    expect(r).toMatchObject({
      overlay: null,
      source: "json",
      reason: "unreachable",
    });
    warn.mockRestore();
  });

  it("Supabase on, tables empty (seed not run yet): the JSON", async () => {
    const r = await readCatalogue({ url: "x", key: "y" }, async () => ({
      items: [],
      listings: [],
    }));
    expect(r).toMatchObject({ overlay: null, source: "json", reason: "empty" });
  });

  it("Supabase on and seeded: no overlay at all", async () => {
    const r = await readCatalogue({ url: "x", key: "y" }, async () =>
      dbRows(JSON_COPY),
    );
    expect(r).toMatchObject({ overlay: null, source: "database", skipped: [] });
  });

  it("Supabase on with one edit: only that item travels", async () => {
    const rows = dbRows(JSON_COPY);
    rows.items[3] = {
      ...rows.items[3],
      price_idr: rows.items[3].price_idr + 1,
    };
    const r = await readCatalogue({ url: "x", key: "y" }, async () => rows);
    expect(r.overlay?.items.map((i) => i.id)).toEqual([rows.items[3].id]);
  });
});
