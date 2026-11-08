import credits from "@/data/credits.json";
import type { Vec3 } from "./layout";

/**
 * 3D models that replace a part's placeholder box. Each one must be listed in
 * data/credits.json with a licence that allows use (tests enforce this).
 * Parts without a model keep their procedural boxes.
 */
export type ModelId = "cpu" | "ram";

export interface ModelSpec {
  url: string;
  /**
   * Where the model's own X, Y and Z axes point in the part's local space
   * (x = depth, y = height, z = out of the board). Used before scaling to the part's dims.
   */
  basis: [Vec3, Vec3, Vec3];
}

export const MODELS: Record<ModelId, ModelSpec> = {
  // Lies flat in the model's XY plane, heat spreader facing +Z: same as a CPU on the board.
  cpu: {
    url: "/models/cpu.glb",
    basis: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
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
  },
};

/** Self-hosted Draco decoder (copied by `npm run models`), so nothing loads from a CDN. */
export const DRACO_DECODER_PATH = "/draco/";

/** Licences we accept for bundled models. */
export const ALLOWED_LICENCES = ["CC0 1.0"];

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
