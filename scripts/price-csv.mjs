// Reading and checking data/price-check.csv (Phase 13). Pure functions, so the
// tests can run them on fixture CSVs; scripts/prices-apply.mjs does the file work.
// Marketplaces are never fetched: these are prices Rei checked by hand.

/** @typedef {"tokopedia" | "shopee" | "blibli"} Marketplace */
/** @typedef {{ marketplace: Marketplace, url: string, priceIDR: number, checkedAt: string }} Listing */

/** Each marketplace and the domain its links must be on (or a subdomain of it). */
export const MARKETPLACE_DOMAINS = {
  tokopedia: "tokopedia.com",
  shopee: "shopee.co.id",
  blibli: "blibli.com",
};

const REQUIRED = ["id", "marketplace", "url", "price", "checked"];

/**
 * Splits CSV text into rows of cells. Handles quotes ("a, b" and ""), CRLF line
 * ends, a UTF-8 BOM, and Excel's semicolon separator (used in Indonesian settings).
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsv(text) {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
  /** @type {string[][]} */
  const rows = [];
  /** @type {string[]} */
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** @param {string} s */
const isRealDate = (s) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
};

/** @param {Date} d */
const isoDay = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Checks every row and turns the filled ones into listings per item id. Rows with
 * only an id (and name) are items nobody has checked yet: skipped, not errors.
 * @param {string} text the CSV
 * @param {Set<string>} knownIds every catalogue id
 * @param {Date} today checks dated after today are rejected
 * @returns {{ listings: Map<string, Listing[]>, errors: string[], rows: number }}
 */
export function readPriceCsv(text, knownIds, today = new Date()) {
  const [header = [], ...body] = parseCsv(text);
  const cols = header.map((h) => h.trim().toLowerCase());
  /** @type {string[]} */
  const errors = [];
  /** @type {Map<string, Listing[]>} */
  const listings = new Map();
  const missing = REQUIRED.filter((c) => !cols.includes(c));
  if (missing.length) {
    errors.push(
      `header: missing column${missing.length > 1 ? "s" : ""} ${missing.join(", ")} (expected id,name,marketplace,url,price,checked)`,
    );
    return { listings, errors, rows: 0 };
  }
  const at = (/** @type {string[]} */ r, /** @type {string} */ c) =>
    (r[cols.indexOf(c)] ?? "").trim();
  const todayIso = isoDay(today);
  const seen = new Set();
  let rows = 0;

  body.forEach((r, i) => {
    const line = i + 2; // 1-based, after the header
    if (r.every((c) => c.trim() === "")) return; // blank line
    const id = at(r, "id");
    const marketplace = at(r, "marketplace").toLowerCase();
    const url = at(r, "url");
    const price = at(r, "price");
    const checked = at(r, "checked");
    if (!marketplace && !url && !price && !checked) return; // not checked yet
    const where = `row ${line}${id ? ` (${id})` : ""}`;
    const bad = (/** @type {string} */ msg) => errors.push(`${where}: ${msg}`);
    const before = errors.length;

    if (!id) bad("id is empty");
    else if (!knownIds.has(id))
      bad(`unknown id "${id}" (not in data/parts or data/setup)`);
    if (!(marketplace in MARKETPLACE_DOMAINS))
      bad(
        `marketplace "${marketplace}" must be one of ${Object.keys(MARKETPLACE_DOMAINS).join(", ")}`,
      );
    /** @type {URL | null} */
    let u = null;
    try {
      u = new URL(url);
    } catch {
      bad(`url "${url}" is not a full link (it should start with https://)`);
    }
    if (u) {
      const host = u.hostname.toLowerCase();
      const domain = Object.entries(MARKETPLACE_DOMAINS).find(
        ([, d]) => host === d || host.endsWith(`.${d}`),
      );
      if (u.protocol !== "https:") bad(`url must start with https://`);
      if (!domain)
        bad(
          `url is on ${host}, not on ${Object.values(MARKETPLACE_DOMAINS).join(", ")}`,
        );
      else if (marketplace in MARKETPLACE_DOMAINS && domain[0] !== marketplace)
        bad(`url is a ${domain[0]} link but marketplace says "${marketplace}"`);
    }
    if (!/^\d+$/.test(price) || Number(price) <= 0)
      bad(
        `price "${price}" must be a whole number of rupiah, digits only (e.g. 2747000)`,
      );
    if (!isRealDate(checked))
      bad(`checked "${checked}" must be a real date written YYYY-MM-DD`);
    else if (checked > todayIso)
      bad(`checked ${checked} is in the future (today is ${todayIso})`);
    const key = `${id} ${url}`;
    if (seen.has(key)) bad("the same id and url appear twice");
    seen.add(key);

    if (errors.length > before) return;
    rows++;
    const list = listings.get(id) ?? [];
    list.push({
      marketplace: /** @type {Marketplace} */ (marketplace),
      url,
      priceIDR: Number(price),
      checkedAt: checked,
    });
    listings.set(id, list);
  });

  for (const list of listings.values())
    list.sort((a, b) => a.priceIDR - b.priceIDR);
  return { listings, errors, rows };
}

/**
 * What applying the listings would change, item by item, in words.
 * @param {{ id: string, listings?: Listing[] }[]} items
 * @param {Map<string, Listing[]>} listings
 * @returns {string[]}
 */
export function describeChanges(items, listings) {
  /** @type {string[]} */
  const out = [];
  const fmt = (/** @type {Listing} */ l) =>
    `${l.marketplace} Rp ${l.priceIDR.toLocaleString("id-ID")} (${l.checkedAt})`;
  for (const item of items) {
    const before = item.listings ?? [];
    const after = listings.get(item.id) ?? [];
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    if (!after.length)
      out.push(`- ${item.id}: removed ${before.length} listing(s)`);
    else if (!before.length)
      out.push(`+ ${item.id}: ${after.map(fmt).join(", ")}`);
    else out.push(`~ ${item.id}: ${after.map(fmt).join(", ")}`);
  }
  return out;
}
