import { Check, Zap } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PriceTag } from "@/components/ui/price-tag";
import { CATEGORY_LABEL } from "@/lib/categories";
import { formatIDR, formatWatts } from "@/lib/format";
import type { ShowcaseRow } from "./showcase-build";

interface BuildSummaryCardProps {
  name: string;
  rows: ShowcaseRow[];
  estDrawW: number;
  psuWatts: number;
  className?: string;
}

/** Floating glass card: part rows, total in IDR, wattage vs PSU. */
export function BuildSummaryCard({
  name,
  rows,
  estDrawW,
  psuWatts,
  className,
}: BuildSummaryCardProps) {
  const total = rows.reduce((sum, r) => sum + r.priceIDR, 0);
  const loadPct = Math.min(100, Math.round((estDrawW / psuWatts) * 100));

  return (
    <Card
      variant="glass"
      padding="none"
      className={cn("w-full max-w-[340px] overflow-hidden", className)}
      aria-label={`Example build ${name}, total ${formatIDR(total)}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="label-micro text-fg-3">Build · Rev 3</p>
          <p className="truncate text-ui font-semibold text-fg">{name}</p>
        </div>
        <Badge variant="ok" icon={<Check />}>
          Compatible
        </Badge>
      </div>

      <ul className="flex flex-col px-2 py-2">
        {rows.map((row) => (
          <li
            key={row.category}
            className="flex items-center gap-3 rounded-input px-2 py-1.5"
          >
            <CategoryIcon category={row.category} className="size-7" />
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
          <PriceTag value={total} size="lg" label="Total" />
          <span className="label-micro text-micro-sm text-fg-3">Approx.</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[12px] leading-4 text-fg-2">
              <Zap className="size-3.5 text-accent" aria-hidden />
              <span className="spec">{formatWatts(estDrawW)}</span> est. draw
            </span>
            <span className="spec text-spec-sm text-fg-3">
              PSU {formatWatts(psuWatts)}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface-2"
            role="meter"
            aria-label="Estimated draw versus PSU capacity"
            aria-valuemin={0}
            aria-valuemax={psuWatts}
            aria-valuenow={estDrawW}
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
