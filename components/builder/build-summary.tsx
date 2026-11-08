"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Pencil } from "lucide-react";
import { cn } from "cn";
import { PriceTag } from "@/components/ui/price-tag";
import { useBuildDerived } from "@/hooks/use-build";
import { CATEGORIES } from "@/lib/categories";
import { useBuildStore } from "@/store/build";
import { BuildActions } from "./build-actions";
import { CompatPanel } from "./compat-panel";
import { WattageMeter } from "./wattage-meter";

/** Inline-editable build name: commits on blur or Enter, Esc cancels. */
function BuildName() {
  const name = useBuildStore((s) => s.build.name);
  const rename = useBuildStore((s) => s.rename);
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <label className="group relative block">
      <span className="sr-only">Build name</span>
      <input
        value={draft ?? name}
        onFocus={() => setDraft(name)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null) rename(draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(null);
            e.currentTarget.blur();
          }
        }}
        maxLength={60}
        className="-ml-1.5 w-full truncate rounded-input border border-transparent bg-transparent py-1 pr-7 pl-1.5 text-h3 text-fg transition-colors hover:border-line focus-visible:border-line-strong focus-visible:bg-canvas focus-visible:outline-none"
      />
      <Pencil
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </label>
  );
}

export function BuildSummary({ className }: { className?: string }) {
  const { totalIDR, drawW, results, resolved, filled } = useBuildDerived();

  return (
    <section
      aria-label="Build summary"
      className={cn("flex flex-col gap-6", className)}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="label-micro text-fg-3">Your build</p>
          <Link
            href="/builds"
            className="inline-flex items-center gap-1 text-[12px] leading-4 text-fg-3 hover:text-fg"
          >
            <Check className="size-3 text-ok" aria-hidden />
            Saved · My builds
          </Link>
        </div>
        <BuildName />
        <div className="flex items-end justify-between gap-3">
          <PriceTag value={totalIDR} size="lg" label="Total" />
          <span className="spec text-spec-sm text-fg-3">
            {filled}/{CATEGORIES.length} parts
          </span>
        </div>
        <BuildActions hasParts={filled > 0} />
      </div>

      <div className="h-px bg-line" />
      <WattageMeter drawW={drawW} psuW={resolved.psu?.watts} />
      <div className="h-px bg-line" />
      <CompatPanel results={results} />
    </section>
  );
}
