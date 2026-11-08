// Compresses the CC0 source models in models-src/ into public/models/ with Draco,
// and copies three.js's Draco decoder into public/draco/ so nothing loads from a CDN.
// Run: npm run models
import { copyFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
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

const SRC = "models-src";
const OUT = "public/models";
const DECODER_SRC = "node_modules/three/examples/jsm/libs/draco/gltf";
const DECODER_OUT = "public/draco";
const BUDGET_BYTES = 1_000_000; // per model

const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({
    "draco3d.encoder": await draco3d.createEncoderModule(),
    "draco3d.decoder": await draco3d.createDecoderModule(),
  });

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".glb"))) {
  const doc = await io.read(join(SRC, file));
  // Textures (none in today's models) are capped at 1024 px before compression.
  // Resizing needs the optional "sharp" package; we only ask for it if it's needed.
  if (doc.getRoot().listTextures().length > 0) {
    const sharp = await import("sharp").catch(() => {
      throw new Error(
        `${file} has textures: run "npm i -D sharp" to resize them.`,
      );
    });
    await doc.transform(
      textureCompress({ encoder: sharp.default, resize: [1024, 1024] }),
    );
  }
  await doc.transform(dedup(), prune(), weld(), draco());
  // "cpu-ipoly3d.glb" → "cpu.glb": the app refers to models by what they are.
  const name = `${file.split("-")[0]}.glb`;
  await io.write(join(OUT, name), doc);
  const before = statSync(join(SRC, file)).size;
  const after = statSync(join(OUT, name)).size;
  console.log(`${file} → ${OUT}/${name}  ${before} → ${after} bytes`);
  if (after > BUDGET_BYTES) {
    throw new Error(
      `${name} is ${after} bytes, over the ${BUDGET_BYTES} byte budget.`,
    );
  }
}

mkdirSync(DECODER_OUT, { recursive: true });
// WebAssembly build only: every browser we target supports it, so the ~500 KB
// plain-JS fallback decoder is left out.
for (const f of ["draco_decoder.wasm", "draco_wasm_wrapper.js"]) {
  copyFileSync(join(DECODER_SRC, f), join(DECODER_OUT, f));
}
console.log(`Draco decoder copied to ${DECODER_OUT}/`);
