import Link from "next/link";
import { AlertTriangle, ArrowRight, Eye } from "lucide-react";
import { CompatPanel } from "@/components/builder/compat-panel";
import { BuildStatus } from "@/components/builds/build-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { PriceTag } from "@/components/ui/price-tag";
import { Subtotals } from "@/components/builder/subtotals";
import { CATEGORIES, CATEGORY_LABEL, SETUP_CATEGORIES } from "@/lib/categories";
import { deriveBuild } from "@/lib/derive";
import { formatDate } from "@/lib/format";
import { PRICES_AS_OF, partLabel } from "@/lib/parts";
import type { SharedBuild } from "@/lib/share";
import { partSpecs } from "@/lib/specs";
import type { Category, Item } from "@/types/parts";
import { CopyToBuilds } from "./copy-to-builds";
import { SharedViewer } from "./shared-viewer";

function ItemRow({ category, part }: { category: Category; part?: Item }) {
  return (
    <li className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
      <CategoryIcon
        category={category}
        className={part ? undefined : "bg-surface-2 text-fg-3"}
      />
      <div className="min-w-0 flex-1">
        <p className="label-micro text-micro-sm text-fg-3">
          {CATEGORY_LABEL[category]}
        </p>
        {part ? (
          <>
            <p className="text-[13px] leading-[18px] font-medium text-fg">
              {partLabel(part)}
            </p>
            <p className="mt-0.5 flex items-baseline gap-3">
              <span className="min-w-0 flex-1 truncate spec text-spec-sm text-fg-3">
                {partSpecs(part).join(" · ")}
              </span>
              <PriceTag value={part.priceIDR} size="sm" tone="default" />
            </p>
          </>
        ) : (
          <p className="text-[13px] leading-[18px] text-fg-3">Not chosen</p>
        )}
      </div>
    </li>
  );
}

/** Read-only view of a build someone shared: 3D view, parts, checks and total. */
export function SharedBuildView({ shared }: { shared: SharedBuild }) {
  const d = deriveBuild(shared.parts);

  return (
    <div className="container-page flex flex-col gap-6 py-8 md:py-12">
      <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          <Badge
            variant="outline"
            shape="pill"
            icon={<Eye />}
            className="self-start"
          >
            Shared build · read-only
          </Badge>
          <h1 className="text-display-sm text-balance break-words">
            {shared.name}
          </h1>
          <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
            <PriceTag value={d.totalIDR} size="lg" label="Total" />
            <span className="spec text-spec-sm text-fg-3">
              {d.filled}/{CATEGORIES.length} parts
              {d.setupFilled ? ` · ${d.setupFilled} setup items` : ""}
            </span>
            <BuildStatus
              errors={d.errors}
              warnings={d.warnings}
              filled={d.filled}
            />
          </div>
          {d.setupFilled > 0 ? (
            <div className="max-w-64">
              <Subtotals pcIDR={d.pcIDR} setupIDR={d.setupIDR} />
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <CopyToBuilds name={shared.name} parts={shared.parts} />
          <Button asChild variant="secondary" iconRight={<ArrowRight />}>
            <Link href="/builder">Open the builder</Link>
          </Button>
        </div>
      </header>

      {shared.missing > 0 ? (
        <p className="flex items-start gap-2 rounded-btn border border-warn/30 bg-warn/5 px-3.5 py-2.5 text-[13px] leading-5 text-fg-2">
          <AlertTriangle
            className="mt-0.5 size-4 shrink-0 text-warn"
            aria-hidden
          />
          {shared.missing === 1
            ? "1 part in this link is no longer in our catalogue, so it was left out."
            : `${shared.missing} parts in this link are no longer in our catalogue, so they were left out.`}
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
        <section
          aria-label="Build preview"
          className="relative isolate h-[44vh] min-h-[300px] overflow-hidden rounded-card border border-line bg-surface/40 lg:h-[600px]"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_45%,rgba(254,46,75,0.16),transparent_60%)]"
          />
          <SharedViewer parts={shared.parts} />
        </section>

        <div className="flex min-w-0 flex-col gap-6 rounded-card border border-line bg-surface p-5 shadow-edge">
          <section
            aria-labelledby="shared-parts"
            className="flex flex-col gap-3"
          >
            <h2 id="shared-parts" className="label-micro text-fg-2">
              Parts
            </h2>
            <ul className="flex flex-col divide-y divide-line">
              {CATEGORIES.map((c) => (
                <ItemRow key={c} category={c} part={d.resolved[c]} />
              ))}
            </ul>
          </section>
          {d.setupFilled > 0 ? (
            <>
              <div className="h-px bg-line" />
              <section
                aria-labelledby="shared-setup"
                className="flex flex-col gap-3"
              >
                <h2 id="shared-setup" className="label-micro text-fg-2">
                  Setup
                </h2>
                <ul className="flex flex-col divide-y divide-line">
                  {SETUP_CATEGORIES.filter((c) => d.setup[c]).map((c) => (
                    <ItemRow key={c} category={c} part={d.setup[c]} />
                  ))}
                </ul>
              </section>
            </>
          ) : null}
          <div className="h-px bg-line" />
          <CompatPanel results={d.results} readOnly />
        </div>
      </div>

      <p className="text-[12px] leading-4 text-fg-3">
        Prices are approximate, as of {formatDate(PRICES_AS_OF)}. Check the
        store before buying.
      </p>
    </div>
  );
}
