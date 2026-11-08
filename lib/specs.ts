import type { Part } from "@/types/parts";

/** 2000 → "2 TB", 500 → "500 GB" */
export function formatCapacity(gb: number): string {
  return gb >= 1000 ? `${+(gb / 1000).toFixed(1)} TB` : `${gb} GB`;
}

/** Key specs for a part as short tokens, shown in mono in lists and pickers. */
export function partSpecs(part: Part): string[] {
  switch (part.category) {
    case "cpu":
      return [part.socket, `${part.cores}C/${part.threads}T`, `${part.tdpW} W`];
    case "motherboard":
      return [
        part.socket,
        part.formFactor,
        part.ddr,
        `${part.ramSlots} DIMM`,
        `${part.m2Slots}× M.2`,
      ];
    case "ram":
      return [
        `${part.ddr}-${part.speedMts}`,
        `${part.capacityGb} GB`,
        `${part.sticks}×${part.capacityGb / part.sticks} GB`,
      ];
    case "gpu":
      return [`${part.vramGb} GB`, `${part.lengthMm} mm`, `${part.tdpW} W`];
    case "storage":
      return [part.kind, formatCapacity(part.capacityGb)];
    case "psu":
      return [`${part.watts} W`, part.formFactor, part.rating];
    case "case":
      return [
        part.formFactors.join("/"),
        `GPU ≤ ${part.maxGpuMm} mm`,
        `Cooler ≤ ${part.maxCoolerMm} mm`,
        `${part.psuFF} PSU`,
      ];
    case "cooler":
      return [
        part.type,
        part.type === "Air" ? `${part.heightMm} mm` : "Liquid",
        part.sockets.join("/"),
      ];
  }
}
