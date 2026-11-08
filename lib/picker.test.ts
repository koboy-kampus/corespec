import { describe, expect, it } from "vitest";
import { CATALOG, getPart } from "@/lib/parts";
import { partSpecs, formatCapacity } from "@/lib/specs";
import {
  DEFAULT_FILTERS,
  brandsOf,
  candidateIssues,
  filterParts,
  isFiltered,
  parseRupiah,
} from "./picker";

const gpus = CATALOG.gpu;

describe("filterParts", () => {
  it("sorts by price ascending by default", () => {
    const prices = filterParts(gpus, DEFAULT_FILTERS).map((g) => g.priceIDR);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("sorts by price descending and by name", () => {
    const desc = filterParts(gpus, { ...DEFAULT_FILTERS, sort: "price-desc" });
    expect(desc[0].priceIDR).toBe(Math.max(...gpus.map((g) => g.priceIDR)));
    const byName = filterParts(gpus, { ...DEFAULT_FILTERS, sort: "name" }).map(
      (g) => g.brand,
    );
    expect(byName[0]).toBe("ASUS");
  });

  it("searches across brand, name and specs with every term required", () => {
    expect(
      filterParts(gpus, { ...DEFAULT_FILTERS, query: "rtx 16gb" }).length,
    ).toBe(3);
    expect(
      filterParts(CATALOG.cpu, { ...DEFAULT_FILTERS, query: "am4" }).length,
    ).toBe(2);
    expect(filterParts(gpus, { ...DEFAULT_FILTERS, query: "zzz" })).toEqual([]);
  });

  it("filters by brand and price range", () => {
    const sapphire = filterParts(gpus, {
      ...DEFAULT_FILTERS,
      brands: ["Sapphire"],
    });
    expect(sapphire.every((g) => g.brand === "Sapphire")).toBe(true);
    const mid = filterParts(gpus, {
      ...DEFAULT_FILTERS,
      minPrice: 6_000_000,
      maxPrice: 11_000_000,
    });
    expect(
      mid.every((g) => g.priceIDR >= 6_000_000 && g.priceIDR <= 11_000_000),
    ).toBe(true);
    expect(mid.length).toBe(3);
  });

  it("knows when filters are active", () => {
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltered({ ...DEFAULT_FILTERS, maxPrice: 1 })).toBe(true);
  });

  it("lists brands alphabetically without duplicates", () => {
    expect(brandsOf(gpus)).toEqual(["ASUS", "Gigabyte", "MSI", "Sapphire"]);
  });
});

describe("candidateIssues", () => {
  it("flags a long GPU against a small ITX case", () => {
    const gpu = getPart("gpu-asus-tuf-gaming-geforce-rtx-5070-ti-16gb")!;
    const issues = candidateIssues({ case: "case-fractal-design-terra" }, gpu);
    expect(issues.map((i) => i.id)).toEqual(["gpu-clearance"]);
  });

  it("is empty for a compatible pick and ignores missing-parts info", () => {
    const gpu = getPart("gpu-sapphire-pulse-radeon-rx-6600-8gb")!;
    expect(candidateIssues({ case: "case-fractal-design-terra" }, gpu)).toEqual(
      [],
    );
  });

  it("only reports issues involving the candidate", () => {
    // The build already has a socket mismatch; a fine GPU shouldn't inherit it.
    const parts = {
      cpu: "cpu-amd-ryzen-5-5600",
      motherboard: "motherboard-msi-b650m-gaming-plus-wifi",
    };
    const gpu = getPart("gpu-sapphire-pulse-radeon-rx-6600-8gb")!;
    expect(candidateIssues(parts, gpu)).toEqual([]);
  });
});

describe("parseRupiah", () => {
  it("keeps digits only", () => {
    expect(parseRupiah("Rp 15.000.000")).toBe(15_000_000);
    expect(parseRupiah("")).toBeUndefined();
    expect(parseRupiah("abc")).toBeUndefined();
  });
});

describe("partSpecs", () => {
  it("summarises each category", () => {
    expect(partSpecs(getPart("cpu-amd-ryzen-5-7600")!)).toEqual([
      "AM5",
      "6C/12T",
      "65 W",
    ]);
    expect(
      partSpecs(getPart("ram-corsair-vengeance-64gb-4-16gb-ddr5-5600")!),
    ).toEqual(["DDR5-5600", "64 GB", "4×16 GB"]);
    expect(formatCapacity(2000)).toBe("2 TB");
    expect(formatCapacity(500)).toBe("500 GB");
  });
});
