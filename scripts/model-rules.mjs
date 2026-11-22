// The rules every 3D model must follow (Phase 14). Pure functions, shared by
// `npm run models` (scripts/build-models.mjs), the unit tests and the app
// (lib/viewer/models.ts), so the build and the tests can never disagree.

/** Licences we accept for models on the site (anything in public/ can be downloaded). */
export const ALLOWED_LICENCES = ["CC0 1.0", "CC BY 3.0", "CC BY 4.0"];

/** Licences that need a visible credit on /credits. */
export const ATTRIBUTION_REQUIRED = ["CC BY 3.0", "CC BY 4.0"];

/** One compressed model file (public/models/<id>.glb). */
export const FILE_BUDGET_BYTES = 400_000;

/** All models the heaviest possible build can load, PC and setup together. */
export const BUILD_BUDGET_BYTES = 2_500_000;

/** How a model fills its item's box. */
export const FITS = ["stretch", "contain"];

/** Palette tones a material can be recoloured to (lib/viewer/layout.ts `Tone`). */
export const TONES = [
  "pcb",
  "silver",
  "dark",
  "fin",
  "ram",
  "storage",
  "psu",
  "steel",
  "gold",
  "black",
];

/**
 * Desk-view tones (Phase 19, lib/viewer/desk-layout.ts `DeskTone`). A model may
 * use these too; in the PC view they fall back to their desk look.
 */
export const DESK_TONES = [
  "wood",
  "leg",
  "fabric",
  "mesh",
  "pad",
  "accent",
  "screen",
  "light",
  "glass",
  "rgb",
];

/**
 * The views a model can be limited to (`"views"` in data/models.json). Unset =
 * both. The desk view's PC case is "desk" only: the PC view draws the real parts.
 */
export const VIEWS = ["pc", "desk"];

/** Every tone a model's material may map to. */
export const MODEL_TONES = [...TONES, ...DESK_TONES];

/**
 * Variant models chosen by the desk layout rather than by an item's fields
 * (Phase 19): "on-arm" = a monitor hanging on an arm, drawn without its stand.
 */
export const LAYOUT_VARIANTS = ["on-arm"];

/**
 * True when an item has every field in `match` with exactly that value.
 * @param {Record<string, unknown>} item
 * @param {Record<string, string | number | boolean>} match
 */
export const matchesRule = (item, match) =>
  Object.entries(match).every(([k, v]) => item[k] === v);

/**
 * @typedef {{
 *   id: string,
 *   file: string,
 *   credit: string,
 *   basis: number[][],
 *   recolour?: Record<string, string>,
 *   fit?: string,
 *   keepTextures?: string,
 *   defaultFor?: string,
 *   variantFor?: string,
 *   match?: Record<string, string | number | boolean>,
 *   layout?: string,
 *   views?: string[],
 *   note?: string,
 * }} ModelEntry
 * @typedef {{ id: string, file: string, source: string, licence: string,
 *   author: string, url: string, licenceUrl: string, changes: string }} Credit
 */

/** Where the site serves a model from. */
export const modelUrl = (/** @type {string} */ id) => `/models/${id}.glb`;

const isAxis = (/** @type {unknown} */ v) =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every((n) => n === 0 || n === 1 || n === -1) &&
  v.filter((n) => n !== 0).length === 1;

/**
 * Everything wrong with data/models.json, as sentences naming the model and the
 * rule. Empty when all is well.
 * @param {ModelEntry[]} models
 * @param {Credit[]} credits
 * @param {string[]} categories every catalogue category
 * @returns {string[]}
 */
export function checkModels(models, credits, categories) {
  /** @type {string[]} */
  const errors = [];
  const seen = new Set();
  const defaults = new Map();
  for (const m of models) {
    const at = `models.json "${m.id ?? "?"}"`;
    const bad = (/** @type {string} */ msg) => errors.push(`${at}: ${msg}`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.id ?? ""))
      bad("id must be lowercase words joined by dashes, e.g. keyboard-tkl");
    if (seen.has(m.id)) bad("id is used twice");
    seen.add(m.id);
    if (m.file !== `models-src/${m.id}.glb`)
      bad(`file must be models-src/${m.id}.glb (got ${m.file})`);
    if (
      !Array.isArray(m.basis) ||
      m.basis.length !== 3 ||
      !m.basis.every(isAxis) ||
      new Set(m.basis.map((a) => a.findIndex((n) => n !== 0))).size !== 3
    )
      bad(
        "basis must be 3 axes like [[1,0,0],[0,1,0],[0,0,1]], each pointing a different way",
      );
    if (m.fit !== undefined && !FITS.includes(m.fit))
      bad(`fit must be one of ${FITS.join(", ")} (got "${m.fit}")`);
    for (const [name, tone] of Object.entries(m.recolour ?? {}))
      if (!MODEL_TONES.includes(tone))
        bad(`recolour "${name}" → "${tone}" is not a palette tone`);
    if (m.keepTextures !== undefined && !String(m.keepTextures).trim())
      bad("keepTextures needs a one-line reason");
    if (m.defaultFor !== undefined) {
      if (!categories.includes(m.defaultFor))
        bad(`defaultFor "${m.defaultFor}" is not a category`);
      else if (defaults.has(m.defaultFor))
        bad(
          `"${defaults.get(m.defaultFor)}" is already the default for ${m.defaultFor}`,
        );
      defaults.set(m.defaultFor, m.id);
    }
    if (m.variantFor !== undefined) {
      if (m.defaultFor !== undefined)
        bad("a model is either a category default or a variant, not both");
      if (!categories.includes(m.variantFor))
        bad(`variantFor "${m.variantFor}" is not a category`);
      const hasMatch = m.match !== undefined;
      const hasLayout = m.layout !== undefined;
      if (!hasMatch && !hasLayout)
        bad('a variant needs a "match", a "layout", or both');
      if (
        hasMatch &&
        (typeof m.match !== "object" ||
          m.match === null ||
          !Object.keys(m.match).length ||
          !Object.values(m.match).every((v) =>
            ["string", "number", "boolean"].includes(typeof v),
          ))
      )
        bad(
          'match must be field → value pairs, e.g. { "adjustable": true } or { "type": "Gaming" }',
        );
      if (
        hasLayout &&
        !LAYOUT_VARIANTS.includes(/** @type {string} */ (m.layout))
      )
        bad(`layout must be one of ${LAYOUT_VARIANTS.join(", ")}`);
    } else if (m.match !== undefined || m.layout !== undefined)
      bad('"match" and "layout" need "variantFor"');
    if (
      m.views !== undefined &&
      (!Array.isArray(m.views) ||
        !m.views.length ||
        new Set(m.views).size !== m.views.length ||
        !m.views.every((v) => VIEWS.includes(v)))
    )
      bad(
        `views must be a list of different views from ${VIEWS.join(", ")}, e.g. ["desk"] (leave it out for both)`,
      );

    const credit = credits.find((c) => c.id === m.credit);
    if (!credit) {
      bad(`credit "${m.credit}" is missing from data/credits.json`);
      continue;
    }
    if (!ALLOWED_LICENCES.includes(credit.licence))
      bad(
        `licence "${credit.licence}" is not allowed (only ${ALLOWED_LICENCES.join(", ")}; see docs/models.md)`,
      );
    if (credit.file !== modelUrl(m.id))
      bad(`its credit's file must be ${modelUrl(m.id)} (got ${credit.file})`);
    if (credit.source !== m.file)
      bad(`its credit's source must be ${m.file} (got ${credit.source})`);
    if (!/^https:\/\//.test(credit.url ?? ""))
      bad("its credit needs the https:// page it came from");
    if (ATTRIBUTION_REQUIRED.includes(credit.licence)) {
      if (!credit.author?.trim()) bad(`${credit.licence} needs the author`);
      if (
        !/^https:\/\/creativecommons\.org\/licenses\/by\//.test(
          credit.licenceUrl ?? "",
        )
      )
        bad(`${credit.licence} needs the licence URL`);
      if (!credit.changes?.trim())
        bad(`${credit.licence} needs a note of what was changed`);
    }
  }
  return errors;
}

/**
 * Size problems: any file over FILE_BUDGET_BYTES, and the heaviest possible build
 * (the largest reachable model per category, each file counted once) over
 * BUILD_BUDGET_BYTES.
 * @param {ModelEntry[]} models
 * @param {Record<string, number>} bytes compressed size per model id
 * @param {{ category: string, modelId?: string }[]} items the catalogue
 * @returns {string[]}
 */
export function checkSizes(models, bytes, items) {
  /** @type {string[]} */
  const errors = [];
  const kb = (/** @type {number} */ n) => `${Math.round(n / 1000)} KB`;
  for (const m of models) {
    const size = bytes[m.id];
    if (size === undefined)
      errors.push(
        `models.json "${m.id}": ${modelUrl(m.id)} hasn't been built (run npm run models)`,
      );
    else if (size > FILE_BUDGET_BYTES)
      errors.push(
        `models.json "${m.id}": ${modelUrl(m.id)} is ${kb(size)}, over the ${kb(FILE_BUDGET_BYTES)} budget per model. Simplify it in Blender (Decimate) or shrink its textures.`,
      );
  }
  const total = heaviestBuildBytes(models, bytes, items);
  if (total > BUILD_BUDGET_BYTES)
    errors.push(
      `the heaviest possible build loads ${kb(total)} of models, over the ${kb(BUILD_BUDGET_BYTES)} budget`,
    );
  return errors;
}

/**
 * Bytes of models the heaviest build would load: per category, the largest model
 * any of its items can show (its own, a variant or the category default). For
 * speakers the one file draws both, so it's counted once like any other.
 * @param {ModelEntry[]} models
 * @param {Record<string, number>} bytes
 * @param {{ category: string, modelId?: string }[]} items
 */
export function heaviestBuildBytes(models, bytes, items) {
  /** @type {Map<string, number>} */
  const perCategory = new Map();
  const size = (/** @type {string | undefined} */ id) =>
    id ? (bytes[id] ?? 0) : 0;
  for (const m of models) {
    const category = m.defaultFor ?? m.variantFor;
    if (category)
      perCategory.set(
        category,
        Math.max(perCategory.get(category) ?? 0, size(m.id)),
      );
  }
  for (const item of items)
    if (item.modelId)
      perCategory.set(
        item.category,
        Math.max(perCategory.get(item.category) ?? 0, size(item.modelId)),
      );
  return [...perCategory.values()].reduce((a, b) => a + b, 0);
}
