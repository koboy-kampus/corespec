// npm run prices:apply: reads data/price-check.csv (Rei's hand-checked prices),
// checks every row, and writes the listings into data/parts and data/setup.
// The CSV is the whole truth: an item with no filled row ends up with no listings.
// Nothing is written when any row is bad, or when a checked price is more than 40%
// away from the item's estimate (unless run with --force). Never fetches a marketplace.
//   npm run prices:apply [-- --force] [-- path/to/file.csv]
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";
import {
  MAX_PRICE_GAP,
  describeChanges,
  priceGapWarnings,
  readPriceCsv,
} from "./price-csv.mjs";

const root = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const force = args.includes("--force");
const csvPath =
  args.find((a) => !a.startsWith("--")) ?? join(root, "data/price-check.csv");
const dirs = ["data/parts", "data/setup"].map((d) => join(root, d));

const files = dirs.flatMap((d) =>
  readdirSync(d)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const path = join(d, f);
      return { path, items: JSON.parse(readFileSync(path, "utf8")) };
    }),
);
const items = files.flatMap((f) => f.items);
const knownIds = new Set(items.map((i) => i.id));

const { listings, errors, rows } = readPriceCsv(
  readFileSync(csvPath, "utf8"),
  knownIds,
);

if (errors.length) {
  console.error(
    `\n✗ ${csvPath}: ${errors.length} bad row${errors.length > 1 ? "s" : ""}. Nothing was written.\n`,
  );
  for (const e of errors) console.error(`  ${e}`);
  console.error("");
  process.exit(1);
}

const gaps = priceGapWarnings(items, listings);
if (gaps.length) {
  const pct = Math.round(MAX_PRICE_GAP * 100);
  console.warn(
    `\n⚠ ${gaps.length} checked price${gaps.length > 1 ? "s are" : " is"} more than ${pct}% away from the estimate. Wrong model, size or bundle?\n`,
  );
  for (const g of gaps) console.warn(`  ${g}`);
  if (!force) {
    console.error(
      "\n✗ Nothing was written. Fix the row, or if the price really is right, run:\n  npm run prices:apply -- --force\n",
    );
    process.exit(1);
  }
  console.warn("\n--force: writing anyway.\n");
}

const changes = describeChanges(items, listings);
if (!changes.length) {
  console.log(`✓ ${rows} checked listing(s); the data already matches.`);
  process.exit(0);
}

for (const file of files) {
  let touched = false;
  for (const item of file.items) {
    const next = listings.get(item.id) ?? [];
    const before = JSON.stringify(item.listings ?? []);
    if (before === JSON.stringify(next)) continue;
    touched = true;
    if (next.length) item.listings = next;
    else delete item.listings;
  }
  if (touched) {
    // Indented first: prettier keeps objects expanded the way the files have them.
    const json = await format(JSON.stringify(file.items, null, 2), {
      parser: "json",
    });
    writeFileSync(file.path, json);
  }
}

console.log(`✓ ${rows} checked listing(s). Changed:`);
for (const c of changes) console.log(`  ${c}`);
console.log("\nRun npm test, then commit data/ and data/price-check.csv.");
