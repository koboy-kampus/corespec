import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/categories";
import {
  ALL_PARTS,
  CATALOG,
  CATALOG_STATS,
  PRICES_AS_OF,
  buildTotalIDR,
} from "@/lib/parts";
import { presets, presetSummary } from "@/lib/presets";

/** Runtime checks on the seeded JSON, since TypeScript can't verify JSON imports. */
describe("parts catalogue", () => {
  it("has ~8 parts in each of the 8 categories", () => {
    expect(Object.keys(CATALOG).sort()).toEqual([...CATEGORIES].sort());
    for (const parts of Object.values(CATALOG)) {
      expect(parts.length).toBeGreaterThanOrEqual(6);
      expect(parts.length).toBeLessThanOrEqual(10);
    }
    expect(CATALOG_STATS).toEqual({ parts: ALL_PARTS.length, categories: 8 });
  });

  it("has unique ids that start with their category", () => {
    const ids = ALL_PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const [category, parts] of Object.entries(CATALOG)) {
      for (const p of parts) {
        expect(p.category).toBe(category);
        expect(p.id.startsWith(`${category}-`)).toBe(true);
      }
    }
  });

  it("stores every price as a positive integer number of rupiah", () => {
    for (const p of ALL_PARTS) {
      expect(Number.isInteger(p.priceIDR), p.id).toBe(true);
      expect(p.priceIDR, p.id).toBeGreaterThan(0);
    }
  });

  it("gives every part dims in mm for the 3D placeholders", () => {
    for (const p of ALL_PARTS) {
      expect(p.dims, p.id).toBeDefined();
      expect(Math.min(p.dims!.l, p.dims!.w, p.dims!.h), p.id).toBeGreaterThan(
        0,
      );
    }
  });

  it("mixes platforms, memory generations and form factors", () => {
    expect(new Set(CATALOG.cpu.map((c) => c.socket))).toEqual(
      new Set(["AM4", "AM5", "LGA1700", "LGA1851"]),
    );
    expect(new Set(CATALOG.motherboard.map((m) => m.ddr))).toEqual(
      new Set(["DDR4", "DDR5"]),
    );
    expect(new Set(CATALOG.motherboard.map((m) => m.formFactor))).toEqual(
      new Set(["ATX", "mATX", "ITX"]),
    );
  });

  it("includes a small ITX case that rejects long GPUs", () => {
    const longest = Math.max(...CATALOG.gpu.map((g) => g.lengthMm));
    const tinyItx = CATALOG.case.filter(
      (c) =>
        c.formFactors.length === 1 &&
        c.formFactors[0] === "ITX" &&
        c.maxGpuMm < longest,
    );
    expect(tinyItx.length).toBeGreaterThan(0);
  });

  it("has a valid pricesAsOf date", () => {
    expect(PRICES_AS_OF).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("presets", () => {
  const targets: Record<string, number> = {
    "budget-1080p": 9_000_000,
    "sweet-spot-1440p": 18_000_000,
    "creator-workstation": 35_000_000,
  };

  it.each(presets.map((p) => [p.id, p] as const))(
    "%s fills all 8 slots and lands within 10%% of its target budget",
    (id, preset) => {
      expect(Object.keys(preset.parts).sort()).toEqual([...CATEGORIES].sort());
      const { totalIDR } = presetSummary(preset);
      expect(totalIDR).toBe(buildTotalIDR(preset.parts));
      expect(Math.abs(totalIDR - targets[id]) / targets[id]).toBeLessThan(0.1);
    },
  );
});
