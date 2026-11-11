// npm run models:check <file.glb>: what you need to know about a source model
// before adding it: size, triangles, material names (for "recolour" in
// data/models.json), textures, bounding box, and its size after compression
// against the 400 KB budget. Reads the file only; writes nothing.
import { statSync } from "node:fs";
import { NodeIO, getBounds } from "@gltf-transform/core";
import {
  ALL_EXTENSIONS,
  KHRDracoMeshCompression,
} from "@gltf-transform/extensions";
import {
  dedup,
  draco,
  prune,
  textureCompress,
  weld,
} from "@gltf-transform/functions";
import draco3d from "draco3dgltf";
import sharp from "sharp";
import { FILE_BUDGET_BYTES } from "./model-rules.mjs";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run models:check -- models-src/<id>.glb");
  process.exit(1);
}

const io = new NodeIO()
  .registerExtensions([...ALL_EXTENSIONS, KHRDracoMeshCompression])
  .registerDependencies({
    "draco3d.encoder": await draco3d.createEncoderModule(),
    "draco3d.decoder": await draco3d.createDecoderModule(),
  });
const doc = await io.read(file);
const root = doc.getRoot();
const kb = (/** @type {number} */ n) => `${(n / 1000).toFixed(1)} KB`;

let triangles = 0;
for (const mesh of root.listMeshes())
  for (const prim of mesh.listPrimitives()) {
    const count =
      prim.getIndices()?.getCount() ??
      prim.getAttribute("POSITION")?.getCount() ??
      0;
    triangles += Math.floor(count / 3);
  }

const scene = root.getDefaultScene() ?? root.listScenes()[0];
const { min, max } = getBounds(scene);
const size = [0, 1, 2].map((i) => max[i] - min[i]);
const fmt = (/** @type {number[]} */ v) =>
  v.map((n) => n.toFixed(3)).join(" × ");

console.log(`\n${file}`);
console.log(`  file size     ${kb(statSync(file).size)}`);
console.log(`  meshes        ${root.listMeshes().length}`);
console.log(`  triangles     ${triangles.toLocaleString("en")}`);
console.log(
  `  bounding box  ${fmt(size)} (X × Y × Z, in metres; Y should be up)`,
);
console.log(
  `  bottom centre ${fmt([(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2])} (should be near 0 0 0)`,
);
console.log(`  materials     (names to use in "recolour")`);
for (const m of root.listMaterials())
  console.log(
    `    "${m.getName() || "(no name)"}"  colour ${m
      .getBaseColorFactor()
      .slice(0, 3)
      .map((c) => Math.round(c * 255))
      .join(",")}${m.getBaseColorTexture() ? "  + texture" : ""}`,
  );
const textures = root.listTextures();
console.log(`  textures      ${textures.length || "none"}`);
for (const t of textures) {
  const [w, h] = t.getSize() ?? [0, 0];
  console.log(
    `    ${t.getName() || t.getURI() || "(unnamed)"}  ${w} × ${h} ${t.getMimeType()}  ${kb(t.getImage()?.byteLength ?? 0)}${Math.max(w, h) > 1024 ? "  (will be resized to 1024 px)" : ""}`,
  );
}

// A trial run of what `npm run models` does, in memory.
if (textures.length)
  await doc.transform(
    textureCompress({
      encoder: sharp,
      targetFormat: "webp",
      resize: [1024, 1024],
    }),
  );
await doc.transform(dedup(), prune(), weld(), draco());
const built = (await io.writeBinary(doc)).byteLength;
const over = built > FILE_BUDGET_BYTES;
console.log(
  `  compressed    ${kb(built)} of the ${kb(FILE_BUDGET_BYTES)} budget  ${over ? "✗ OVER BUDGET: simplify it in Blender (Decimate) or shrink its textures" : "✓ within budget"}`,
);
console.log("");
process.exit(over ? 1 : 0);
