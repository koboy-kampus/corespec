import { check, type CompatResult } from "@/lib/compat/check";
import { partLabel } from "@/lib/parts";
import { partSpecs } from "@/lib/specs";
import type { Build, Part } from "@/types/parts";

export type SortKey = "price-asc" | "price-desc" | "name";

export const SORT_LABEL: Record<SortKey, string> = {
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name: A–Z",
};

export interface PickerFilters {
  query: string;
  brands: string[];
  minPrice?: number;
  maxPrice?: number;
  sort: SortKey;
}

export const DEFAULT_FILTERS: PickerFilters = {
  query: "",
  brands: [],
  sort: "price-asc",
};

export function isFiltered(f: PickerFilters): boolean {
  return (
    !!f.query.trim() ||
    f.brands.length > 0 ||
    f.minPrice != null ||
    f.maxPrice != null
  );
}

export function brandsOf(parts: Part[]): string[] {
  return [...new Set(parts.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** Search (name, brand and specs), brand and price filters, then sort. */
export function filterParts<T extends Part>(parts: T[], f: PickerFilters): T[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const result = parts.filter((p) => {
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (f.minPrice != null && p.priceIDR < f.minPrice) return false;
    if (f.maxPrice != null && p.priceIDR > f.maxPrice) return false;
    if (terms.length) {
      const haystack =
        `${partLabel(p)} ${partSpecs(p).join(" ")}`.toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
  return result.sort((a, b) => {
    if (f.sort === "price-asc")
      return a.priceIDR - b.priceIDR || a.name.localeCompare(b.name);
    if (f.sort === "price-desc")
      return b.priceIDR - a.priceIDR || a.name.localeCompare(b.name);
    return partLabel(a).localeCompare(partLabel(b));
  });
}

/**
 * Errors and warnings that picking `part` would cause with the rest of the build.
 * Uses the same check() as the summary panel, so the picker and panel always agree.
 */
export function candidateIssues(
  parts: Build["parts"],
  part: Part,
): CompatResult[] {
  return check({ ...parts, [part.category]: part.id }).filter(
    (r) => r.severity !== "info" && r.partIds.includes(part.id),
  );
}

/** "15.000.000", "Rp 15jt"-ish typing → 15000000. Empty or digit-less → undefined. */
export function parseRupiah(input: string): number | undefined {
  const digits = input.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}
