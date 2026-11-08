import presetsJson from "@/data/presets.json";
import { buildTotalIDR, resolveBuild } from "@/lib/parts";
import { estimateDrawW } from "@/lib/power";
import type { Build } from "@/types/parts";

export interface Preset {
  id: string;
  name: string;
  tagline: string;
  highlights: string[];
  parts: Build["parts"];
}

export const presets: Preset[] = presetsJson as Preset[];

export function getPreset(id: string): Preset | undefined {
  return presets.find((p) => p.id === id);
}

/** Total and wattage computed from the preset's actual parts. */
export function presetSummary(preset: Preset) {
  return {
    totalIDR: buildTotalIDR(preset.parts),
    drawW: estimateDrawW(resolveBuild(preset.parts)),
  };
}
