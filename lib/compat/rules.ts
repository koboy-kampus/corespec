import { CATEGORIES, CATEGORY_LABEL } from "@/lib/categories";
import { formatMM, formatWatts } from "@/lib/format";
import { estimateDrawW, POWER, recommendedPsuW } from "@/lib/power";
import type { ResolvedBuild } from "@/types/parts";

export type Severity = "error" | "warning" | "info";

export interface CompatResult {
  id: string;
  severity: Severity;
  message: string;
  /** Parts involved, so the UI and 3D viewer can flag them. */
  partIds: string[];
}

/** A rule returns a result when something is wrong, or null when it passes / doesn't apply. */
export type Rule = (build: ResolvedBuild) => CompatResult | null;

export const cpuSocket: Rule = ({ cpu, motherboard }) => {
  if (!cpu || !motherboard || cpu.socket === motherboard.socket) return null;
  return {
    id: "cpu-socket",
    severity: "error",
    message: `The CPU uses ${cpu.socket}, but the motherboard has an ${motherboard.socket} socket.`,
    partIds: [cpu.id, motherboard.id],
  };
};

export const memoryType: Rule = ({ ram, motherboard }) => {
  if (!ram || !motherboard || ram.ddr === motherboard.ddr) return null;
  return {
    id: "memory-type",
    severity: "error",
    message: `The memory is ${ram.ddr}, but the motherboard only takes ${motherboard.ddr}.`,
    partIds: [ram.id, motherboard.id],
  };
};

export const ramSlots: Rule = ({ ram, motherboard }) => {
  if (!ram || !motherboard || ram.sticks <= motherboard.ramSlots) return null;
  return {
    id: "ram-slots",
    severity: "error",
    message: `This kit has ${ram.sticks} sticks, but the motherboard only has ${motherboard.ramSlots} slots.`,
    partIds: [ram.id, motherboard.id],
  };
};

export const boardFitsCase: Rule = ({ motherboard, case: pcCase }) => {
  if (
    !motherboard ||
    !pcCase ||
    pcCase.formFactors.includes(motherboard.formFactor)
  )
    return null;
  return {
    id: "board-fits-case",
    severity: "error",
    message: `An ${motherboard.formFactor} motherboard doesn't fit this case (it takes ${pcCase.formFactors.join(", ")}).`,
    partIds: [motherboard.id, pcCase.id],
  };
};

export const gpuClearance: Rule = ({ gpu, case: pcCase }) => {
  if (!gpu || !pcCase || gpu.lengthMm <= pcCase.maxGpuMm) return null;
  return {
    id: "gpu-clearance",
    severity: "error",
    message: `The graphics card is ${formatMM(gpu.lengthMm)} long, but the case fits up to ${formatMM(pcCase.maxGpuMm)}.`,
    partIds: [gpu.id, pcCase.id],
  };
};

export const coolerClearance: Rule = ({ cooler, case: pcCase }) => {
  if (
    !cooler ||
    !pcCase ||
    cooler.type !== "Air" ||
    cooler.heightMm <= pcCase.maxCoolerMm
  ) {
    return null;
  }
  return {
    id: "cooler-clearance",
    severity: "error",
    message: `The cooler is ${formatMM(cooler.heightMm)} tall, but the case fits up to ${formatMM(pcCase.maxCoolerMm)}.`,
    partIds: [cooler.id, pcCase.id],
  };
};

export const coolerSocket: Rule = ({ cpu, cooler }) => {
  if (!cpu || !cooler || cooler.sockets.includes(cpu.socket)) return null;
  return {
    id: "cooler-socket",
    severity: "error",
    message: `The cooler doesn't support the ${cpu.socket} socket (it supports ${cooler.sockets.join(", ")}).`,
    partIds: [cooler.id, cpu.id],
  };
};

/** SFX supplies fit ATX bays; ATX supplies don't fit SFX-only cases. */
export const psuSize: Rule = ({ psu, case: pcCase }) => {
  if (!psu || !pcCase || pcCase.psuFF === "ATX" || psu.formFactor === "SFX")
    return null;
  return {
    id: "psu-size",
    severity: "error",
    message: "This case only takes an SFX power supply, and this one is ATX.",
    partIds: [psu.id, pcCase.id],
  };
};

export const psuHeadroom: Rule = (build) => {
  const { psu } = build;
  if (!psu || (!build.cpu && !build.gpu)) return null;
  const draw = estimateDrawW(build);
  const involved = [psu.id, build.cpu?.id, build.gpu?.id].filter(
    (id): id is string => !!id,
  );
  if (psu.watts < draw) {
    return {
      id: "psu-headroom",
      severity: "error",
      message: `The ${formatWatts(psu.watts)} PSU is below the estimated draw of ${formatWatts(draw)}.`,
      partIds: involved,
    };
  }
  if (psu.watts < draw * POWER.headroom) {
    return {
      id: "psu-headroom",
      severity: "warning",
      message: `Low headroom: aim for at least ${formatWatts(recommendedPsuW(draw))} for an estimated draw of ${formatWatts(draw)}.`,
      partIds: involved,
    };
  }
  return null;
};

export const missingParts: Rule = (build) => {
  const missing = CATEGORIES.filter((c) => !build[c]);
  if (missing.length === 0) return null;
  return {
    id: "missing-parts",
    severity: "info",
    message: `Still to pick: ${missing.map((c) => CATEGORY_LABEL[c]).join(", ")}.`,
    partIds: [],
  };
};

export const RULES: Rule[] = [
  cpuSocket,
  memoryType,
  ramSlots,
  boardFitsCase,
  gpuClearance,
  coolerClearance,
  coolerSocket,
  psuSize,
  psuHeadroom,
  missingParts,
];
