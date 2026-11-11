"use client";

import { AlertTriangle, Check, XCircle } from "lucide-react";
import { cn } from "cn";
import { PriceTag } from "@/components/ui/price-tag";
import type { CompatResult } from "@/lib/compat/check";
import { partLabel } from "@/lib/parts";
import { TIER_LABEL } from "@/lib/picker";
import { partSpecs } from "@/lib/specs";
import type { Item } from "@/types/parts";

interface PartRowProps {
  part: Item;
  issues: CompatResult[];
  selected: boolean;
  onSelect: () => void;
}

/**
 * One option in the picker. Incompatible parts are dimmed and show the reason
 * (icon + words, never colour alone), but stay selectable.
 */
export function PartRow({ part, issues, selected, onSelect }: PartRowProps) {
  const error = issues.find((i) => i.severity === "error");
  const warning = !error
    ? issues.find((i) => i.severity === "warning")
    : undefined;
  const issue = error ?? warning;

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={cn(
          "group flex w-full cursor-pointer flex-col gap-2 rounded-btn border px-4 py-3 text-left transition-colors duration-150",
          selected
            ? "border-accent/50 bg-accent-soft"
            : error
              ? // Marked with a red edge, not dimmed: it can still be picked, so it must stay readable.
                "border-accent/25 border-l-accent/70 bg-surface hover:border-accent/40 hover:bg-surface-2"
              : "border-line bg-surface hover:border-line-hover hover:bg-surface-2",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-5 font-medium text-fg">
              {partLabel(part)}
            </p>
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {partSpecs(part).map((s) => (
                <li
                  key={s}
                  className="rounded-chip border border-line bg-canvas/60 px-1.5 py-0.5 spec text-spec-sm text-fg-2"
                >
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <PriceTag value={part.priceIDR} />
            <span className="label-micro text-micro-sm text-fg-3">
              <span className="sr-only">Tier: </span>
              {TIER_LABEL[part.tier]}
            </span>
            {selected ? (
              <span className="inline-flex items-center gap-1 label-micro text-micro-sm text-accent">
                <Check className="size-3" aria-hidden />
                Selected
              </span>
            ) : null}
          </div>
        </div>

        {issue ? (
          <p
            className={cn(
              "flex items-start gap-1.5 text-[12px] leading-4",
              error ? "text-accent" : "text-warn",
            )}
          >
            {error ? (
              <XCircle className="mt-px size-3.5 shrink-0" aria-hidden />
            ) : (
              <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
            )}
            <span>
              <span className="font-semibold">
                {error ? "Incompatible: " : "Warning: "}
              </span>
              {issue.message}
              {issues.length > 1 ? ` (+${issues.length - 1} more)` : ""}
            </span>
          </p>
        ) : null}
      </button>
    </li>
  );
}
