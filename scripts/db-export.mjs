// npm run db:export (Phase 16b): copies the catalogue from the database back
// into the repo — data/parts, data/setup, data/meta.json and
// data/price-check.csv — so the JSON fallback matches what admins saved. Run
// it, look at `git diff`, run `npm test`, commit.
//
// Reads with the public (publishable) key from .env.local: the catalogue is
// public, so no secret key is needed. Never prints the settings.
//   npm run db:export [-- --check]   (--check: report differences, write nothing)
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "prettier";
import { exportCatalogue, priceCsv } from "./db-export-lib.mjs";

const root = join(import.meta.dirname, "..");
const check = process.argv.includes("--check");
const envFile = join(root, ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error(
    "✗ NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set (in .env.local).",
  );
  process.exit(1);
}

/** @param {string} path */
async function get(path) {
  const headers = { apikey: key, Accept: "application/json" };
  // Legacy anon keys are JWTs and go in Authorization too; publishable keys don't.
  if (!key.startsWith("sb_")) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${path.split("?")[0]}: HTTP ${res.status}`);
  return res.json();
}

let items, listings, settings;
try {
  [items, listings, settings] = await Promise.all([
    get(
      "items?select=id,category,brand,name,tier,price_idr,dims,specs,model_id,active,position&limit=5000",
    ),
    get(
      "listings?select=item_id,marketplace,url,price_idr,checked_at&limit=20000",
    ),
    get("site_settings?select=key,value&key=eq.estimates_as_of"),
  ]);
} catch (e) {
  console.error(
    `✗ Couldn't read the database: ${e instanceof Error ? e.message : e}`,
  );
  process.exit(1);
}
if (!items.length) {
  console.error(
    "✗ The database has no items (seed not run?). Nothing written.",
  );
  process.exit(1);
}

const dirs = ["data/parts", "data/setup"];
/** @type {Map<string, string>} */
const pathOf = new Map();
/** @type {Map<string, Record<string, unknown>[]>} */
const current = new Map();
for (const d of dirs)
  for (const f of readdirSync(join(root, d)).filter((f) =>
    f.endsWith(".json"),
  )) {
    const path = join(root, d, f);
    const list = JSON.parse(readFileSync(path, "utf8"));
    const category = list[0]?.category ?? f.replace(/\.json$/, "");
    pathOf.set(category, path);
    current.set(category, list);
  }

const { files, onlyInJson } = exportCatalogue(items, listings, current);
/** @type {string[]} */
const changed = [];
/** @param {string} path @param {string} text */
const put = (path, text) => {
  if (readFileSync(path, "utf8") === text) return;
  changed.push(path.slice(root.length + 1));
  if (!check) writeFileSync(path, text);
};

for (const [category, list] of files)
  put(
    pathOf.get(category),
    await format(JSON.stringify(list, null, 2), { parser: "json" }),
  );

const metaPath = join(root, "data/meta.json");
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const asOf = settings[0]?.value;
if (typeof asOf === "string" && asOf !== meta.pricesAsOf)
  put(
    metaPath,
    await format(JSON.stringify({ ...meta, pricesAsOf: asOf }, null, 2), {
      parser: "json",
    }),
  );

const csvPath = join(root, "data/price-check.csv");
put(
  csvPath,
  priceCsv(readFileSync(csvPath, "utf8"), [...files.values()].flat()),
);

if (onlyInJson.length)
  console.warn(
    `⚠ ${onlyInJson.length} item(s) are only in the JSON, not the database (kept): ${onlyInJson.join(", ")}`,
  );
if (!changed.length) console.log("✓ The JSON already matches the database.");
else {
  console.log(
    `${check ? "Would change" : "✓ Changed"} ${changed.length} file(s):`,
  );
  for (const c of changed) console.log(`  ${c}`);
  if (!check)
    console.log("\nLook at git diff, run npm test, then commit data/.");
  else process.exitCode = 1;
}
