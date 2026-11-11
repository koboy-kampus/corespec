import type { Item, Listing, Marketplace } from "@/types/parts";

/**
 * Prices (Phase 13): every item has an estimate (`priceIDR`) and may have
 * listings Rei checked by hand. What CoreSpec shows, and adds up, is the lowest
 * checked listing when there is one, otherwise the estimate. Marketplaces are only
 * ever linked to: never fetched or scraped.
 */

export const MARKETPLACE_LABEL: Record<Marketplace, string> = {
  tokopedia: "Tokopedia",
  shopee: "Shopee",
  blibli: "Blibli",
};

/** A listing checked longer ago than this gets a "Price may have changed" note. */
export const STALE_DAYS = 14;

/** Every link out of CoreSpec to a shop. */
export const OUTBOUND_REL = "noopener noreferrer nofollow";

/** The cheapest checked listing, if any. */
export function lowestListing(item: Item): Listing | undefined {
  return item.listings?.reduce<Listing | undefined>(
    (best, l) => (!best || l.priceIDR < best.priceIDR ? l : best),
    undefined,
  );
}

/** The price CoreSpec shows and adds up: the cheapest checked listing, or the estimate. */
export function shownPrice(item: Item): number {
  return lowestListing(item)?.priceIDR ?? item.priceIDR;
}

/** Where the shown price comes from. */
export type PriceSource =
  { kind: "checked"; checkedAt: string } | { kind: "estimate" };

export function priceSource(item: Item): PriceSource {
  const l = lowestListing(item);
  return l ? { kind: "checked", checkedAt: l.checkedAt } : { kind: "estimate" };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const utc = (isoDate: string) => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

/** Whole days from `checkedAt` (YYYY-MM-DD) to `today`. */
export function daysSince(checkedAt: string, today: Date): number {
  const now = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((now - utc(checkedAt)) / DAY_MS);
}

/** True when a check is more than STALE_DAYS old on `today`. */
export function isStale(checkedAt: string, today: Date): boolean {
  return daysSince(checkedAt, today) > STALE_DAYS;
}

/** "2026-11-12" → "12 Nov" (the year only when it isn't `thisYear`). */
export function formatCheckedDate(
  checkedAt: string,
  thisYear?: number,
): string {
  const [y, m, d] = checkedAt.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(thisYear === undefined || y !== thisYear ? { year: "numeric" } : {}),
  });
}

/** The newest `checkedAt` across these items, if any were checked. */
export function newestCheck(items: Item[]): string | undefined {
  let newest: string | undefined;
  for (const item of items)
    for (const l of item.listings ?? [])
      if (!newest || l.checkedAt > newest) newest = l.checkedAt;
  return newest;
}

export interface ShopLink {
  marketplace: Marketplace;
  url: string;
  /** "View on Shopee" for a checked listing, "Search on Tokopedia" otherwise. */
  label: string;
  kind: "listing" | "search";
  priceIDR?: number;
  checkedAt?: string;
}

/** Checked listings, cheapest first. */
export function buyLinks(item: Item): ShopLink[] {
  return [...(item.listings ?? [])]
    .sort((a, b) => a.priceIDR - b.priceIDR)
    .map((l) => ({
      marketplace: l.marketplace,
      url: l.url,
      label: `View on ${MARKETPLACE_LABEL[l.marketplace]}`,
      kind: "listing",
      priceIDR: l.priceIDR,
      checkedAt: l.checkedAt,
    }));
}

/**
 * The marketplaces' own search pages for this product's name. Always honest:
 * they never point at a product we haven't checked.
 */
export function searchLinks(item: Item): ShopLink[] {
  const q = encodeURIComponent(`${item.brand} ${item.name}`);
  return [
    {
      marketplace: "tokopedia",
      url: `https://www.tokopedia.com/search?st=product&q=${q}`,
      label: "Search on Tokopedia",
      kind: "search",
    },
    {
      marketplace: "shopee",
      url: `https://shopee.co.id/search?keyword=${q}`,
      label: "Search on Shopee",
      kind: "search",
    },
  ];
}

/** Buy links when the item has checked listings, search links when it doesn't. */
export function shopLinks(item: Item): ShopLink[] {
  const buy = buyLinks(item);
  return buy.length ? buy : searchLinks(item);
}
