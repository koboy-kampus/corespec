import { AlertTriangle, Check, Zap } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PriceTag } from "@/components/ui/price-tag";
import { CATEGORY_LABEL } from "@/lib/categories";
import { formatIDR, formatWatts } from "@/lib/format";
import { formatRatio } from "@/lib/power";
import type { ShowcaseRow } from "@/lib/showcase";

interface BuildSummaryCardProps {
  name: string;
  rows: ShowcaseRow[];
  totalIDR: number;
  partCount: number;
  compatible: boolean;
  drawW: number;
  psuWatts: number;
  /** PSU headroom: the 1.3× target and this build's PSU ÷ draw (lib/power). */
  headroom: { need: number; have: number };
  className?: string;
}

/** Floating glass card: every part row, total in IDR, PSU headroom. */
export function BuildSummaryCard({
  name,
  rows,
  totalIDR,
  partCount,
  compatible,
  drawW,
  psuWatts,
  headroom,
  className,
}: BuildSummaryCardProps) {
  const loadPct = Math.min(100, Math.round((drawW / psuWatts) * 100));

  return (
    <Card
      variant="glass"
      padding="none"
      className={cn("w-full max-w-[340px] overflow-hidden", className)}
      aria-label={`Example build ${name}, total ${formatIDR(totalIDR)}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="label-micro text-fg-3">Example build</p>
          <p className="truncate text-ui font-semibold text-fg">{name}</p>
        </div>
        {compatible ? (
          <Badge variant="ok" icon={<Check />}>
            Compatible
          </Badge>
        ) : (
          <Badge variant="warn" icon={<AlertTriangle />}>
            Check build
          </Badge>
        )}
      </div>

      {/* Eight compact rows, so the card doesn't bury the 3D case behind it. */}
      <ul className="flex flex-col px-2 py-1.5">
        {rows.map((row) => (
          <li
            key={row.category}
            className="flex items-center gap-2.5 rounded-input px-2 py-1"
          >
            <CategoryIcon category={row.category} className="size-6" />
            <div className="min-w-0 flex-1">
              <p className="label-micro text-micro-sm text-fg-3">
                {CATEGORY_LABEL[row.category]}
              </p>
              <p className="truncate text-[13px] leading-[18px] text-fg">
                {row.name}
              </p>
            </div>
            <PriceTag value={row.priceIDR} size="sm" tone="default" />
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-t border-line px-4 py-3.5">
        <div className="flex items-end justify-between gap-3">
          <PriceTag
            value={totalIDR}
            size="lg"
            label={`Total · ${partCount} parts`}
          />
          <span className="label-micro text-micro-sm text-fg-3">Approx.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-fg-2">
              <Zap className="size-3.5 text-accent" aria-hidden />
              PSU headroom
            </span>
            <span className="spec text-spec-sm text-fg-2">
              Need {formatRatio(headroom.need)}{" "}
              <span className="text-fg-3" aria-hidden>
                ·
              </span>{" "}
              You have{" "}
              <span
                className={
                  headroom.have >= headroom.need ? "text-ok" : "text-warn"
                }
              >
                {formatRatio(headroom.have)}
              </span>
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="meter"
            aria-label={`Estimated draw ${formatWatts(drawW)} of a ${formatWatts(psuWatts)} PSU`}
            aria-valuemin={0}
            aria-valuemax={psuWatts}
            aria-valuenow={drawW}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-strong to-accent"
              style={{ width: `${loadPct}%` }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
