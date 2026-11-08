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
};

export const CASE_TONE = { color: "#221f23", roughness: 0.55, metalness: 0.55 };

/**
 * Bundled models arrive with bright "PCB green" materials. These names are
 * recoloured to the CoreSpec palette; any other material keeps its own look.
 */
export const MODEL_RECOLOUR: Record<
  string,
  { color: string; roughness: number; metalness: number }
> = {
  Green: TONES.pcb,
  black: { color: "#141215", roughness: 0.5, metalness: 0.3 },
  conduct: { color: "#b8913a", roughness: 0.35, metalness: 0.9 },
};
