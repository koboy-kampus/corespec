import { check, type CompatResult } from "@/lib/compat/check";
import { partLabel } from "@/lib/parts";
import { isPcCategory } from "@/lib/categories";
import { partSpecs, type Facet } from "@/lib/specs";
import type { Build, Item } from "@/types/parts";

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
  /** Spec filters for setup categories: facet key → chosen values (any of). */
  facets: Record<string, string[]>;
  sort: SortKey;
}

export const DEFAULT_FILTERS: PickerFilters = {
  query: "",
  brands: [],
  facets: {},
  sort: "price-asc",
};

export function isFiltered(f: PickerFilters): boolean {
  return (
    !!f.query.trim() ||
    f.brands.length > 0 ||
    f.minPrice != null ||
    f.maxPrice != null ||
    Object.values(f.facets).some((v) => v.length > 0)
  );
}

export function brandsOf(parts: Item[]): string[] {
  return [...new Set(parts.map((p) => p.brand))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** The values a facet takes across these items, sorted, for its chips. */
export function facetValues<T extends Item>(
  parts: T[],
  facet: Facet<T>,
): string[] {
  const rank = (v: string) => facet.order?.indexOf(v) ?? -1;
  return [...new Set(parts.map(facet.value))].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b, "en", { numeric: true }),
  );
}

/**
 * Search (name, brand and specs), brand, price and spec filters, then sort.
 * Within one facet any chosen value matches; different facets must all match.
 */
export function filterParts<T extends Item>(
  parts: T[],
  f: PickerFilters,
  facets: Facet<T>[] = [],
): T[] {
  const terms = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const result = parts.filter((p) => {
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (f.minPrice != null && p.priceIDR < f.minPrice) return false;
    if (f.maxPrice != null && p.priceIDR > f.maxPrice) return false;
    for (const facet of facets) {
      const chosen = f.facets[facet.key];
      if (chosen?.length && !chosen.includes(facet.value(p))) return false;
    }
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
  part: Item,
): CompatResult[] {
  // Setup items have no rules yet (Phase 11 adds info/warning ones).
  if (!isPcCategory(part.category)) return [];
  return check({ ...parts, [part.category]: part.id }).filter(
    (r) => r.severity !== "info" && r.partIds.includes(part.id),
  );
}

/** "15.000.000", "Rp 15jt"-ish typing → 15000000. Empty or digit-less → undefined. */
export function parseRupiah(input: string): number | undefined {
  const digits = input.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}
