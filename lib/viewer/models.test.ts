import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BoxGeometry, Box3, Group, Mesh, MeshStandardMaterial } from "three";
import { describe, expect, it } from "vitest";
import { fitModel } from "./fit-model";
import { ALLOWED_LICENCES, CREDITS, MODELS } from "./models";

const pub = (url: string) => join(process.cwd(), "public", url);

describe("bundled 3D models", () => {
  it("has a credit with an allowed licence for every model the app loads", () => {
    for (const spec of Object.values(MODELS)) {
      const credit = CREDITS.find((c) => c.file === spec.url);
      expect(credit, spec.url).toBeDefined();
      expect(ALLOWED_LICENCES).toContain(credit?.licence);
      expect(existsSync(pub(spec.url)), spec.url).toBe(true);
    }
  });

  it("credits every file in public/models and keeps its source", () => {
    const files = readdirSync(join(process.cwd(), "public/models"));
    for (const f of files) {
      const credit = CREDITS.find((c) => c.file === `/models/${f}`);
      expect(credit, f).toBeDefined();
      expect(existsSync(join(process.cwd(), credit?.source ?? "")), f).toBe(
        true,
      );
      expect(credit?.url).toMatch(/^https:\/\//);
    }
  });

  it("ships the self-hosted Draco decoder", () => {
    expect(existsSync(pub("/draco/draco_decoder.wasm"))).toBe(true);
    expect(existsSync(pub("/draco/draco_wasm_wrapper.js"))).toBe(true);
  });
});

describe("fitModel", () => {
  it("rotates with the basis, then fills the target box exactly", () => {
    const root = new Group();
    const m = new Mesh(
      new BoxGeometry(50, 11, 1),
      new MeshStandardMaterial({ name: "Green" }),
    );
    m.position.set(3, 4, 5); // off-centre in the source file
    root.add(m);

    // Stick length (x) → part y, height (y) → part z, thickness (z) → part x.
    const fitted = fitModel(root, MODELS.ram.basis, [7, 133, 35]);
    expect(fitted).toHaveLength(1);
    expect(fitted[0].materialName).toBe("Green");

    fitted[0].geometry.computeBoundingBox();
    const box = fitted[0].geometry.boundingBox ?? new Box3();
    const size = box.max.clone().sub(box.min).toArray();
    [7, 133, 35].forEach((v, i) => expect(size[i]).toBeCloseTo(v));
    const centre = box.min.clone().add(box.max).multiplyScalar(0.5).toArray();
    centre.forEach((v) => expect(v).toBeCloseTo(0));
  });
});
