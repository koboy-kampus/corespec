import Link from "next/link";
import {
  ArrowRight,
  Gauge,
  Plus,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PriceTag } from "@/components/ui/price-tag";
import { SectionHeader } from "@/components/ui/section-header";
import { formatWatts } from "@/lib/format";
import { presets, presetSummary } from "@/lib/presets";
import { Reveal } from "./reveal";

const PRESET_ICON: Record<string, LucideIcon> = {
  "budget-1080p": Wallet,
  "sweet-spot-1440p": Gauge,
  "creator-workstation": Sparkles,
};

const cardLink =
  "group/link block h-full rounded-card focus-visible:outline-offset-4";

function HoverArrow() {
  return (
    <ArrowRight
      aria-hidden
      className="size-4 -translate-x-1 text-accent opacity-0 transition-all duration-150 group-hover/card:translate-x-0 group-hover/card:opacity-100 group-focus-visible/link:translate-x-0 group-focus-visible/link:opacity-100"
    />
  );
}

export function QuickStart() {
  return (
    <section id="presets" className="scroll-mt-20 border-b border-line">
      <div className="container-page flex flex-col gap-10 py-16 lg:py-24">
        <Reveal>
          <SectionHeader
            layout="split"
            eyebrow="01 · Quick start"
            title="Start from a preset"
            subtitle="Three balanced builds checked for compatibility. Totals use prices checked on a marketplace where we have them, estimates otherwise. Load one, then swap any part to make it yours."
          />
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {presets.map((preset, i) => {
            const Icon = PRESET_ICON[preset.id] ?? Gauge;
            const { totalIDR, drawW } = presetSummary(preset);
            const chips = [...preset.highlights, `~${formatWatts(drawW)}`];
            return (
              <Reveal
                key={preset.id}
                delay={i * 0.06}
                className="h-full min-w-0"
              >
                <Link
                  href={`/builder?preset=${preset.id}`}
                  className={cardLink}
                >
                  <Card
                    interactive
                    padding="none"
                    className="flex h-full flex-col"
                  >
                    <div className="flex flex-1 flex-col gap-4 p-5">
                      <div className="flex items-center justify-between">
                        <span className="flex size-9 items-center justify-center rounded-input bg-accent-soft text-accent">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <span className="label-micro text-fg-3">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <h3 className="text-h3 text-fg">{preset.name}</h3>
                        <p className="text-[14px] leading-5 text-fg-2">
                          {preset.tagline}
                        </p>
                      </div>
                      <ul className="mt-auto flex flex-wrap gap-1.5">
                        {chips.map((h) => (
                          <li
                            key={h}
                            className="rounded-chip border border-line bg-surface-2 px-2 py-0.5 spec text-spec-sm text-fg-2"
                          >
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-end justify-between gap-3 border-t border-line px-5 py-4">
                      <PriceTag value={totalIDR} label="Approx. total" />
                      <span className="inline-flex items-center gap-1 text-ui font-medium text-fg">
                        Customise
                        <HoverArrow />
                      </span>
                    </div>
                  </Card>
                </Link>
              </Reveal>
            );
          })}

          <Reveal delay={presets.length * 0.06} className="h-full min-w-0">
            <Link href="/builder" className={cardLink}>
              <Card
                interactive
                padding="none"
                className="flex h-full min-h-[260px] flex-col items-start justify-between border-dashed border-line-strong/70 bg-transparent p-5 shadow-none"
              >
                <span className="flex size-9 items-center justify-center rounded-input border border-line bg-surface text-fg">
                  <Plus className="size-4" aria-hidden />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-h3 text-fg">Start from scratch</h3>
                  <p className="text-[14px] leading-5 text-fg-2">
                    An empty case and eight slots. Pick a CPU and go from there.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-ui font-medium text-fg">
                  Open builder
                  <HoverArrow />
                </span>
              </Card>
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
