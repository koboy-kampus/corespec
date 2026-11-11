import { describe, expect, it } from "vitest";
import { ALL_ITEMS, CATALOG, PRICES_AS_OF, buildTotals } from "@/lib/parts";
import { MARKETPLACE_DOMAINS } from "@/scripts/price-csv.mjs";
import type { Item, Listing } from "@/types/parts";
import {
  OUTBOUND_REL,
  STALE_DAYS,
  daysSince,
  formatCheckedDate,
  isStale,
  newestCheck,
  priceSource,
  searchLinks,
  shopLinks,
  shownPrice,
} from "./prices";

const cpu = CATALOG.cpu.find((c) => !c.listings)!;
const listing = (o: Partial<Listing> = {}): Listing => ({
  marketplace: "tokopedia",
  url: "https://www.tokopedia.com/x",
  priceIDR: 1_000_000,
  checkedAt: "2026-11-01",
  ...o,
});
const withListings = (...l: Listing[]): Item => ({ ...cpu, listings: l });

describe("shown price", () => {
  it("is the estimate when nothing was checked", () => {
    expect(shownPrice(cpu)).toBe(cpu.priceIDR);
    expect(priceSource(cpu)).toEqual({ kind: "estimate" });
  });

  it("is the cheapest checked listing, with its date", () => {
    const item = withListings(
      listing({ priceIDR: 1_200_000, checkedAt: "2026-11-05" }),
      listing({
        marketplace: "shopee",
        priceIDR: 1_100_000,
        checkedAt: "2026-11-03",
      }),
    );
    expect(shownPrice(item)).toBe(1_100_000);
    expect(priceSource(item)).toEqual({
      kind: "checked",
      checkedAt: "2026-11-03",
    });
  });

  it("is what totals add up", () => {
    const parts = { cpu: cpu.id };
    expect(buildTotals(parts).pcIDR).toBe(shownPrice(cpu));
    for (const item of ALL_ITEMS.filter((i) => i.listings?.length))
      expect(buildTotals({ [item.category]: item.id }).totalIDR, item.id).toBe(
        Math.min(...item.listings!.map((l) => l.priceIDR)),
      );
  });
});

describe("stale checks", () => {
  it(`notes a check older than ${STALE_DAYS} days`, () => {
    const today = new Date(2026, 10, 30); // 30 Nov 2026, local time
    expect(daysSince("2026-11-16", today)).toBe(14);
    expect(isStale("2026-11-16", today)).toBe(false);
    expect(isStale("2026-11-15", today)).toBe(true);
    expect(isStale("2026-11-30", today)).toBe(false);
  });

  it("formats the date short, with the year only when it isn't this year", () => {
    expect(formatCheckedDate("2026-11-12", 2026)).toBe("12 Nov");
    expect(formatCheckedDate("2025-12-30", 2026)).toBe("30 Dec 2025");
  });
});

describe("shop links", () => {
  it("searches Tokopedia and Shopee by name when nothing was checked", () => {
    const links = shopLinks(cpu);
    expect(links.map((l) => l.label)).toEqual([
      "Search on Tokopedia",
      "Search on Shopee",
    ]);
    const q = encodeURIComponent(`${cpu.brand} ${cpu.name}`);
    expect(links[0].url).toBe(
      `https://www.tokopedia.com/search?st=product&q=${q}`,
    );
    expect(links[1].url).toBe(`https://shopee.co.id/search?keyword=${q}`);
    expect(searchLinks(cpu)).toEqual(links);
  });

  it("links to each checked listing instead, cheapest first", () => {
    const item = withListings(
      listing({ priceIDR: 2 }),
      listing({
        marketplace: "blibli",
        url: "https://www.blibli.com/p/x",
        priceIDR: 1,
      }),
    );
    expect(shopLinks(item).map((l) => l.label)).toEqual([
      "View on Blibli",
      "View on Tokopedia",
    ]);
  });

  it("marks every outside link nofollow and safe for a new tab", () => {
    expect(OUTBOUND_REL.split(" ").sort()).toEqual([
      "nofollow",
      "noopener",
      "noreferrer",
    ]);
  });
});

describe("checked listings in the data", () => {
  const all = ALL_ITEMS.flatMap((i) =>
    (i.listings ?? []).map((l) => ({ id: i.id, ...l })),
  );

  it("are https links on their own marketplace, with whole-rupiah prices and real dates", () => {
    for (const l of all) {
      const u = new URL(l.url);
      const domain = MARKETPLACE_DOMAINS[l.marketplace];
      expect(u.protocol, l.id).toBe("https:");
      expect(
        u.hostname === domain || u.hostname.endsWith(`.${domain}`),
        l.id,
      ).toBe(true);
      expect(Number.isInteger(l.priceIDR) && l.priceIDR > 0, l.id).toBe(true);
      expect(l.checkedAt, l.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("date the prices by the newest check when there is one", () => {
    const newest = newestCheck(ALL_ITEMS);
    if (newest) expect(PRICES_AS_OF).toBe(newest);
  });
});
