import credits from "@/data/credits.json";
import type { Tone, Vec3 } from "./layout";

/**
 * 3D models that replace a part's placeholder box. Each one must be listed in
 * data/credits.json with a licence that allows use (tests enforce this).
 * Parts without a model keep their procedural boxes.
 */
export type ModelId = "cpu" | "ram" | "gpu";

export interface ModelSpec {
  url: string;
  /**
   * Where the model's own X, Y and Z axes point in the part's local space
   * (x = depth, y = height, z = out of the board). Used before scaling to the part's dims.
   */
  basis: [Vec3, Vec3, Vec3];
  /**
   * Re-materials the model to the CoreSpec palette: source material name → tone.
   * Anything not listed keeps its original colour.
   */
  recolour: Record<string, Tone>;
}

// iPoly3D's models share the same three material names.
const IPOLY3D: Record<string, Tone> = {
  Green: "pcb",
  black: "black",
  conduct: "gold",
};

export const MODELS: Record<ModelId, ModelSpec> = {
  // Lies flat in the model's XY plane, heat spreader facing +Z: same as a CPU on the board.
  cpu: {
    url: "/models/cpu.glb",
    basis: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    recolour: IPOLY3D,
  },
  // Model: X = stick length, Y = stick height, Z = thickness.
  // Part: length runs along y, height sticks out of the board (z), thickness along x.
  ram: {
    url: "/models/ram.glb",
    basis: [
      [0, 1, 0],
      [0, 0, 1],
      [1, 0, 0],
    ],
    recolour: IPOLY3D,
  },
  // Model: X = length with the I/O bracket at -X, Y = height with the PCIe fingers
  // at -Y, Z = thickness with the fans on +Z. Part: bracket at +x (rear), fingers
  // toward the board (-z), fans facing down (-y). That mapping is a mirror, which
  // fitModel handles by flipping the triangle winding.
  gpu: {
    url: "/models/gpu.glb",
    basis: [
      [-1, 0, 0],
      [0, 0, 1],
      [0, -1, 0],
    ],
    recolour: {
      "Material.003": "black", // fans
      "Material.002": "silver", // I/O bracket
      "Material.001": "pcb", // PCIe edge
      "Material.005": "gold", // contacts
      "Material.004": "steel", // shroud frame
      Material: "dark", // shroud panels
    },
  },
};

/** Self-hosted Draco decoder (copied by `npm run models`), so nothing loads from a CDN. */
export const DRACO_DECODER_PATH = "/draco/";

/** Licences we accept for bundled models. */
export const ALLOWED_LICENCES = ["CC0 1.0", "CC BY 3.0"];

/** Licences that need a visible credit (shown on the Credits page in Phase 8). */
export const ATTRIBUTION_REQUIRED = ["CC BY 3.0"];

export interface Credit {
  id: string;
  file: string;
  source: string;
  usedFor: string;
  title: string;
  author: string;
  url: string;
  licence: string;
  licenceUrl: string;
  changes: string;
}

export const CREDITS: Credit[] = credits;
