"use client";

import {
  AlertTriangle,
  ChevronRight,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PriceTag } from "@/components/ui/price-tag";
import { Tip } from "@/components/ui/tooltip";
import { useBuildDerived } from "@/hooks/use-build";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CATEGORIES, CATEGORY_LABEL, SETUP_CATEGORIES } from "@/lib/categories";
import { formatIDR } from "@/lib/format";
import { buildTotals, partLabel } from "@/lib/parts";
import { suggestedSetupFor } from "@/lib/presets";
import { partSpecs } from "@/lib/specs";
import { useBuildStore } from "@/store/build";
import { useUiStore } from "@/store/ui";
import type { Category, Item } from "@/types/parts";

function SlotRow({
  category,
  part,
  severity,
}: {
  category: Category;
  part: Item | undefined;
  severity: "error" | "warning" | undefined;
}) {
  const removePart = useBuildStore((s) => s.removePart);
  const openPicker = useUiStore((s) => s.openPicker);
  const activeSlot = useUiStore((s) => s.activeSlot);

  const label = CATEGORY_LABEL[category];

  return (
    <li
      className={cn(
        "group relative flex items-center gap-3 rounded-btn border px-3 py-2.5 transition-colors duration-150",
        part
          ? "border-line bg-surface shadow-edge"
          : "border-dashed border-line-strong/50 bg-transparent",
        "hover:border-line-hover hover:bg-surface-2",
        severity === "error" && "border-accent/50",
        severity === "warning" && "border-warn/40",
        activeSlot === category && "ring-1 ring-accent/40",
      )}
    >
      <CategoryIcon
        category={category}
        className={cn(!part && "bg-surface-2 text-fg-3")}
      />

      {/* Stretched button: the whole row opens the picker; remove sits above it. */}
      <button
        type="button"
        onClick={() => openPicker(category)}
        data-slot-category={category}
        className="min-w-0 flex-1 rounded-input text-left after:absolute after:inset-0 after:rounded-btn focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
      >
        <span className="flex items-center gap-1.5">
          <span className="label-micro text-micro-sm text-fg-3">{label}</span>
          {severity === "error" ? (
            <span className="inline-flex items-center gap-1 label-micro text-micro-sm text-accent">
              <XCircle className="size-3" aria-hidden />
              Incompatible
            </span>
          ) : severity === "warning" ? (
            <span className="inline-flex items-center gap-1 label-micro text-micro-sm text-warn">
              <AlertTriangle className="size-3" aria-hidden />
              Warning
            </span>
          ) : null}
        </span>
        {part ? (
          <>
            <span className="block truncate text-[13px] leading-[18px] font-medium text-fg">
              {partLabel(part)}
            </span>
            <span className="mt-0.5 flex items-baseline gap-3">
              <span className="min-w-0 flex-1 truncate spec text-spec-sm text-fg-3">
                {partSpecs(part).join(" · ")}
              </span>
              <PriceTag value={part.priceIDR} size="sm" tone="default" />
            </span>
            {/* The button's name is its visible text plus what it does. */}
            <span className="sr-only">, change</span>
          </>
        ) : (
          <span className="block text-[13px] leading-[18px] text-fg-2">
            Choose…
          </span>
        )}
      </button>

      {part ? (
        <div className="relative z-10 flex shrink-0 items-center self-start">
          <Tip content={`Remove ${label.toLowerCase()}`}>
            <Button
              variant="ghost"
              size="icon-sm"
              className="size-7 text-fg-3 hover:text-fg"
              aria-label={`Remove ${label}`}
              onClick={() => removePart(category)}
            >
              <X className="size-3.5" />
            </Button>
          </Tip>
        </div>
      ) : (
        <ChevronRight
          className="size-4 shrink-0 text-fg-3 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      )}
    </li>
  );
}

/** Fills the empty setup slots from the preset closest to this PC. */
function SuggestedSetup() {
  const parts = useBuildStore((s) => s.build.parts);
  const addSuggestedSetup = useBuildStore((s) => s.addSuggestedSetup);
  const suggestion = suggestedSetupFor(parts);
  if (!suggestion) return null;
  const toAdd = Object.fromEntries(
    Object.entries(suggestion.setup).filter(([c]) => !parts[c as Category]),
  );
  const count = Object.keys(toAdd).length;
  return (
    <div className="flex flex-col gap-2 rounded-btn border border-line bg-surface-2/50 px-3 py-2.5">
      <Button
        variant="secondary"
        size="sm"
        icon={<Sparkles />}
        disabled={count === 0}
        onClick={addSuggestedSetup}
      >
        Add suggested setup
      </Button>
      <p className="text-[12px] leading-4 text-fg-3">
        {count === 0
          ? `Every slot from the ${suggestion.preset.name} setup is already filled.`
          : `${count} items from the ${suggestion.preset.name} setup, ${formatIDR(buildTotals(toAdd).setupIDR)}. Fills empty slots only.`}
      </p>
    </div>
  );
}

/** "✕ 1 ⚠ 2" after a tab label; shows nothing when there's nothing to flag. */
function IssueCount({
  errors = 0,
  warnings,
}: {
  errors?: number;
  warnings: number;
}) {
  if (!errors && !warnings) return null;
  const said = [
    errors ? `${errors} incompatible` : "",
    warnings ? `${warnings} ${warnings === 1 ? "warning" : "warnings"}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <>
      {errors ? (
        <span
          className="inline-flex items-center gap-0.5 spec text-spec-sm text-accent"
          aria-hidden
        >
          <XCircle className="size-3!" />
          {errors}
        </span>
      ) : null}
      {warnings ? (
        <span
          className="inline-flex items-center gap-0.5 spec text-spec-sm text-warn"
          aria-hidden
        >
          <AlertTriangle className="size-3!" />
          {warnings}
        </span>
      ) : null}
      <span className="sr-only">, {said}</span>
    </>
  );
}

export function SlotList({ className }: { className?: string }) {
  const {
    filled,
    setupFilled,
    resolved,
    setup,
    severityByCategory,
    setupSeverity,
    errors,
    warnings,
    setupWarnings,
  } = useBuildDerived();
  const group = useUiStore((s) => s.slotGroup);
  const setGroup = useUiStore((s) => s.setSlotGroup);
  return (
    <section
      aria-labelledby="slots-title"
      className={cn("flex flex-col gap-3", className)}
    >
      <h2 id="slots-title" className="sr-only">
        Slots
      </h2>
      <Tabs
        value={group}
        onValueChange={(v) => setGroup(v === "setup" ? "setup" : "pc")}
      >
        <TabsList aria-label="Slot group">
          <TabsTrigger value="pc">
            PC{" "}
            <span className="spec text-spec-sm text-fg-3">
              {filled}/{CATEGORIES.length}
            </span>
            <IssueCount errors={errors} warnings={warnings} />
          </TabsTrigger>
          <TabsTrigger value="setup">
            Setup{" "}
            <span className="spec text-spec-sm text-fg-3">
              {setupFilled}/{SETUP_CATEGORIES.length}
            </span>
            <IssueCount warnings={setupWarnings} />
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pc" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between px-1">
            <h3 className="label-micro text-fg-2">Parts</h3>
            <span className="spec text-spec-sm text-fg-3">
              {filled}/{CATEGORIES.length} chosen
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {CATEGORIES.map((c) => (
              <SlotRow
                key={c}
                category={c}
                part={resolved[c]}
                severity={severityByCategory[c]}
              />
            ))}
          </ul>
        </TabsContent>
        <TabsContent value="setup" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between px-1">
            <h3 className="label-micro text-fg-2">Setup · optional</h3>
            <span className="spec text-spec-sm text-fg-3">
              {setupFilled}/{SETUP_CATEGORIES.length} chosen
            </span>
          </div>
          <SuggestedSetup />
          <ul className="flex flex-col gap-2">
            {SETUP_CATEGORIES.map((c) => (
              <SlotRow
                key={c}
                category={c}
                part={setup[c]}
                severity={setupSeverity[c]}
              />
            ))}
          </ul>
        </TabsContent>
      </Tabs>
    </section>
  );
}
