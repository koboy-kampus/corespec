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
 * Desk view tones (Phase 12). A touch lighter than the PC parts, so black items
 * still read against the dark page; the screen and lights glow from their own
 * material, with no post-processing.
 */
export const DESK_TONES: Record<
  DeskTone,
  {
    color: string;
    roughness: number;
    metalness: number;
    emissive?: string;
    emissiveIntensity?: number;
    /** See-through (the PC's smoked glass). */
    opacity?: number;
  }
> = {
  desk: { color: "#6a676c", roughness: 0.75, metalness: 0.05 },
  leg: { color: "#545257", roughness: 0.4, metalness: 0.75 },
  dark: { color: "#46434a", roughness: 0.5, metalness: 0.35 },
  black: { color: "#2b292e", roughness: 0.55, metalness: 0.25 },
  steel: { color: "#7a787c", roughness: 0.35, metalness: 0.8 },
  fabric: { color: "#38353b", roughness: 0.9, metalness: 0.05 },
  pad: { color: "#242226", roughness: 0.95, metalness: 0 },
  /** The emissive map (a soft gradient) comes from the scene. */
  screen: {
    color: "#05060a",
    roughness: 0.25,
    metalness: 0.1,
    emissive: "#ffffff",
    emissiveIntensity: 0.55,
  },
  light: {
    color: "#fff4ea",
    roughness: 0.4,
    metalness: 0,
    emissive: "#fff1e0",
    emissiveIntensity: 1.4,
  },
  smoke: {
    color: "#121317",
    roughness: 0.08,
    metalness: 0.3,
    opacity: 0.55,
  },
  pcb: {
    color: "#2c3038",
    roughness: 0.7,
    metalness: 0.2,
    emissive: "#3b4256",
    emissiveIntensity: 0.25,
  },
};
