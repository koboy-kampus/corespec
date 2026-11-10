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

export const PRICES_AS_OF: string = metaJson.pricesAsOf;

/** Live catalogue size, e.g. for "64 parts across 8 categories". */
export const CATALOG_STATS = {
  parts: ALL_PARTS.length,
  categories: Object.keys(CATALOG).length,
  setupItems: ALL_SETUP.length,
  setupCategories: Object.keys(SETUP_CATALOG).length,
};

/** Any catalogue item, PC part or setup item. */
export function getItem(id: string | undefined): Item | undefined {
  return id ? byId.get(id) : undefined;
}

/** A PC part only (setup items return undefined). */
export function getPart(id: string | undefined): Part | undefined {
  const item = getItem(id);
  return item && isPcCategory(item.category) ? (item as Part) : undefined;
}

export function getPartsByCategory<K extends Category>(
  category: K,
): ItemByCategory[K][] {
  const all: { [C in Category]: ItemByCategory[C][] } = {
    ...CATALOG,
    ...SETUP_CATALOG,
  };
  return all[category];
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

const sum = (items: Item[]) => items.reduce((s, p) => s + p.priceIDR, 0);

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

/** "AMD Ryzen 5 7600" */
export function partLabel(part: Item): string {
  return `${part.brand} ${part.name}`;
}
