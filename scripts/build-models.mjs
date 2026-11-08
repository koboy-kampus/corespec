// Compresses the CC0 source models in models-src/ into public/models/ with Draco,
// and copies three.js's Draco decoder into public/draco/ so nothing loads from a CDN.
// Run: npm run models
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { KHRDracoMeshCompression } from "@gltf-transform/extensions";
import { dedup, draco, prune, weld } from "@gltf-transform/functions";
import draco3d from "draco3dgltf";

const SRC = "models-src";
const OUT = "public/models";
const DECODER_SRC = "node_modules/three/examples/jsm/libs/draco/gltf";
const DECODER_OUT = "public/draco";

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    "draco3d.encoder": await draco3d.createEncoderModule(),
    "draco3d.decoder": await draco3d.createDecoderModule(),
  });

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".glb"))) {
  const doc = await io.read(join(SRC, file));
  await doc.transform(dedup(), prune(), weld(), draco());
  // "cpu-ipoly3d.glb" → "cpu.glb": the app refers to models by what they are.
  const name = `${file.split("-")[0]}.glb`;
  await io.write(join(OUT, name), doc);
  const before = statSync(join(SRC, file)).size;
  const after = statSync(join(OUT, name)).size;
  console.log(`${file} → ${OUT}/${name}  ${before} → ${after} bytes`);
}

mkdirSync(DECODER_OUT, { recursive: true });
// WebAssembly build only: every browser we target supports it, so the ~500 KB
// plain-JS fallback decoder is left out.
for (const f of ["draco_decoder.wasm", "draco_wasm_wrapper.js"]) {
  copyFileSync(join(DECODER_SRC, f), join(DECODER_OUT, f));
}
console.log(`Draco decoder copied to ${DECODER_OUT}/`);
