import credits from "@/data/credits.json";
import models from "@/data/models.json";
import {
  ALLOWED_LICENCES,
  ATTRIBUTION_REQUIRED,
  modelUrl,
} from "@/scripts/model-rules.mjs";
import type { Category } from "@/types/parts";
import type { Tone, Vec3 } from "./layout";

/**
 * 3D models (Phase 14): data, not code. Each entry in data/models.json is one
 * model file; adding a model never needs a new component. See docs/models.md.
 */

export type ModelId = string;

/** "stretch" fills the item's box on every axis; "contain" keeps proportions. */
export type ModelFit = "stretch" | "contain";

export interface ModelSpec {
  id: ModelId;
  /** Where the site serves the compressed file. */
  url: string;
  /**
   * Where the model's own X, Y and Z axes point in the item's local space.
   * Applied before fitting to the item's dims.
   */
  basis: [Vec3, Vec3, Vec3];
  /** Source material name → palette tone. Anything not listed keeps its colour. */
  recolour: Record<string, Tone>;
  fit: ModelFit;
  /** Set (with a reason) when the model keeps its own textures. */
  keepTextures?: string;
  /** The category this is the default model for, if any. */
  defaultFor?: Category;
}

interface ModelEntry {
  id: string;
  basis: number[][];
  recolour?: Record<string, string>;
  fit?: string;
  keepTextures?: string;
  defaultFor?: string;
}

export const MODELS: Record<ModelId, ModelSpec> = Object.fromEntries(
  (models as unknown as ModelEntry[]).map((m) => [
    m.id,
    {
      id: m.id,
      url: modelUrl(m.id),
      basis: m.basis as ModelSpec["basis"],
      recolour: (m.recolour ?? {}) as Record<string, Tone>,
      fit: (m.fit ?? "stretch") as ModelFit,
      keepTextures: m.keepTextures,
      defaultFor: m.defaultFor as Category | undefined,
    },
  ]),
);

const DEFAULTS = new Map<string, ModelSpec>(
  Object.values(MODELS).flatMap((m) =>
    m.defaultFor ? [[m.defaultFor, m] as const] : [],
  ),
);

/**
 * Every model an item could show, best first: its own `modelId`, then its
 * category's default. If one fails to load the viewer tries the next, then falls
 * back to the procedural box. Empty when the item has no model at all.
 */
export function modelChain(item: {
  category: Category;
  modelId?: string;
}): ModelSpec[] {
  const own = item.modelId ? MODELS[item.modelId] : undefined;
  const fallback = DEFAULTS.get(item.category);
  return [own, fallback].filter(
    (m, i, all): m is ModelSpec => !!m && all.indexOf(m) === i,
  );
}

/** The model an item shows: product model, else category model, else null (the box). */
export function resolveModel(item: {
  category: Category;
  modelId?: string;
}): ModelSpec | null {
  return modelChain(item)[0] ?? null;
}

/** Self-hosted Draco decoder (copied by `npm run models`), so nothing loads from a CDN. */
export const DRACO_DECODER_PATH = "/draco/";

export { ALLOWED_LICENCES, ATTRIBUTION_REQUIRED };

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
