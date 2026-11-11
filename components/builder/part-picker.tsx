"use client";

import { useMemo, useState } from "react";
import { Search, SearchX, X } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORY_LABEL, isSetupCategory } from "@/lib/categories";
import { formatIDR } from "@/lib/format";
import { getPartsByCategory } from "@/lib/parts";
import {
  DEFAULT_FILTERS,
  SORT_LABEL,
  brandsOf,
  candidateIssues,
  facetValues,
  filterParts,
  isFiltered,
  parseRupiah,
  TIER_LABEL,
  TIERS,
  type PickerFilters,
  type SortKey,
} from "@/lib/picker";
import { facetsFor } from "@/lib/specs";
import { useBuildStore } from "@/store/build";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { useUiStore } from "@/store/ui";
import type { Category, Tier } from "@/types/parts";
import { PartRow } from "./part-row";

const inputClass =
  "h-9 w-full rounded-input border border-line-strong/70 bg-canvas px-3 text-[13px] text-fg placeholder:text-fg-3 transition-colors hover:border-line-strong focus-visible:border-accent";

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="label-micro text-micro-sm text-fg-3">{label}</span>
      <input
        inputMode="numeric"
        value={
          value != null ? new Intl.NumberFormat("id-ID").format(value) : ""
        }
        onChange={(e) => onChange(parseRupiah(e.target.value))}
        placeholder="Rp"
        className={cn(inputClass, "spec")}
      />
    </label>
  );
}

const chipClass = (on: boolean) =>
  cn(
    "h-7 cursor-pointer rounded-chip border px-2.5 text-[12px] transition-colors",
    on
      ? "border-accent/40 bg-accent-soft text-fg"
      : "border-line bg-surface text-fg-2 hover:border-line-hover hover:text-fg",
  );

/** A row of toggle chips (any of), e.g. tiers, brands or a setup spec like Layout. */
function ChipGroup<V extends string>({
  label,
  values,
  chosen,
  onChange,
  display = (v) => v,
}: {
  label: string;
  values: V[];
  chosen: V[];
  onChange: (next: V[]) => void;
  display?: (v: V) => string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="label-micro text-micro-sm text-fg-3">{label}</span>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label={`Filter by ${label.toLowerCase()}`}
      >
        {values.map((v) => {
          const on = chosen.includes(v);
          return (
            <button
              key={v}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? chosen.filter((x) => x !== v) : [...chosen, v])
              }
              className={chipClass(on)}
            >
              {display(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PickerBody({ category }: { category: Category }) {
  const parts = useBuildStore((s) => s.build.parts);
  const setPart = useBuildStore((s) => s.setPart);
  const closePicker = useUiStore((s) => s.closePicker);
  const [filters, setFilters] = useState<PickerFilters>(DEFAULT_FILTERS);

  const all = getPartsByCategory(category);
  const facets = facetsFor(category);
  const brands = useMemo(() => brandsOf(all), [all]);
  const results = useMemo(
    () => filterParts(all, filters, facets),
    [all, filters, facets],
  );
  const label = CATEGORY_LABEL[category];
  const update = (patch: Partial<PickerFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-line p-5 pb-4">
        <div className="flex items-center gap-3 pr-8">
          <CategoryIcon category={category} />
          <div className="min-w-0">
            <DialogTitle>Choose {label.toLowerCase()}</DialogTitle>
            <DialogDescription className="text-[13px] leading-5">
              {all.length} options · estimated prices unless marked Checked
              {isSetupCategory(category) ? " · optional" : ""}
            </DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search {label}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3"
              aria-hidden
            />
            <input
              autoFocus
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder={`Search ${label.toLowerCase()}…`}
              className={cn(inputClass, "pl-9")}
            />
          </label>
          <label className="flex items-center gap-2 sm:w-52">
            <span className="sr-only">Sort</span>
            <select
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className={cn(inputClass, "cursor-pointer")}
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ChipGroup<Tier>
          label="Tier"
          values={TIERS}
          chosen={filters.tiers}
          display={(t) => TIER_LABEL[t]}
          onChange={(next) => update({ tiers: next })}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <ChipGroup
            label="Brand"
            values={brands}
            chosen={filters.brands}
            onChange={(next) => update({ brands: next })}
          />
          <div className="flex gap-2 sm:w-64">
            <PriceInput
              label="Min price"
              value={filters.minPrice}
              onChange={(v) => update({ minPrice: v })}
            />
            <PriceInput
              label="Max price"
              value={filters.maxPrice}
              onChange={(v) => update({ maxPrice: v })}
            />
          </div>
        </div>
      </div>

      {facets.length ? (
        <div className="flex flex-col gap-3 border-b border-line px-5 py-3 sm:flex-row sm:flex-wrap">
          {facets.map((facet) => (
            <ChipGroup
              key={facet.key}
              label={facet.label}
              values={facetValues(all, facet)}
              chosen={filters.facets[facet.key] ?? []}
              onChange={(next) =>
                update({ facets: { ...filters.facets, [facet.key]: next } })
              }
            />
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between px-5 pt-3 pb-1">
        <span className="spec text-spec-sm text-fg-3" aria-live="polite">
          {results.length} of {all.length}
          {filters.maxPrice != null
            ? ` · under ${formatIDR(filters.maxPrice)}`
            : ""}
        </span>
        {isFiltered(filters) ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[12px]"
            icon={<X />}
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2 pb-5">
        {results.length ? (
          <ul className="flex flex-col gap-2">
            {results.map((part) => (
              <PartRow
                key={part.id}
                part={part}
                issues={candidateIssues(parts, part)}
                selected={parts[category] === part.id}
                onSelect={() => {
                  setPart(category, part.id);
                  closePicker();
                }}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-btn border border-dashed border-line-strong/60 px-6 py-12 text-center">
            <SearchX className="size-6 text-fg-3" aria-hidden />
            <p className="text-ui text-fg">
              No {isSetupCategory(category) ? "items" : "parts"} match these
              filters.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

/** One picker dialog for the whole builder, opened via useUiStore.openPicker(category). */
export function PartPicker() {
  const category = useUiStore((s) => s.pickerCategory);
  const closePicker = useUiStore((s) => s.closePicker);
  // Back to the opener, or else to the slot that was being edited.
  const [lastCategory, setLastCategory] = useState(category);
  if (category && category !== lastCategory) setLastCategory(category);
  const focus = useReturnFocus(() =>
    document.querySelector<HTMLElement>(
      `[data-slot-category="${lastCategory}"]`,
    ),
  );

  return (
    <Dialog open={category !== null} onOpenChange={(o) => !o && closePicker()}>
      <DialogContent
        {...focus}
        className="flex h-[min(88dvh,760px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        {/* key resets filters when switching category */}
        {category ? <PickerBody key={category} category={category} /> : null}
      </DialogContent>
    </Dialog>
  );
}
