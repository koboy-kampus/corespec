import { AlertTriangle, Check, Copy, Link2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatIDR, formatWatts } from "@/lib/format";
import { POWER } from "@/lib/power";
import { getShowcase } from "@/lib/showcase";

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

const SPLIT_OPACITY = [1, 0.7, 0.5, 0.25];
export function CostVisual() {
  const showcase = getShowcase();
  const costSplit = showcase.costSplit.map((s, i) => ({
    ...s,
    opacity: SPLIT_OPACITY[i] ?? 0.25,
  }));
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="label-micro text-fg-3">
          Total · {showcase.partCount} parts
        </span>
        <span className="spec text-[28px] leading-8 font-medium tracking-[-0.5px] text-accent">
          {formatIDR(showcase.totalIDR)}
        </span>
      </div>
      <div
        className="flex h-2 gap-0.5 overflow-hidden rounded-full"
        aria-hidden
      >
        {costSplit.map((s) => (
          <span
            key={s.label}
            className="h-full bg-accent"
            style={{ width: `${s.pct}%`, opacity: s.opacity }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {costSplit.map((s) => (
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

export function CompatVisual() {
  const checks = getShowcase().checks;
  return (
    <div className="w-full overflow-hidden rounded-btn border border-line bg-canvas/60">
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="label-micro text-fg-3">Checks</span>
        <Badge variant="ok" icon={<Check />}>
          {checks.length}/{checks.length} passed
        </Badge>
      </div>
      <ul className="divide-y divide-line">
        {checks.map((c) => (
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

/**
 * The case pulled apart into layers along one axis, like the builder's exploded
 * view: back panel, motherboard, graphics card and the glass side panel.
 */
const PLANE = "0,0 90,40 90,130 0,90";
const LAYERS = [
  {
    label: "CASE",
    shape: PLANE,
    fill: "rgba(255,255,255,0.04)",
    stroke: "rgba(255,255,255,0.22)",
  },
  {
    label: "BOARD",
    shape: "12,16 76,44 76,106 12,78",
    fill: "rgba(254,46,75,0.14)",
    stroke: "rgba(254,46,75,0.7)",
  },
  {
    label: "GPU",
    shape: "4,66 86,102 86,120 4,84",
    fill: "rgba(254,46,75,0.28)",
    stroke: "#FE2E4B",
  },
  {
    label: "GLASS",
    shape: PLANE,
    fill: "rgba(255,255,255,0.02)",
    stroke: "rgba(255,255,255,0.3)",
  },
];
const STEP = { x: 46, y: -20 };

export function ExplodedVisual() {
  const ox = 34;
  const oy = 96;
  const last = LAYERS.length - 1;
  return (
    <svg
      viewBox="0 0 320 250"
      className="h-full max-h-[220px] w-full"
      role="img"
      aria-label="Exploded view: the case, motherboard, graphics card and glass panel pulled apart in layers"
    >
      {/* guide lines through the corners */}
      {[
        [0, 0],
        [90, 130],
      ].map(([cx, cy]) => (
        <path
          key={`${cx}-${cy}`}
          d={`M${ox + cx} ${oy + cy} l${STEP.x * last} ${STEP.y * last}`}
          stroke="rgba(254,46,75,0.45)"
          strokeDasharray="2 4"
        />
      ))}
      {LAYERS.map((l, i) => {
        const x = ox + STEP.x * i;
        const y = oy + STEP.y * i;
        return (
          <g key={l.label} transform={`translate(${x} ${y})`}>
            <polygon points={l.shape} fill={l.fill} stroke={l.stroke} />
            <text
              x="0"
              y="-8"
              fontSize="9"
              fill="#8C898C"
              letterSpacing="0.08em"
              style={MONO}
            >
              {l.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** The real share link of the example build, so the tile shows exactly what the builder makes. */
export function ShareVisual() {
  const showcase = getShowcase();
  return (
    <div className="flex w-full flex-col gap-3" aria-hidden>
      <div className="flex items-center justify-between gap-3">
        <span className="truncate text-[13px] leading-5 font-medium text-fg">
          {showcase.name}
        </span>
        <Badge variant="outline">View-only</Badge>
      </div>
      <div className="flex items-center gap-2 rounded-input border border-line bg-canvas/60 px-3 py-2">
        <Link2 className="size-3.5 shrink-0 text-accent" />
        <span className="min-w-0 truncate spec text-spec-sm text-fg-2">
          corespec{showcase.sharePath}
        </span>
      </div>
      <div className="flex gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-btn bg-accent-strong px-3 py-1.5 text-[12px] font-semibold text-white">
          <Copy className="size-3.5" />
          Copy link
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-btn border border-line bg-surface-2 px-3 py-1.5 text-[12px] font-medium text-fg-2">
          <Plus className="size-3.5" />
          Copy to my builds
        </span>
      </div>
    </div>
  );
}

export function PowerVisual({
  draw = getShowcase().drawW,
  psu = getShowcase().psuWatts,
}: {
  draw?: number;
  psu?: number;
}) {
  const drawPct = (draw / psu) * 100;
  const targetPct = Math.min(100, ((draw * POWER.headroom) / psu) * 100);
  const headroomOk = psu >= draw * POWER.headroom;
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-1">
          <span className="label-micro text-fg-3">Est. draw</span>
          <span className="spec text-[28px] leading-8 font-medium text-fg">
            {formatWatts(draw)}
          </span>
        </div>
        {headroomOk ? (
          <Badge variant="ok" icon={<Check />}>
            Headroom OK
          </Badge>
        ) : (
          <Badge variant="warn" icon={<AlertTriangle />}>
            Low headroom
          </Badge>
        )}
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
