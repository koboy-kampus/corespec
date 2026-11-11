import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_ITEMS, getItem } from "@/lib/parts";
import { shopLinks } from "@/lib/prices";
import type { Item } from "@/types/parts";
import { describeChanges, parseCsv, readPriceCsv } from "./price-csv.mjs";

const fixture = (name: string) =>
  readFileSync(join(__dirname, "../tests/fixtures", name), "utf8");
const ids = new Set(ALL_ITEMS.map((i) => i.id));
const TODAY = new Date(2026, 10, 11);

describe("parseCsv", () => {
  it("reads quotes, doubled quotes, CRLF and a BOM", () => {
    expect(parseCsv('﻿a,b\r\n"x, y","say ""hi"""\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"'],
    ]);
  });
});

describe("readPriceCsv", () => {
  it("turns a 3-row test CSV into 3 listings, cheapest first, skipping unfilled rows", () => {
    const { listings, errors, rows } = readPriceCsv(
      fixture("price-check-3-rows.csv"),
      ids,
      TODAY,
    );
    expect(errors).toEqual([]);
    expect(rows).toBe(3);
    expect([...listings.keys()]).toEqual([
      "cpu-amd-ryzen-5-5600",
      "monitor-aoc-24g4",
    ]);
    expect(
      listings.get("cpu-amd-ryzen-5-5600")!.map((l) => l.marketplace),
    ).toEqual(["shopee", "tokopedia"]);

    // ...which become 3 buy buttons, each with its checked price and date.
    const withListings = [...listings].map(([id, l]): Item => ({
      ...getItem(id)!,
      listings: l,
    }));
    const links = withListings.flatMap(shopLinks);
    expect(links.map((l) => l.label)).toEqual([
      "View on Shopee",
      "View on Tokopedia",
      "View on Blibli",
    ]);
    expect(links.every((l) => l.kind === "listing" && l.checkedAt)).toBe(true);
  });

  it("reads Excel's semicolon CSV (Indonesian settings)", () => {
    const { listings, errors } = readPriceCsv(
      fixture("price-check-semicolons.csv"),
      ids,
      TODAY,
    );
    expect(errors).toEqual([]);
    expect(listings.get("cpu-amd-ryzen-5-5600")?.[0].priceIDR).toBe(1575000);
  });

  it("rejects bad rows with a clear message naming the row and the problem", () => {
    const { errors, listings } = readPriceCsv(
      fixture("price-check-bad.csv"),
      ids,
      TODAY,
    );
    expect(listings.size).toBe(0);
    expect(errors).toEqual([
      "row 2 (cpu-amd-ryzen-5-5600): url must start with https://",
      'row 2 (cpu-amd-ryzen-5-5600): price "1.575.000" must be a whole number of rupiah, digits only (e.g. 2747000)',
      'row 2 (cpu-amd-ryzen-5-5600): checked "02/11/2026" must be a real date written YYYY-MM-DD',
      'row 3 (cpu-made-up): unknown id "cpu-made-up" (not in data/parts or data/setup)',
      "row 3 (cpu-made-up): url is on tokopedia.com.evil.example, not on tokopedia.com, shopee.co.id, blibli.com",
      'row 4 (monitor-aoc-24g4): url is a tokopedia link but marketplace says "shopee"',
      'row 4 (monitor-aoc-24g4): checked "2026-02-30" must be a real date written YYYY-MM-DD',
    ]);
  });

  it("rejects future dates, duplicates and a missing column", () => {
    const head = "id,marketplace,url,price,checked\n";
    const row =
      "cpu-amd-ryzen-5-5600,shopee,https://shopee.co.id/x,1,2026-11-12\n";
    expect(readPriceCsv(head + row, ids, TODAY).errors).toEqual([
      "row 2 (cpu-amd-ryzen-5-5600): checked 2026-11-12 is in the future (today is 2026-11-11)",
    ]);
    const ok = row.replace("2026-11-12", "2026-11-10");
    expect(readPriceCsv(head + ok + ok, ids, TODAY).errors).toEqual([
      "row 3 (cpu-amd-ryzen-5-5600): the same id and url appear twice",
    ]);
    expect(readPriceCsv("id,url,price\n", ids, TODAY).errors[0]).toMatch(
      /missing columns marketplace, checked/,
    );
  });

  it("accepts the real data/price-check.csv", () => {
    const csv = readFileSync(
      join(__dirname, "../data/price-check.csv"),
      "utf8",
    );
    expect(readPriceCsv(csv, ids).errors).toEqual([]);
    // One row per catalogue item at least, so every id is ready to fill in.
    const listed = new Set(parseCsv(csv).map((r) => r[0]));
    expect([...ids].filter((id) => !listed.has(id))).toEqual([]);
  });
});

describe("describeChanges", () => {
  it("says what was added, changed and removed", () => {
    const l = {
      marketplace: "shopee" as const,
      url: "https://shopee.co.id/x",
      priceIDR: 1000,
      checkedAt: "2026-11-11",
    };
    const changes = describeChanges(
      [{ id: "a" }, { id: "b", listings: [l] }, { id: "c", listings: [l] }],
      new Map([
        ["a", [l]],
        ["b", [{ ...l, priceIDR: 900 }]],
      ]),
    );
    expect(changes).toEqual([
      "+ a: shopee Rp 1.000 (2026-11-11)",
      "~ b: shopee Rp 900 (2026-11-11)",
      "- c: removed 1 listing(s)",
    ]);
  });
});
