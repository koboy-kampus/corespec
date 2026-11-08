import caseJson from "@/data/parts/case.json";
import coolerJson from "@/data/parts/cooler.json";
import cpuJson from "@/data/parts/cpu.json";
import gpuJson from "@/data/parts/gpu.json";
import metaJson from "@/data/meta.json";
import motherboardJson from "@/data/parts/motherboard.json";
import psuJson from "@/data/parts/psu.json";
import ramJson from "@/data/parts/ram.json";
import storageJson from "@/data/parts/storage.json";
import type {
  Build,
  Category,
  Part,
  PartByCategory,
  ResolvedBuild,
} from "@/types/parts";

/**
 * The parts catalogue. JSON imports type string fields loosely (e.g. category: string),
 * so each file is cast to its part type here; lib/data.test.ts checks the data at runtime.
 */
export const CATALOG: { [K in Category]: PartByCategory[K][] } = {
  cpu: cpuJson as PartByCategory["cpu"][],
  motherboard: motherboardJson as PartByCategory["motherboard"][],
  ram: ramJson as PartByCategory["ram"][],
  gpu: gpuJson as PartByCategory["gpu"][],
  storage: storageJson as PartByCategory["storage"][],
  psu: psuJson as PartByCategory["psu"][],
  case: caseJson as PartByCategory["case"][],
  cooler: coolerJson as PartByCategory["cooler"][],
};

export const ALL_PARTS: Part[] = Object.values(CATALOG).flat();

const byId = new Map<string, Part>(ALL_PARTS.map((p) => [p.id, p]));

export const PRICES_AS_OF: string = metaJson.pricesAsOf;

/** Live catalogue size, e.g. for "64 parts across 8 categories". */
export const CATALOG_STATS = {
  parts: ALL_PARTS.length,
  categories: Object.keys(CATALOG).length,
};

export function getPart(id: string | undefined): Part | undefined {
  return id ? byId.get(id) : undefined;
}

export function getPartsByCategory<K extends Category>(
  category: K,
): PartByCategory[K][] {
  return CATALOG[category];
}

/** Swap part ids for part objects, ignoring unknown ids or ids filed under the wrong slot. */
export function resolveBuild(parts: Build["parts"]): ResolvedBuild {
  const resolved: Record<string, Part> = {};
  for (const [category, id] of Object.entries(parts)) {
    const part = getPart(id);
    if (part && part.category === category) resolved[category] = part;
  }
  return resolved as ResolvedBuild;
}

/** Sum of the chosen parts, in integer rupiah. */
export function buildTotalIDR(parts: Build["parts"]): number {
  return Object.values(resolveBuild(parts)).reduce(
    (sum, p) => sum + p.priceIDR,
    0,
  );
}

/** "AMD Ryzen 5 7600" */
export function partLabel(part: Part): string {
  return `${part.brand} ${part.name}`;
}
