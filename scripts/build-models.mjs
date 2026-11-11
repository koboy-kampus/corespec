// npm run models: builds every model listed in data/models.json from its source
// in models-src/ into public/models/<id>.glb (dedup, prune, weld, textures resized
// to 1024 px WebP, Draco), and copies three.js's Draco decoder into public/draco/
// so nothing loads from a CDN.
//
// It stops with a clear message, before writing anything, on a missing credit, a
// licence that isn't allowed, a missing or unlisted source file; and after
// building, on a file over 400 KB or a heaviest build over 2.5 MB.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  prune,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import sharp from "sharp";
import { checkModels, checkSizes, modelUrl } from "./model-rules.mjs";

const root = join(import.meta.dirname, "..");
const SRC = join(root, "models-src");
const OUT = join(root, "public/models");
const DECODER_SRC = join(
  root,
  "node_modules/three/examples/jsm/libs/draco/gltf",
);
const DECODER_OUT = join(root, "public/draco");

const readJson = (/** @type {string} */ p) =>
  JSON.parse(readFileSync(join(root, p), "utf8"));
const models = readJson("data/models.json");
const credits = readJson("data/credits.json");
const items = ["data/parts", "data/setup"].flatMap((d) =>
  readdirSync(join(root, d))
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => readJson(join(d, f))),
);
const categories = [...new Set(items.map((i) => i.category))];

/** @param {string[]} errors */
function stop(errors) {
  console.error(`\n✗ npm run models: ${errors.length} problem(s).\n`);
  for (const e of errors) console.error(`  ${e}`);
  console.error("\nSee docs/models.md.\n");
  process.exit(1);
}

// 1. Check the data before touching any file.
const errors = checkModels(models, credits, categories);
const listed = new Set(models.map((/** @type {{file: string}} */ m) => m.file));
for (const m of models)
  if (!existsSync(join(root, m.file)))
    errors.push(`models.json "${m.id}": source ${m.file} doesn't exist`);
for (const f of readdirSync(SRC).filter((f) => f.endsWith(".glb")))
  if (!listed.has(`models-src/${f}`))
    errors.push(
      `models-src/${f} isn't in data/models.json (add an entry, or delete the file)`,
    );
for (const item of items)
  if (
    item.modelId &&
    !models.some((/** @type {{id: string}} */ m) => m.id === item.modelId)
  )
    errors.push(
      `${item.id}: modelId "${item.modelId}" isn't in data/models.json`,
    );
if (errors.length) stop(errors);

// 2. Build.
const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    "draco3d.encoder": await draco3d.createEncoderModule(),
    "draco3d.decoder": await draco3d.createDecoderModule(),
  });

mkdirSync(OUT, { recursive: true });
/** @type {Record<string, number>} */
const bytes = {};
for (const m of models) {
  const doc = await io.read(join(root, m.file));
  if (doc.getRoot().listTextures().length > 0)
    await doc.transform(
      textureCompress({
        encoder: sharp,
        targetFormat: "webp",
        resize: [1024, 1024],
      }),
    );
  await doc.transform(dedup(), prune(), weld(), draco());
  const out = join(root, "public", modelUrl(m.id));
  await io.write(out, doc);
  bytes[m.id] = statSync(out).size;
  console.log(
    `${m.file} → public${modelUrl(m.id)}  ${statSync(join(root, m.file)).size} → ${bytes[m.id]} bytes`,
  );
}

// Built files nobody lists any more would still be downloadable: remove them.
for (const f of readdirSync(OUT))
  if (!models.some((/** @type {{id: string}} */ m) => `${m.id}.glb` === f)) {
    rmSync(join(OUT, f));
    console.log(`removed public/models/${f} (not in data/models.json)`);
  }

const sizeErrors = checkSizes(models, bytes, items);
if (sizeErrors.length) stop(sizeErrors);

mkdirSync(DECODER_OUT, { recursive: true });
// WebAssembly build only: every browser we target supports it, so the ~500 KB
// plain-JS fallback decoder is left out.
for (const f of ["draco_decoder.wasm", "draco_wasm_wrapper.js"]) {
  copyFileSync(join(DECODER_SRC, f), join(DECODER_OUT, f));
}
console.log(`Draco decoder copied to public/draco/`);
console.log("\n✓ Models built. Now run npm test.");
