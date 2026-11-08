import { Check, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatIDR, formatMM, formatWatts } from "@/lib/format";

/* CSS/SVG illustrations for the feature bento. No external images. */

const MONO = { fontFamily: "var(--font-plex-mono), ui-monospace, monospace" };

export function ViewerVisual() {
  return (
    <svg
      viewBox="0 0 320 250"
      className="h-full max-h-[220px] w-full"
      role="img"
      aria-label="Wireframe case with a part snapping into place and an orbit path"
    >
      {/* orbit path */}
      <ellipse
        cx="160"
        cy="196"
        rx="128"
        ry="26"
        fill="none"
        stroke="rgba(254,46,75,0.45)"
        strokeDasharray="3 5"
      />
      <path d="M282 202 l6 -6 l1 9 z" fill="#FE2E4B" />
      {/* case faces */}
      <path
        d="M90 92 L160 132 L160 226 L90 186 Z"
        fill="rgba(255,255,255,0.025)"
        stroke="rgba(255,255,255,0.18)"
      />
      <path
        d="M160 132 L230 92 L230 186 L160 226 Z"
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.18)"
      />
      <path
        d="M90 92 L160 52 L230 92 L160 132 Z"
        fill="rgba(255,255,255,0.035)"
        stroke="rgba(255,255,255,0.18)"
      />
      {/* hidden edges */}
      <path
        d="M160 52 V146 M160 146 L90 186 M160 146 L230 186"
        stroke="rgba(255,255,255,0.08)"
        strokeDasharray="2 4"
      />
      {/* board inside */}
      <path
        d="M176 140 L214 118 L214 168 L176 190 Z"
        fill="rgba(254,46,75,0.12)"
        stroke="rgba(254,46,75,0.6)"
      />
      {/* part dropping in */}
      <g className="motion-safe:animate-[bounce_2.4s_ease-in-out_infinite]">
        <path
          d="M150 18 L186 -2 L206 10 L170 30 Z"
          fill="rgba(254,46,75,0.25)"
          stroke="#FE2E4B"
          transform="translate(0 22)"
        />
      </g>
      <path d="M178 66 V100" stroke="#FE2E4B" strokeDasharray="2 3" />
      <path d="M174 96 L178 104 L182 96" fill="none" stroke="#FE2E4B" />
      {/* axis gizmo */}
      <g transform="translate(30 220)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M0 0 L22 -12" stroke="#FE2E4B" />
        <path d="M0 0 L-0 -26" stroke="#3DD68C" />
        <path d="M0 0 L20 10" stroke="#C9C6C9" />
      </g>
      <text
        x="236"
        y="40"
        fontSize="9"
        fill="#8C898C"
        letterSpacing="0.08em"
        style={MONO}
      >
        DRAG TO ORBIT
      </text>
    </svg>
  );
}

const COST_SPLIT = [
  { label: "Graphics", pct: 42, opacity: 1 },
  { label: "CPU", pct: 22, opacity: 0.7 },
  { label: "Board", pct: 13, opacity: 0.5 },
  { label: "Other", pct: 23, opacity: 0.25 },
];

export function CostVisual() {
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="label-micro text-fg-3">Total · 8 parts</span>
        <span className="spec text-[28px] leading-8 font-medium tracking-[-0.5px] text-accent">
          {formatIDR(18450000)}
        </span>
      </div>
      <div
        className="flex h-2 gap-0.5 overflow-hidden rounded-full"
        aria-hidden
      >
        {COST_SPLIT.map((s) => (
          <span
            key={s.label}
            className="h-full bg-accent"
            style={{ width: `${s.pct}%`, opacity: s.opacity }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {COST_SPLIT.map((s) => (
          <li
            key={s.label}
            className="flex items-center gap-2 text-[12px] leading-4 text-fg-2"
          >
            <span
              className="size-2 rounded-[2px] bg-accent"
              style={{ opacity: s.opacity }}
              aria-hidden
            />
            {s.label}
            <span className="ml-auto spec text-fg-3">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const CHECKS = [
  { label: "CPU socket", value: "AM5 = AM5" },
  { label: "Memory type", value: "DDR5 = DDR5" },
  { label: "GPU length", value: `${formatMM(304)} / ${formatMM(360)}` },
  { label: "Cooler height", value: `${formatMM(155)} / ${formatMM(165)}` },
];

export function CompatVisual() {
  return (
    <div className="w-full overflow-hidden rounded-btn border border-line bg-canvas/60">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="label-micro text-fg-3">Checks</span>
        <Badge variant="ok" icon={<Check />}>
          4/4 passed
        </Badge>
      </div>
      <ul className="divide-y divide-line">
        {CHECKS.map((c) => (
          <li key={c.label} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-ok/15 text-ok">
              <Check className="size-3" aria-label="Pass" />
            </span>
            <span className="text-[13px] leading-5 text-fg">{c.label}</span>
            <span className="ml-auto spec text-spec-sm text-fg-2">
              {c.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const FPS = [
  { label: "Esports · 1080p", fps: 240, max: 260 },
  { label: "AAA · 1440p", fps: 96, max: 260 },
  { label: "Open world · 4K", fps: 54, max: 260 },
];

export function FpsVisual() {
  return (
    <div className="flex w-full flex-col gap-4">
      <Badge variant="outline">Illustrative estimate</Badge>
      <ul className="flex flex-col gap-3">
        {FPS.map((f) => (
          <li key={f.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] leading-4 text-fg-2">{f.label}</span>
              <span className="spec text-spec-sm text-fg">~{f.fps} FPS</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-strong to-accent"
                style={{ width: `${(f.fps / f.max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STORES = [
  { store: "Store A", price: 10499000, lowest: true },
  { store: "Store B", price: 10749000 },
  { store: "Marketplace C", price: 10899000 },
];

export function PriceVisual() {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[13px] leading-5 font-medium text-fg">
          GeForce RTX 5070 12GB
        </span>
        <span className="shrink-0 label-micro text-micro-sm text-fg-3">
          Approx.
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {STORES.map((s) => (
          <li
            key={s.store}
            className={`flex items-center gap-3 rounded-input border px-3 py-2 ${
              s.lowest ? "border-ok/30 bg-ok/5" : "border-line bg-canvas/50"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 rounded-chip border border-line bg-surface-2 px-2 py-0.5 font-plex text-micro-sm text-fg-2 uppercase">
              <Store className="size-3" aria-hidden />
              {s.store}
            </span>
            {s.lowest ? (
              <span className="label-micro text-micro-sm text-ok">Lowest</span>
            ) : null}
            <span
              className={`ml-auto spec text-spec ${s.lowest ? "text-fg" : "text-fg-2"}`}
            >
              {formatIDR(s.price)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PowerVisual({
  draw = 450,
  psu = 750,
}: {
  draw?: number;
  psu?: number;
}) {
  const drawPct = (draw / psu) * 100;
  const targetPct = Math.min(100, ((draw * 1.3) / psu) * 100);
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="label-micro text-fg-3">Est. draw</span>
          <span className="spec text-[28px] leading-8 font-medium text-fg">
            {formatWatts(draw)}
          </span>
        </div>
        <Badge variant="ok" icon={<Check />}>
          Headroom OK
        </Badge>
      </div>
      <div className="relative pt-5">
        <div
          className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
          style={{ left: `${targetPct}%` }}
        >
          <span className="label-micro text-micro-sm whitespace-nowrap text-fg-3">
            1.3×
          </span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-strong to-accent"
            style={{ width: `${drawPct}%` }}
          />
          <span
            className="absolute inset-y-0 w-px bg-fg"
            style={{ left: `${targetPct}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex justify-between spec text-spec-sm text-fg-3">
          <span>0 W</span>
          <span>PSU {formatWatts(psu)}</span>
        </div>
      </div>
    </div>
  );
}
