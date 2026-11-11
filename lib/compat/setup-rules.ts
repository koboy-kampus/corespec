import { frontageMm } from "@/lib/desk";
import type {
  Monitor,
  ResClass,
  ResolvedBuild,
  ResolvedSetup,
} from "@/types/parts";
import type { CompatResult } from "./rules";

/**
 * Setup rules (Phase 11). Same shape as the PC rules, but a setup choice never
 * makes a build incompatible: these return warnings or info only.
 */
export type SetupResult = CompatResult & { severity: "warning" | "info" };
export type SetupRule = (b: {
  pc: ResolvedBuild;
  setup: ResolvedSetup;
}) => SetupResult | null;

/** Rough pixel load: an ultrawide 1440p sits between 1440p and 4K. */
const RES_RANK: Record<Monitor["resolution"] | ResClass, number> = {
  "1080p": 0,
  "1440p": 1,
  UW1440p: 1.5,
  "4K": 2,
};
const RES_NAME: Record<Monitor["resolution"], string> = {
  "1080p": "1080p",
  "1440p": "1440p",
  UW1440p: "ultrawide 1440p",
  "4K": "4K",
};
/**
 * From this refresh rate up, even a GPU's own resolution class struggles to
 * keep up in current games (240 Hz and more).
 */
export const HIGH_REFRESH_HZ = 240;

/** 1015 → "101.5 cm": desk sizes read better in cm, like the desk specs. */
const cm = (mm: number) => `${+(mm / 10).toFixed(1)} cm`;

const article = (word: string) => (/^[aeiou8]/i.test(word) ? "an" : "a");

function aboveGpuClass(monitor: Monitor, target: ResClass): boolean {
  return RES_RANK[monitor.resolution] > RES_RANK[target];
}

/** Monitor resolution above what the GPU is aimed at. */
export const monitorResolution: SetupRule = ({
  pc: { gpu },
  setup: { monitor },
}) => {
  if (!gpu || !monitor || !aboveGpuClass(monitor, gpu.targetRes)) return null;
  const res = RES_NAME[monitor.resolution];
  return {
    id: "monitor-resolution",
    severity: "warning",
    message: `This GPU is aimed at ${gpu.targetRes}; ${article(res)} ${res} monitor will need lower settings.`,
    partIds: [monitor.id, gpu.id],
  };
};

/**
 * A very high refresh monitor at exactly the GPU's class. Above the class the
 * resolution warning already says enough, so this stays silent there.
 */
export const monitorRefresh: SetupRule = ({
  pc: { gpu },
  setup: { monitor },
}) => {
  if (
    !gpu ||
    !monitor ||
    monitor.refreshHz < HIGH_REFRESH_HZ ||
    RES_RANK[monitor.resolution] !== RES_RANK[gpu.targetRes]
  )
    return null;
  return {
    id: "monitor-refresh",
    severity: "info",
    message: `High refresh rates (${monitor.refreshHz} Hz) at ${RES_NAME[monitor.resolution]} are hard to reach with this GPU.`,
    partIds: [monitor.id, gpu.id],
  };
};

/** A G-Sync module only does variable refresh with an NVIDIA GPU. */
export const syncVendor: SetupRule = ({ pc: { gpu }, setup: { monitor } }) => {
  if (
    !gpu ||
    !monitor ||
    monitor.adaptiveSync !== "G-Sync" ||
    gpu.vendor === "NVIDIA"
  )
    return null;
  return {
    id: "sync-vendor",
    severity: "info",
    message:
      "This monitor's G-Sync module needs an NVIDIA GPU for variable refresh; it still works as a normal monitor.",
    partIds: [monitor.id, gpu.id],
  };
};

/** Monitor plus speakers wider than the desk. */
export const deskWidth: SetupRule = ({
  setup: { desk, monitor, speakers },
}) => {
  if (!desk || (!monitor && !speakers)) return null;
  const needed = frontageMm(monitor, speakers);
  if (needed <= desk.widthMm) return null;
  const what =
    monitor && speakers
      ? "The monitor and speakers"
      : monitor
        ? "The monitor"
        : "The speakers";
  return {
    id: "desk-width",
    severity: "warning",
    message: `${what} need about ${cm(needed)} of desk, but this desk is ${cm(desk.widthMm)} wide.`,
    partIds: [desk.id, monitor?.id, speakers?.id].filter(
      (id): id is string => !!id,
    ),
  };
};

/** Monitor bigger or heavier than the arm supports. */
export const armFit: SetupRule = ({ setup: { arm, monitor } }) => {
  if (!arm || !monitor) return null;
  const tooBig = monitor.sizeIn > arm.maxSizeIn;
  const tooHeavy = monitor.weightKg > arm.maxLoadKg;
  if (!tooBig && !tooHeavy) return null;
  const why = [
    tooBig ? `${monitor.sizeIn}″ is above its ${arm.maxSizeIn}″ limit` : "",
    tooHeavy
      ? `${monitor.weightKg} kg is above its ${arm.maxLoadKg} kg load`
      : "",
  ]
    .filter(Boolean)
    .join(", and ");
  return {
    id: "arm-fit",
    severity: "warning",
    message: `This monitor arm can't safely hold the monitor: ${why}.`,
    partIds: [arm.id, monitor.id],
  };
};

export const SETUP_RULES: SetupRule[] = [
  monitorResolution,
  monitorRefresh,
  syncVendor,
  deskWidth,
  armFit,
];
