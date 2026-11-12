import caseJson from "@/data/parts/case.json";
import coolerJson from "@/data/parts/cooler.json";
import cpuJson from "@/data/parts/cpu.json";
import gpuJson from "@/data/parts/gpu.json";
import metaJson from "@/data/meta.json";
import motherboardJson from "@/data/parts/motherboard.json";
import psuJson from "@/data/parts/psu.json";
import ramJson from "@/data/parts/ram.json";
import storageJson from "@/data/parts/storage.json";
import monitorJson from "@/data/setup/monitor.json";
import keyboardJson from "@/data/setup/keyboard.json";
import mouseJson from "@/data/setup/mouse.json";
import headsetJson from "@/data/setup/headset.json";
import mousepadJson from "@/data/setup/mousepad.json";
import speakersJson from "@/data/setup/speakers.json";
import webcamJson from "@/data/setup/webcam.json";
import microphoneJson from "@/data/setup/microphone.json";
import chairJson from "@/data/setup/chair.json";
import deskJson from "@/data/setup/desk.json";
import armJson from "@/data/setup/arm.json";
import lightingJson from "@/data/setup/lighting.json";
import { isPcCategory } from "@/lib/categories";
import { newestCheck, shownPrice } from "@/lib/prices";
import {
  subscribeOverlay,
  type CatalogueOverlay,
} from "@/lib/catalogue/overlay-channel";
import type {
  Build,
  Category,
  Item,
  ItemByCategory,
  Part,
  PartByCategory,
  PcCategory,
  ResolvedBuild,
  ResolvedSetup,
  SetupByCategory,
  SetupCategory,
  SetupItem,
} from "@/types/parts";

/**
 * The parts catalogue. JSON imports type string fields loosely (e.g. category: string),
 * so each file is cast to its part type here; lib/data.test.ts checks the data at runtime.
 */
export const CATALOG: { [K in PcCategory]: PartByCategory[K][] } = {
  cpu: cpuJson as PartByCategory["cpu"][],
  motherboard: motherboardJson as PartByCategory["motherboard"][],
  ram: ramJson as PartByCategory["ram"][],
  gpu: gpuJson as PartByCategory["gpu"][],
  storage: storageJson as PartByCategory["storage"][],
  psu: psuJson as PartByCategory["psu"][],
  case: caseJson as PartByCategory["case"][],
  cooler: coolerJson as PartByCategory["cooler"][],
};

/** Setup items (Phase 10), cast the same way and checked in lib/data.test.ts. */
export const SETUP_CATALOG: { [K in SetupCategory]: SetupByCategory[K][] } = {
  monitor: monitorJson as SetupByCategory["monitor"][],
  keyboard: keyboardJson as SetupByCategory["keyboard"][],
  mouse: mouseJson as SetupByCategory["mouse"][],
  headset: headsetJson as SetupByCategory["headset"][],
  mousepad: mousepadJson as SetupByCategory["mousepad"][],
  speakers: speakersJson as SetupByCategory["speakers"][],
  webcam: webcamJson as SetupByCategory["webcam"][],
  microphone: microphoneJson as SetupByCategory["microphone"][],
  chair: chairJson as SetupByCategory["chair"][],
  desk: deskJson as SetupByCategory["desk"][],
  arm: armJson as SetupByCategory["arm"][],
  lighting: lightingJson as SetupByCategory["lighting"][],
};

/** Every PC part. */
export const ALL_PARTS: Part[] = Object.values(CATALOG).flat();
/** Every setup item. */
export const ALL_SETUP: SetupItem[] = Object.values(SETUP_CATALOG).flat();
/** Everything in the catalogue. */
export const ALL_ITEMS: Item[] = [...ALL_PARTS, ...ALL_SETUP];

const byId = new Map<string, Item>(ALL_ITEMS.map((p) => [p.id, p]));

// The `let` exports below are live bindings: applying a database overlay
// (applyCatalogueOverlay, Phase 16b) updates them for every importer.

/** When the estimates (`priceIDR`) were last updated: data/meta.json, or the database's setting. */
export let ESTIMATES_AS_OF: string = metaJson.pricesAsOf;
/** The newest marketplace check, when any listing has been checked. */
export let NEWEST_CHECK: string | undefined = newestCheck(ALL_ITEMS);
/**
 * The date prices are "as of": the newest checked listing when there is one,
 * otherwise the estimates' date.
 */
export let PRICES_AS_OF: string = NEWEST_CHECK ?? ESTIMATES_AS_OF;
/** Goes up by one every time an overlay changes the catalogue (for caches keyed on it). */
export let catalogueVersion = 0;

/** Live catalogue size, e.g. for "64 parts across 8 categories". */
export const CATALOG_STATS = {
  parts: ALL_PARTS.length,
  categories: Object.keys(CATALOG).length,
  setupItems: ALL_SETUP.length,
  setupCategories: Object.keys(SETUP_CATALOG).length,
};

/**
 * Phase 16b: puts the database's differences (lib/catalogue/rows.ts
 * diffCatalogue) over the JSON. Items are updated in place, so everything
 * holding one (presets, resolved builds) sees the change. An item no longer in
 * the overlay goes back to its JSON version; null restores the JSON exactly.
 * Applying the same overlay again does nothing.
 */
let appliedKey: string | null = null;
let pristine: Map<string, Item> | null = null;
const PRISTINE_AS_OF = metaJson.pricesAsOf;

function replaceInPlace(target: Item, source: Item) {
  const t = target as unknown as Record<string, unknown>;
  for (const k of Object.keys(t)) if (!(k in source)) delete t[k];
  Object.assign(t, structuredClone(source));
}

export function applyCatalogueOverlay(overlay: CatalogueOverlay | null): void {
  const key = overlay?.key ?? null;
  if (key === appliedKey) return;
  pristine ??= new Map(ALL_ITEMS.map((i) => [i.id, structuredClone(i)]));

  const next = new Map(overlay?.items.map((i) => [i.id, i]));
  for (const item of ALL_ITEMS) {
    const source = next.get(item.id) ?? pristine.get(item.id);
    next.delete(item.id);
    if (source && source.category === item.category)
      replaceInPlace(item, source);
    // An item an earlier overlay added that's gone from this one: out of the picker.
    else if (!source) (item as { active?: false }).active = false;
  }
  for (const source of next.values()) {
    const item = structuredClone(source);
    const list = (
      isPcCategory(item.category)
        ? CATALOG[item.category]
        : SETUP_CATALOG[item.category]
    ) as Item[];
    list.push(item);
    (isPcCategory(item.category)
      ? (ALL_PARTS as Item[])
      : (ALL_SETUP as Item[])
    ).push(item);
    ALL_ITEMS.push(item);
    byId.set(item.id, item);
  }

  ESTIMATES_AS_OF = overlay?.estimatesAsOf ?? PRISTINE_AS_OF;
  NEWEST_CHECK = newestCheck(ALL_ITEMS);
  PRICES_AS_OF = NEWEST_CHECK ?? ESTIMATES_AS_OF;
  CATALOG_STATS.parts = ALL_PARTS.length;
  CATALOG_STATS.setupItems = ALL_SETUP.length;
  appliedKey = key;
  catalogueVersion++;
}

subscribeOverlay(applyCatalogueOverlay);

/** The catalogue exactly as data/ has it, whatever overlay is applied. */
export function jsonCatalogue(): Item[] {
  return pristine ? [...pristine.values()] : ALL_ITEMS.slice();
}
/** data/meta.json's "estimates as of", whatever overlay is applied. */
export const JSON_ESTIMATES_AS_OF: string = PRISTINE_AS_OF;

/** Any catalogue item, PC part or setup item. */
export function getItem(id: string | undefined): Item | undefined {
  return id ? byId.get(id) : undefined;
}

/** A PC part only (setup items return undefined). */
export function getPart(id: string | undefined): Part | undefined {
  const item = getItem(id);
  return item && isPcCategory(item.category) ? (item as Part) : undefined;
}

/** Everything in one category, including items taken out of the picker. */
export function getPartsByCategory<K extends Category>(
  category: K,
): ItemByCategory[K][] {
  const all: { [C in Category]: ItemByCategory[C][] } = {
    ...CATALOG,
    ...SETUP_CATALOG,
  };
  return all[category];
}

/** What the picker offers: the category without the items an admin took out. */
export function getPickableByCategory<K extends Category>(
  category: K,
): ItemByCategory[K][] {
  return getPartsByCategory(category).filter((i) => i.active !== false);
}

/** Items for the given slots, skipping unknown ids or ids filed under the wrong slot. */
function resolveWhere(
  parts: Build["parts"],
  keep: (c: Category) => boolean,
): Record<string, Item> {
  const resolved: Record<string, Item> = {};
  for (const [category, id] of Object.entries(parts) as [Category, string][]) {
    if (!keep(category)) continue;
    const item = getItem(id);
    if (item && item.category === category) resolved[category] = item;
  }
  return resolved;
}

/** The PC half: swap part ids for part objects. Setup slots are left out. */
export function resolveBuild(parts: Build["parts"]): ResolvedBuild {
  return resolveWhere(parts, isPcCategory) as ResolvedBuild;
}

/** The setup half, resolved the same way. */
export function resolveSetup(parts: Build["parts"]): ResolvedSetup {
  return resolveWhere(parts, (c) => !isPcCategory(c)) as ResolvedSetup;
}

/** Adds up what's shown: checked prices where there are any, estimates otherwise. */
const sum = (items: Item[]) => items.reduce((s, p) => s + shownPrice(p), 0);

/** PC subtotal, setup subtotal and their total, in integer rupiah. */
export function buildTotals(parts: Build["parts"]) {
  const pcIDR = sum(Object.values(resolveBuild(parts)));
  const setupIDR = sum(Object.values(resolveSetup(parts)));
  return { pcIDR, setupIDR, totalIDR: pcIDR + setupIDR };
}

/** Sum of everything chosen (PC and setup), in integer rupiah. */
export function buildTotalIDR(parts: Build["parts"]): number {
  return buildTotals(parts).totalIDR;
}

export { partLabel } from "@/lib/labels";
