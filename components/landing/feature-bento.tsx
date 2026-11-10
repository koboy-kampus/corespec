import type { ReactNode } from "react";
import { cn } from "cn";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/section-header";
import {
  CompatVisual,
  CostVisual,
  ExplodedVisual,
  PowerVisual,
  ShareVisual,
  ViewerVisual,
} from "./bento-visuals";
import { Reveal } from "./reveal";

interface Tile {
  index: string;
  title: string;
  body: string;
  visual: ReactNode;
}

const row1: Tile[] = [
  {
    index: "01",
    title: "See it in 3D",
    body: "Every part snaps into a to-scale case. Orbit around it and spot a tight fit before it's on your desk.",
    visual: <ViewerVisual />,
  },
  {
    index: "02",
    title: "Cost tracking",
    body: "A running total in Rupiah, updated with every pick. Add a monitor, keyboard, desk and the rest of your setup for the full cost.",
    visual: <CostVisual />,
  },
  {
    index: "03",
    title: "Compatibility, checked live",
    body: "Socket, memory type, GPU length and cooler height are checked as you build, with plain-English reasons.",
    visual: <CompatVisual />,
  },
];

const row2: Tile[] = [
  {
    index: "04",
    title: "Exploded view",
    body: "Pull every part out toward the glass to see what goes where, then snap it back together.",
    visual: <ExplodedVisual />,
  },
  {
    index: "05",
    title: "Share your build",
    body: "The whole build fits in one link. Friends see it in 3D and can copy it to their own builds.",
    visual: <ShareVisual />,
  },
  {
    index: "06",
    title: "Power budget",
    body: "Estimated draw against your PSU, with a 30% headroom target.",
    visual: <PowerVisual />,
  },
];

function BentoTile({ tile, className }: { tile: Tile; className?: string }) {
  return (
    <Card
      variant="bento"
      padding="none"
      interactive
      className={cn("flex h-full flex-col lg:h-[350px]", className)}
    >
      <div className="relative flex min-h-[200px] flex-1 items-center justify-center overflow-hidden px-6 pt-6">
        {tile.visual}
      </div>
      <div className="flex flex-col gap-1.5 p-6">
        <div className="flex items-baseline gap-3">
          <span className="label-micro text-accent">{tile.index}</span>
          <h3 className="text-h3 text-fg">{tile.title}</h3>
        </div>
        <p className="text-[14px] leading-5 text-fg-2">{tile.body}</p>
      </div>
    </Card>
  );
}

function BentoRow({ tiles, cols }: { tiles: Tile[]; cols: string }) {
  return (
    <div className={cn("grid gap-3 md:grid-cols-2", cols)}>
      {tiles.map((tile, i) => (
        <Reveal
          key={tile.index}
          delay={i * 0.06}
          className={cn(
            "h-full min-w-0",
            i === 2 && "md:col-span-2 lg:col-span-1",
          )}
        >
          <BentoTile tile={tile} />
        </Reveal>
      ))}
    </div>
  );
}

export function FeatureBento() {
  return (
    <section className="border-b border-line">
      <div className="container-page flex flex-col gap-10 py-16 lg:py-24">
        <Reveal>
          <SectionHeader
            eyebrow="02 · Features"
            title="Everything you need to plan a build"
            subtitle="The parts, the fit, the power and the price, in one place."
          />
        </Reveal>
        <div className="flex flex-col gap-3">
          <BentoRow tiles={row1} cols="lg:grid-cols-[1.35fr_1fr_1.35fr]" />
          <BentoRow tiles={row2} cols="lg:grid-cols-[1fr_1.4fr_1fr]" />
        </div>
      </div>
    </section>
  );
}
