import credits from "@/data/credits.json";
import models from "@/data/models.json";
import {
  ALLOWED_LICENCES,
  ATTRIBUTION_REQUIRED,
  matchesRule,
  modelUrl,
} from "@/scripts/model-rules.mjs";
import type { Category } from "@/types/parts";
import type { DeskTone } from "./desk-layout";
import type { Tone, Vec3 } from "./layout";

/**
 * 3D models (Phase 14): data, not code. Each entry in data/models.json is one
 * model file; adding a model never needs a new component. See docs/models.md.
 */

export type ModelId = string;

/** "stretch" fills the item's box on every axis; "contain" keeps proportions. */
export type ModelFit = "stretch" | "contain";

/** A palette tone a model's material can take: a PC tone or a desk-view tone. */
export type ModelTone = Tone | DeskTone;

/**
 * Where an item is drawn, when that changes its model: "on-arm" is a monitor
 * hanging on a monitor arm (drawn without its stand).
 */
export type ModelPlacement = "on-arm";

/** The two 3D views. A model can be limited to one (`views` in data/models.json). */
export type ModelView = "pc" | "desk";
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
  recolour: Record<string, ModelTone>;
  fit: ModelFit;
  /** Set (with a reason) when the model keeps its own textures. */
  keepTextures?: string;
  /** The category this is the default model for, if any. */
  defaultFor?: Category;
  /**
   * A variant of its category's model (Phase 19): used for the items whose
   * fields equal `match` (e.g. { adjustable: true }), or for a `layout`
   * placement (a monitor on an arm), or both (a curved monitor on an arm).
   */
  variantFor?: Category;
  match?: Record<string, string | number | boolean>;
  layout?: ModelPlacement;
  /** The views it's drawn in; unset = both (the desk view's PC case: desk only). */
  views?: ModelView[];
}

interface ModelEntry {
  id: string;
  basis: number[][];
  recolour?: Record<string, string>;
  fit?: string;
  keepTextures?: string;
  defaultFor?: string;
  variantFor?: string;
  match?: Record<string, string | number | boolean>;
  layout?: string;
  views?: string[];
}

export const MODELS: Record<ModelId, ModelSpec> = Object.fromEntries(
  (models as unknown as ModelEntry[]).map((m) => [
    m.id,
    {
      id: m.id,
      url: modelUrl(m.id),
      basis: m.basis as ModelSpec["basis"],
      recolour: (m.recolour ?? {}) as Record<string, ModelTone>,
      fit: (m.fit ?? "stretch") as ModelFit,
      keepTextures: m.keepTextures,
      defaultFor: m.defaultFor as Category | undefined,
      variantFor: m.variantFor as Category | undefined,
      match: m.match,
      layout: m.layout as ModelPlacement | undefined,
      views: m.views as ModelView[] | undefined,
    },
  ]),
);

const DEFAULTS = new Map<string, ModelSpec>(
  Object.values(MODELS).flatMap((m) =>
    m.defaultFor ? [[m.defaultFor, m] as const] : [],
  ),
);

const VARIANTS = Object.values(MODELS).filter((m) => m.variantFor);

/** An item, as far as choosing its model goes. */
export type ModelItem = { category: Category; modelId?: string };

/**
 * The variant whose `match` the item's fields equal, if any (first in
 * models.json wins). Placement variants (`layout`) are left out.
 */
export function matchingVariant(item: ModelItem): ModelSpec | undefined {
  return VARIANTS.find(
    (m) =>
      m.variantFor === item.category &&
      !m.layout && // placement variants only apply where they're placed
      m.match &&
      matchesRule(item as unknown as Record<string, unknown>, m.match),
  );
}

/**
 * Every model an item could show, best first. If one fails to load the viewer
 * tries the next, then falls back to the procedural box. Empty when the item
 * has no model at all.
 *
 * - Placed somewhere with its own variant (a monitor on an arm): only that
 *   model, since the others would draw a stand the layout left out. A
 *   placement variant with a `match` (curved) beats one without.
 * - Otherwise: the item's own `modelId`, then the variant its fields match
 *   (data/models.json `match`), then its category's default.
 *
 * With a `view`, models limited to the other view are left out (the desk
 * view's PC case never shows in the PC view). Without one, all count.
 */
export function modelChain(
  item: ModelItem,
  placement?: ModelPlacement,
  view?: ModelView,
): ModelSpec[] {
  const chain = anyViewChain(item, placement);
  return view ? chain.filter((m) => !m.views || m.views.includes(view)) : chain;
}

function anyViewChain(
  item: ModelItem,
  placement?: ModelPlacement,
): ModelSpec[] {
  if (placement) {
    const placed = VARIANTS.filter(
      (m) => m.variantFor === item.category && m.layout === placement,
    );
    // The most specific first: one whose `match` the item's fields equal (a
    // curved monitor on an arm), then one with no `match` (any monitor on an arm).
    const pick =
      placed.find(
        (m) =>
          m.match &&
          matchesRule(item as unknown as Record<string, unknown>, m.match),
      ) ?? placed.find((m) => !m.match);
    if (pick) return [pick];
  }
  const own = item.modelId ? MODELS[item.modelId] : undefined;
  const variant = matchingVariant(item);
  const fallback = DEFAULTS.get(item.category);
  return [own, variant, fallback].filter(
    (m, i, all): m is ModelSpec => !!m && all.indexOf(m) === i,
  );
}

/** The model an item shows: product model, else variant, else category model, else null (the box). */
export function resolveModel(
  item: ModelItem,
  placement?: ModelPlacement,
  view?: ModelView,
): ModelSpec | null {
  return modelChain(item, placement, view)[0] ?? null;
}

/** Materials that glow (a screen, a lamp): their look comes from the scene, not a finish. */
const GLOWING_TONES: ReadonlySet<string> = new Set(["screen", "light"]);

/** A material an item's finish can colour, and the palette tone it has otherwise. */
export type FinishMaterial = { name: string; tone: ModelTone };

/**
 * The materials an item's finish (Phase 19b) may name: those of every model it
 * can show, wherever it's placed (a monitor on an arm included), so a finish
 * still applies when the item moves. Glowing materials are left out. In the
 * order of the item's first model, then any the others add.
 */
export function finishMaterials(item: ModelItem): FinishMaterial[] {
  const out = new Map<string, ModelTone>();
  const placements: (ModelPlacement | undefined)[] = [undefined, "on-arm"];
  for (const placement of placements)
    for (const m of modelChain(item, placement))
      for (const [name, tone] of Object.entries(m.recolour))
        if (!GLOWING_TONES.has(tone) && !out.has(name)) out.set(name, tone);
  return [...out].map(([name, tone]) => ({ name, tone }));
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
