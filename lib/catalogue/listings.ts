import type { Listing, Marketplace } from "@/types/parts";

/**
 * The rules for a checked listing (Phase 16b): the same ones `npm run
 * prices:apply` uses (scripts/price-csv.mjs), so a listing is valid whether it
 * comes from the CSV or the admin form. The database checks them again
 * (supabase/migrations/20261112000400_catalogue.sql). Never fetches a
 * marketplace: these are prices checked by hand.
 */

/** Each marketplace and the domain its links must be on (or a subdomain of it). */
export const MARKETPLACE_DOMAINS: Record<Marketplace, string> = {
  tokopedia: "tokopedia.com",
  shopee: "shopee.co.id",
  blibli: "blibli.com",
};
export const MARKETPLACES = Object.keys(MARKETPLACE_DOMAINS) as Marketplace[];

export const URL_MAX = 2048;

/** A checked price this far from the estimate (either way) needs ticking "the price is right". */
export const MAX_PRICE_GAP = 0.4;

/** Today in Indonesia (WIB), YYYY-MM-DD: checks can't be dated after it. */
export function todayJakarta(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** Which marketplace a link belongs to, or undefined when it's on none of them. */
export function marketplaceOf(url: string): Marketplace | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  return MARKETPLACES.find((m) => {
    const d = MARKETPLACE_DOMAINS[m];
    return host === d || host.endsWith(`.${d}`);
  });
}

export type ListingErrors = Partial<
  Record<"marketplace" | "url" | "priceIDR" | "checkedAt", string>
>;

/**
 * Checks one listing. Stricter than a browser's URL parser on purpose, the same
 * as the database: https only, a plain host name (no "user@", no spaces).
 */
export function checkListing(
  raw: {
    marketplace?: unknown;
    url?: unknown;
    priceIDR?: unknown;
    checkedAt?: unknown;
  },
  today = todayJakarta(),
): { listing?: Listing; errors: ListingErrors } {
  const errors: ListingErrors = {};
  const marketplace = String(raw.marketplace ?? "").toLowerCase();
  const url = typeof raw.url === "string" ? raw.url.trim() : "";
  const price = raw.priceIDR;
  const checkedAt = typeof raw.checkedAt === "string" ? raw.checkedAt : "";

  if (!(MARKETPLACES as string[]).includes(marketplace))
    errors.marketplace = `One of ${MARKETPLACES.join(", ")}.`;

  const shape = /^https:\/\/([A-Za-z0-9.-]+)(?::\d{1,5})?(?:[/?#]|$)/.exec(url);
  if (!url) errors.url = "Paste the listing's link.";
  else if (url.length > URL_MAX) errors.url = "That link is too long.";
  else if (/\s/.test(url) || !shape)
    errors.url = "A full link starting with https://.";
  else {
    const on = marketplaceOf(url);
    if (!on)
      errors.url = `The link must be on ${Object.values(MARKETPLACE_DOMAINS).join(", ")}.`;
    else if (!errors.marketplace && on !== marketplace)
      errors.url = `That's a ${on} link, but the marketplace says ${marketplace}.`;
  }

  if (
    typeof price !== "number" ||
    !Number.isInteger(price) ||
    price <= 0 ||
    price > 1_000_000_000
  )
    errors.priceIDR = "A whole number of rupiah, digits only (e.g. 2747000).";

  if (!isRealDate(checkedAt)) errors.checkedAt = "A real date, YYYY-MM-DD.";
  else if (checkedAt > today)
    errors.checkedAt = `Can't be in the future (today is ${today}).`;

  if (Object.keys(errors).length) return { errors };
  return {
    listing: {
      marketplace: marketplace as Marketplace,
      url,
      priceIDR: price as number,
      checkedAt,
    },
    errors,
  };
}

/** How far a checked price is from the estimate, as a fraction (0.5 = 50%). */
export function priceGap(priceIDR: number, estimateIDR: number): number {
  return Math.abs(priceIDR - estimateIDR) / estimateIDR;
}

/** Cheapest first, then by link, so the same listings always come out in the same order. */
export function sortListings(list: Listing[]): Listing[] {
  return [...list].sort(
    (a, b) =>
      a.priceIDR - b.priceIDR || (a.url < b.url ? -1 : a.url > b.url ? 1 : 0),
  );
}
