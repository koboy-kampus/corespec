import presetsJson from "@/data/presets.json";
import type { Build } from "@/types/parts";

export interface Preset {
  id: string;
  name: string;
  tagline: string;
  highlights: string[];
  /** Target budget in integer rupiah. Phase 3 replaces this with the real sum of parts. */
  targetIDR: number;
  parts: Build["parts"];
}

export const presets: Preset[] = presetsJson as Preset[];
