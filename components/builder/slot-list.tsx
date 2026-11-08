"use client";

import { AlertTriangle, ChevronRight, X, XCircle } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PriceTag } from "@/components/ui/price-tag";
import { Tip } from "@/components/ui/tooltip";
import { useBuildDerived } from "@/hooks/use-build";
import { CATEGORIES, CATEGORY_LABEL } from "@/lib/categories";
import { partLabel } from "@/lib/parts";
import { partSpecs } from "@/lib/specs";
import { useBuildStore } from "@/store/build";
import { useUiStore } from "@/store/ui";
import type { Category, Part } from "@/types/parts";

function SlotRow({
  category,
  part,
  severity,
}: {
  category: Category;
  part: Part | undefined;
  severity: "error" | "warning" | undefined;
}) {
  const removePart = useBuildStore((s) => s.removePart);
  const openPicker = useUiStore((s) => s.openPicker);
  const activeSlot = useUiStore((s) => s.activeSlot);
  const setActiveSlot = useUiStore((s) => s.setActiveSlot);

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
      onMouseEnter={() => part && setActiveSlot(category)}
    >
      <CategoryIcon
        category={category}
        className={cn(!part && "bg-surface-2 text-fg-3")}
      />

      {/* Stretched button: the whole row opens the picker; remove sits above it. */}
      <button
        type="button"
        onClick={() => openPicker(category)}
        className="min-w-0 flex-1 rounded-input text-left after:absolute after:inset-0 after:rounded-btn focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent"
        aria-label={
          part ? `${label}: ${partLabel(part)}. Change` : `Choose ${label}`
        }
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

export function SlotList({ className }: { className?: string }) {
  const { filled, resolved, severityByCategory } = useBuildDerived();
  return (
    <section
      aria-labelledby="slots-title"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-baseline justify-between px-1">
        <h2 id="slots-title" className="label-micro text-fg-2">
          Parts
        </h2>
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
    </section>
  );
}
