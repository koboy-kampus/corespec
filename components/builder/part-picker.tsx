"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  ArrowUpDown,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from "lucide-react";
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
import { catalogueVersion, getPickableByCategory } from "@/lib/parts";
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
import { useMediaQuery } from "@/hooks/use-media-query";
import { useReturnFocus } from "@/hooks/use-return-focus";
import { useUiStore } from "@/store/ui";
import type { Category, Item, Tier } from "@/types/parts";
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

/** Below this width the picker is a full-height sheet with filters folded away. */
const COMPACT_QUERY = "(max-width: 767.98px)";

/** What both layouts share: the category's items, the filters and the results. */
function usePicker(category: Category) {
  const [filters, setFilters] = useState<PickerFilters>(DEFAULT_FILTERS);
  // Items an admin took out (Phase 16b) are left out here only.
  const all = useMemo(
    () => getPickableByCategory(category),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new overlay changes the list
    [category, catalogueVersion],
  );
  const facets = facetsFor(category);
  const brands = useMemo(() => brandsOf(all), [all]);
  const results = useMemo(
    () => filterParts(all, filters, facets),
    [all, filters, facets],
  );
  const update = (patch: Partial<PickerFilters>) =>
    setFilters((f) => ({ ...f, ...patch }));
  return { filters, setFilters, update, all, facets, brands, results };
}

type Picker = ReturnType<typeof usePicker>;

/**
 * Lets the dialog ask the body to handle Escape first (closing the phone's
 * filter panel); returns true when it did.
 */
export type EscapeRef = RefObject<(() => boolean) | null>;

function PickerBody({
  category,
  escapeRef,
}: {
  category: Category;
  escapeRef: EscapeRef;
}) {
  const picker = usePicker(category);
  const compact = useMediaQuery(COMPACT_QUERY);
  return compact ? (
    <CompactBody category={category} picker={picker} escapeRef={escapeRef} />
  ) : (
    <WideBody category={category} picker={picker} />
  );
}

/** Tablet and desktop (768 px and up): every filter always in view. */
function WideBody({
  category,
  picker,
}: {
  category: Category;
  picker: Picker;
}) {
  const { filters, setFilters, update, all, facets, brands, results } = picker;
  const label = CATEGORY_LABEL[category];

  return (
    <>
      <div className="flex flex-col gap-4 border-b border-line p-5 pb-4">
        <div className="flex items-center gap-3 pr-8">
          <CategoryIcon category={category} />
          <div className="min-w-0">
            <DialogTitle>Choose {label}</DialogTitle>
            <DialogDescription className="text-[13px] leading-5">
              {all.length} options · Estimate or checked prices
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

      <ResultList
        category={category}
        results={results}
        onClear={() => setFilters(DEFAULT_FILTERS)}
        className="px-5 pt-2 pb-5"
      />
    </>
  );
}

/** The scrolling list of items (or "nothing matches"), the same in both layouts. */
function ResultList({
  category,
  results,
  onClear,
  className,
}: {
  category: Category;
  results: Item[];
  onClear: () => void;
  className: string;
}) {
  const parts = useBuildStore((s) => s.build.parts);
  const setPart = useBuildStore((s) => s.setPart);
  const closePicker = useUiStore((s) => s.closePicker);
  return (
    <div
      data-testid="picker-results"
      className={cn("min-h-0 flex-1 overflow-y-auto", className)}
    >
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
          <Button variant="secondary" size="sm" onClick={onClear}>
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

/** One active filter, as a removable chip under the phone's top bar. */
interface ActiveFilter {
  key: string;
  label: string;
  remove: () => void;
}

function activeFilters(
  filters: PickerFilters,
  update: (patch: Partial<PickerFilters>) => void,
): ActiveFilter[] {
  const out: ActiveFilter[] = [];
  for (const t of filters.tiers)
    out.push({
      key: `tier-${t}`,
      label: TIER_LABEL[t],
      remove: () => update({ tiers: filters.tiers.filter((x) => x !== t) }),
    });
  for (const b of filters.brands)
    out.push({
      key: `brand-${b}`,
      label: b,
      remove: () => update({ brands: filters.brands.filter((x) => x !== b) }),
    });
  if (filters.minPrice != null)
    out.push({
      key: "min",
      label: `≥ ${formatIDR(filters.minPrice)}`,
      remove: () => update({ minPrice: undefined }),
    });
  if (filters.maxPrice != null)
    out.push({
      key: "max",
      label: `≤ ${formatIDR(filters.maxPrice)}`,
      remove: () => update({ maxPrice: undefined }),
    });
  for (const [facet, values] of Object.entries(filters.facets))
    for (const v of values)
      out.push({
        key: `${facet}-${v}`,
        label: v,
        remove: () =>
          update({
            facets: {
              ...filters.facets,
              [facet]: values.filter((x) => x !== v),
            },
          }),
      });
  return out;
}

const iconBoxClass =
  "relative flex size-9 shrink-0 items-center justify-center rounded-input border border-line-strong/70 bg-canvas text-fg-2 transition-colors hover:border-line-strong has-focus-visible:border-accent";

/**
 * Phones (under 768 px): a full-height sheet. A compact top bar (title, then
 * search, sort and a Filters button), the filters in a panel that is closed by
 * default, active filters as removable chips, and only the list scrolls.
 */
function CompactBody({
  category,
  picker,
  escapeRef,
}: {
  category: Category;
  picker: Picker;
  escapeRef: EscapeRef;
}) {
  const { filters, setFilters, update, all, facets, brands, results } = picker;
  const label = CATEGORY_LABEL[category];
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const chips = activeFilters(filters, update);

  const close = () => {
    setOpen(false);
    toggleRef.current?.focus();
  };

  // Escape closes the panel first, then (next press) the dialog.
  useEffect(() => {
    escapeRef.current = () => {
      if (!open) return false;
      setOpen(false);
      toggleRef.current?.focus();
      return true;
    };
    return () => {
      escapeRef.current = null;
    };
  }, [open, escapeRef]);

  // Opening the panel moves focus to its first filter.
  useEffect(() => {
    if (open)
      panelRef.current
        ?.querySelector<HTMLElement>("button, input, select")
        ?.focus();
  }, [open]);

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-line px-4 pt-3 pb-2.5">
        <div className="flex min-h-9 items-center gap-2.5 pr-9">
          <CategoryIcon category={category} />
          <div className="min-w-0">
            <DialogTitle>Choose {label}</DialogTitle>
            {/* The "N of M" line under the bar shows the count; this stays for screen readers. */}
            <DialogDescription className="sr-only">
              {all.length} options · Estimate or checked prices
              {isSetupCategory(category) ? " · optional" : ""}
            </DialogDescription>
          </div>
        </div>

        <div className="flex gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search {label}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-3"
              aria-hidden
            />
            <input
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder={`Search ${label.toLowerCase()}…`}
              className={cn(inputClass, "pl-9")}
            />
          </label>
          {/* The native select opens the phone's own picker; the icon is its face. */}
          <label
            className={iconBoxClass}
            title={`Sort: ${SORT_LABEL[filters.sort]}`}
          >
            <ArrowUpDown className="size-4" aria-hidden />
            <select
              aria-label={`Sort: ${SORT_LABEL[filters.sort]}`}
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as SortKey })}
              className="absolute inset-0 cursor-pointer appearance-none opacity-0"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => (open ? close() : setOpen(true))}
            className={cn(
              "flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-input border px-3 text-[13px] transition-colors",
              open || chips.length
                ? "border-accent/40 bg-accent-soft text-fg"
                : "border-line-strong/70 bg-canvas text-fg-2 hover:border-line-strong",
            )}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filters
            {chips.length ? (
              <span className="spec">· {chips.length}</span>
            ) : null}
          </button>
        </div>
      </div>

      <div
        id={panelId}
        ref={panelRef}
        role="group"
        aria-label="Filters"
        hidden={!open}
        className="border-b border-line"
      >
        <div className="flex max-h-[min(50dvh,420px)] flex-col gap-3 overflow-y-auto px-4 py-3">
          <ChipGroup<Tier>
            label="Tier"
            values={TIERS}
            chosen={filters.tiers}
            display={(t) => TIER_LABEL[t]}
            onChange={(next) => update({ tiers: next })}
          />
          <ChipGroup
            label="Brand"
            values={brands}
            chosen={filters.brands}
            onChange={(next) => update({ brands: next })}
          />
          <div className="flex gap-2">
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
        <div className="flex justify-end gap-2 border-t border-line px-4 py-2.5">
          <Button
            variant="ghost"
            size="sm"
            disabled={!isFiltered(filters)}
            onClick={() => setFilters(DEFAULT_FILTERS)}
          >
            Clear all
          </Button>
          <Button size="sm" onClick={close}>
            Done
          </Button>
        </div>
      </div>

      <div className="flex min-h-7 items-center gap-2 px-4 pt-1">
        <span
          className="shrink-0 spec text-spec-sm text-fg-3"
          aria-live="polite"
        >
          {results.length} of {all.length}
        </span>
        {!open && chips.length ? (
          <ul
            aria-label="Active filters"
            className="-my-1 flex min-w-0 flex-1 [scrollbar-width:none] gap-1.5 overflow-x-auto py-1"
          >
            {chips.map((c) => (
              <li key={c.key} className="shrink-0">
                <button
                  type="button"
                  onClick={c.remove}
                  aria-label={`Remove filter: ${c.label}`}
                  className="flex h-7 cursor-pointer items-center gap-1 rounded-chip border border-accent/40 bg-accent-soft pr-1.5 pl-2.5 text-[12px] whitespace-nowrap text-fg"
                >
                  {c.label}
                  <X className="size-3.5 text-fg-2" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ResultList
        category={category}
        results={results}
        onClear={() => setFilters(DEFAULT_FILTERS)}
        // relative: keeps the rows' screen-reader text inside the scrolling list.
        className="relative px-4 pt-1 pb-[max(1rem,env(safe-area-inset-bottom))] [&>ul]:gap-1.5"
      />
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
  const escapeRef: EscapeRef = useRef(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const compact = useMediaQuery(COMPACT_QUERY);

  return (
    <Dialog open={category !== null} onOpenChange={(o) => !o && closePicker()}>
      <DialogContent
        {...focus}
        ref={contentRef}
        onOpenAutoFocus={(e) => {
          focus.onOpenAutoFocus();
          // On a phone, focusing the search box would open the keyboard over
          // the list: focus the sheet itself, and search when tapped.
          if (compact) {
            e.preventDefault();
            contentRef.current?.focus();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (escapeRef.current?.()) e.preventDefault();
        }}
        // Phones: the whole screen (dvh, so iOS Safari's toolbar doesn't hide the
        // bottom). The ! overrides win over the base dialog's centring and width.
        className="flex h-[min(88dvh,760px)] flex-col gap-0 overflow-hidden p-0 max-md:top-0! max-md:left-0! max-md:h-dvh! max-md:max-w-none! max-md:translate-x-0! max-md:translate-y-0! max-md:rounded-none! max-md:border-0! sm:max-w-2xl"
      >
        {/* key resets filters when switching category */}
        {category ? (
          <PickerBody
            key={category}
            category={category}
            escapeRef={escapeRef}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
