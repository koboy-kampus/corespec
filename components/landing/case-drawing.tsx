import { cn } from "cn";

/**
 * Stylised side elevation of a mid-tower, drawn like an engineering sheet.
 * Placeholder for the hero until Phase 5 swaps in the live 3D scene.
 */

const MONO = { fontFamily: "var(--font-plex-mono), ui-monospace, monospace" };
const STROKE = "rgba(255,255,255,0.14)";
const STROKE_SOFT = "rgba(255,255,255,0.07)";
const ACCENT = "#FE2E4B";

function Fan({
  cx,
  cy,
  r,
  accent = false,
}: {
  cx: number;
  cy: number;
  r: number;
  accent?: boolean;
}) {
  const blades = [0, 72, 144, 216, 288];
  const stroke = accent ? ACCENT : STROKE;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} fill="#141114" stroke={stroke} strokeWidth="1.25" />
      <g
        className="motion-safe:animate-[spin_9s_linear_infinite]"
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        {/* invisible ring keeps the group's box centred on the hub */}
        <circle r={r - 2} fill="none" />
        {blades.map((deg) => (
          <path
            key={deg}
            transform={`rotate(${deg})`}
            d={`M0 0 Q ${r * 0.55} ${-r * 0.15} ${r * 0.8} ${-r * 0.5}`}
            fill="none"
            stroke={accent ? "rgba(254,46,75,0.7)" : "rgba(255,255,255,0.22)"}
            strokeWidth="1.25"
            strokeLinecap="round"
          />
        ))}
      </g>
      <circle r={r * 0.2} fill="#1E1A1E" stroke={stroke} strokeWidth="1" />
    </g>
  );
}

function Callout({
  y,
  toX,
  index,
  label,
}: {
  y: number;
  toX: number;
  index: string;
  label: string;
}) {
  return (
    <g>
      <text
        x="8"
        y={y - 4}
        fontSize="9"
        fill="#8C898C"
        letterSpacing="0.08em"
        style={MONO}
      >
        {index}
      </text>
      <text
        x="8"
        y={y + 9}
        fontSize="10"
        fill="#C9C6C9"
        letterSpacing="0.08em"
        style={MONO}
      >
        {label}
      </text>
      <path
        d={`M106 ${y} H${toX}`}
        stroke="rgba(254,46,75,0.55)"
        strokeWidth="1"
        strokeDasharray="2 3"
      />
      <circle cx={toX} cy={y} r="2.5" fill={ACCENT} />
    </g>
  );
}

export function CaseDrawing({
  className,
  gpuLengthMm,
  psuWatts,
}: {
  className?: string;
  gpuLengthMm: number;
  psuWatts: number;
}) {
  return (
    <svg
      viewBox="0 0 560 520"
      role="img"
      aria-label="Technical drawing of a mid-tower PC case with cooler, memory, graphics card and power supply installed"
      className={cn("h-auto w-full", className)}
    >
      <defs>
        <linearGradient id="cs-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(255,255,255,0.05)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0.01)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>
        <linearGradient id="cs-ram" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ACCENT} />
          <stop offset="0.12" stopColor="#3A2F37" />
          <stop offset="1" stopColor="#262026" />
        </linearGradient>
      </defs>

      {/* Case shell */}
      <rect
        x="150"
        y="30"
        width="330"
        height="430"
        rx="16"
        fill="#161316"
        stroke={STROKE}
        strokeWidth="1.5"
      />
      <rect
        x="164"
        y="44"
        width="302"
        height="402"
        rx="9"
        fill="url(#cs-glass)"
        stroke={STROKE_SOFT}
      />

      {/* Motherboard */}
      <rect
        x="180"
        y="60"
        width="222"
        height="262"
        rx="5"
        fill="#1E1A1E"
        stroke="rgba(255,255,255,0.1)"
      />
      <rect x="180" y="72" width="8" height="64" rx="1.5" fill="#2E282E" />
      {/* traces */}
      <path
        d="M206 300 H260 V286 M290 300 H380 M206 190 H236"
        stroke={STROKE_SOFT}
        fill="none"
      />

      {/* CPU socket + cooler */}
      <rect
        x="270"
        y="104"
        width="54"
        height="54"
        rx="4"
        fill="#262026"
        stroke={STROKE}
      />
      <Fan cx={297} cy={131} r={31} accent />

      {/* RAM */}
      {[344, 353, 362, 371].map((x) => (
        <rect
          key={x}
          x={x}
          y="92"
          width="5"
          height="82"
          rx="1.5"
          fill="url(#cs-ram)"
        />
      ))}

      {/* M.2 */}
      <rect
        x="250"
        y="196"
        width="72"
        height="10"
        rx="2"
        fill="#2E282E"
        stroke={STROKE}
      />

      {/* GPU */}
      <rect x="188" y="218" width="5" height="62" rx="1" fill="#4B4A4B" />
      <rect
        x="196"
        y="222"
        width="214"
        height="52"
        rx="6"
        fill="#221D22"
        stroke="rgba(254,46,75,0.45)"
        strokeWidth="1.25"
      />
      <Fan cx={240} cy={248} r={19} />
      <Fan cx={303} cy={248} r={19} />
      <Fan cx={366} cy={248} r={19} />

      {/* Front intake fans */}
      <rect
        x="418"
        y="64"
        width="40"
        height="244"
        rx="5"
        fill="#141114"
        stroke={STROKE_SOFT}
      />
      <Fan cx={438} cy={106} r={17} />
      <Fan cx={438} cy={186} r={17} />
      <Fan cx={438} cy={266} r={17} />

      {/* PSU shroud */}
      <path
        d="M164 356 H466 V437 a9 9 0 0 1 -9 9 H173 a9 9 0 0 1 -9 -9 Z"
        fill="#131013"
        stroke={STROKE}
      />
      <rect
        x="180"
        y="372"
        width="140"
        height="58"
        rx="4"
        fill="#1E1A1E"
        stroke={STROKE}
      />
      {[196, 206, 216, 226, 236].map((x) => (
        <path key={x} d={`M${x} 384 V418`} stroke={STROKE} />
      ))}
      <rect
        x="352"
        y="386"
        width="96"
        height="30"
        rx="3"
        fill="#1E1A1E"
        stroke={STROKE_SOFT}
      />

      {/* Callouts */}
      <Callout y={131} toX={266} index="01" label="COOLER" />
      <Callout y={201} toX={250} index="02" label="M.2 NVME" />
      <Callout y={248} toX={196} index="03" label={`GPU ${gpuLengthMm}MM`} />
      <Callout y={401} toX={180} index="04" label={`PSU ${psuWatts}W`} />

      {/* Dimension: height */}
      <g stroke="rgba(255,255,255,0.3)" strokeWidth="1">
        <path d="M492 30 H512 M492 460 H512 M504 30 V460" />
        <path
          d="M500 38 L504 30 L508 38 M500 452 L504 460 L508 452"
          fill="none"
        />
      </g>
      <text
        x="530"
        y="245"
        fontSize="10"
        fill="#C9C6C9"
        letterSpacing="0.08em"
        textAnchor="middle"
        transform="rotate(-90 530 245)"
        style={MONO}
      >
        459 MM
      </text>

      {/* Dimension: depth */}
      <g stroke="rgba(255,255,255,0.3)" strokeWidth="1">
        <path d="M150 470 V490 M480 470 V490 M150 482 H480" />
        <path
          d="M158 478 L150 482 L158 486 M472 478 L480 482 L472 486"
          fill="none"
        />
      </g>
      <text
        x="315"
        y="506"
        fontSize="10"
        fill="#C9C6C9"
        letterSpacing="0.08em"
        textAnchor="middle"
        style={MONO}
      >
        352 MM
      </text>
    </svg>
  );
}
