import Link from "next/link";
import { ArrowRight, Boxes, ShieldCheck, Wallet, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BuildSummaryCard } from "./build-summary-card";
import { HeroViewer } from "./hero-viewer";
import { CATALOG_STATS } from "@/lib/parts";
import { showcase } from "@/lib/showcase";

const features = [
  // Computed from the seeded catalogue, so it stays true as parts are added.
  {
    icon: Boxes,
    label: `${CATALOG_STATS.parts} parts across ${CATALOG_STATS.categories} categories`,
  },
  { icon: ShieldCheck, label: "Live compatibility checks" },
  { icon: Wallet, label: "Prices in Rupiah" },
  { icon: Zap, label: "Wattage estimates" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="container-page grid items-center gap-12 pt-10 pb-16 md:pt-14 lg:grid-cols-[2fr_3fr] lg:gap-10 lg:pt-16 lg:pb-24">
        {/* Text column (~40%) */}
        <div className="hero-enter relative z-10 flex flex-col gap-7">
          <Badge variant="outline" shape="pill" className="gap-2">
            <span className="size-1.5 rounded-full bg-ok" aria-hidden />
            Beta · Free to use
          </Badge>

          <div className="flex flex-col gap-5">
            <h1 className="text-display-sm text-balance md:text-display">
              Build your PC in 3D.
            </h1>
            <p className="max-w-md text-[17px] leading-[26px] text-fg-2">
              Pick parts, watch them snap into a case and catch compatibility
              problems before you pay. Every price is in Rupiah.
            </p>
          </div>

          <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2.5 text-ui text-fg"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-input border border-line bg-surface text-accent shadow-edge">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              iconRight={
                <ArrowRight className="transition-transform duration-150 group-hover/button:translate-x-0.5" />
              }
            >
              <Link href="/builder">Start Building</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <a href="#presets">Browse Presets</a>
            </Button>
          </div>

          <p className="label-micro text-fg-3">
            Free <span className="text-line-strong">·</span> No sign-up{" "}
            <span className="text-line-strong">·</span> Made in Indonesia
          </p>
        </div>

        {/* Visual column (~60%) */}
        <div className="relative lg:pb-40">
          {/* single coral glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(circle,rgba(254,46,75,0.26)_0%,rgba(254,46,75,0.08)_35%,transparent_65%)]"
          />
          {/* blueprint grid, faded at the edges */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_72%)] bg-[size:28px_28px]"
          />

          <div className="hero-enter relative [animation-delay:100ms]">
            <HeroViewer />
          </div>

          <div className="hero-enter relative z-10 -mt-16 flex justify-center [animation-delay:250ms] sm:-mt-24 lg:absolute lg:right-0 lg:bottom-0 lg:mt-0 lg:block">
            <BuildSummaryCard {...showcase} />
          </div>
        </div>
      </div>
    </section>
  );
}
