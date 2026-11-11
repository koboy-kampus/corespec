import type { DeskTone } from "@/lib/viewer/desk-layout";
import type { Tone } from "@/lib/viewer/layout";

/** Three.js can't read CSS variables, so the viewer keeps its own copies of the brand colours. */
export const ACCENT = "#fe2e4b";
export const WARN = "#f5b544";
export const GLOW = { error: ACCENT, warning: WARN } as const;
export type Flag = keyof typeof GLOW;

/** One material look per tone, kept dark so the coral glow stands out. */
export const TONES: Record<
  Tone,
  { color: string; roughness: number; metalness: number }
> = {
  pcb: { color: "#2a2f38", roughness: 0.75, metalness: 0.2 },
  silver: { color: "#b9b6b9", roughness: 0.3, metalness: 0.9 },
  dark: { color: "#38343c", roughness: 0.45, metalness: 0.45 },
  fin: { color: "#b3b0b3", roughness: 0.35, metalness: 0.85 },
  ram: { color: "#45404a", roughness: 0.4, metalness: 0.6 },
  storage: { color: "#4a474c", roughness: 0.5, metalness: 0.4 },
  psu: { color: "#2b282e", roughness: 0.6, metalness: 0.4 },
  steel: { color: "#5a575b", roughness: 0.35, metalness: 0.85 },
  gold: { color: "#b8913a", roughness: 0.35, metalness: 0.9 },
  black: { color: "#141215", roughness: 0.5, metalness: 0.3 },
};

export const CASE_TONE = { color: "#221f23", roughness: 0.55, metalness: 0.55 };

/**
 * Desk view tones (Phase 12). Same dark look as the PC parts; the three emissive
 * tones (screen, light, glass) glow from their own material, with no post-processing.
 */
export const DESK_TONES: Record<
  DeskTone,
  {
    color: string;
    roughness: number;
    metalness: number;
    emissive?: string;
    emissiveIntensity?: number;
  }
> = {
  desk: { color: "#3b373e", roughness: 0.7, metalness: 0.15 },
  leg: { color: "#4a474c", roughness: 0.4, metalness: 0.8 },
  dark: { color: "#38343c", roughness: 0.45, metalness: 0.45 },
  black: { color: "#141215", roughness: 0.5, metalness: 0.3 },
  steel: { color: "#5a575b", roughness: 0.35, metalness: 0.85 },
  fabric: { color: "#232026", roughness: 0.9, metalness: 0.05 },
  pad: { color: "#18161a", roughness: 0.95, metalness: 0 },
  screen: {
    color: "#0b0d14",
    roughness: 0.2,
    metalness: 0.1,
    emissive: "#5b6fae",
    emissiveIntensity: 0.4,
  },
  light: {
    color: "#fff4ea",
    roughness: 0.4,
    metalness: 0,
    emissive: "#fff1e0",
    emissiveIntensity: 1.4,
  },
  glass: {
    color: "#1a1c22",
    roughness: 0.1,
    metalness: 0.2,
    emissive: "#8d9bd0",
    emissiveIntensity: 0.12,
  },
};
