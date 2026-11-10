import presetsJson from "@/data/presets.json";
import { buildTotals, resolveBuild } from "@/lib/parts";
import { estimateDrawW } from "@/lib/power";
import type { Build, PcCategory, SetupCategory } from "@/types/parts";

export interface Preset {
  id: string;
  name: string;
  tagline: string;
  highlights: string[];
  /** The 8 PC parts. Their totals are fixed: the landing page relies on them. */
  parts: Partial<Record<PcCategory, string>>;
  /** A matching desk setup, offered with "Add suggested setup", never applied on load. */
  setup?: Partial<Record<SetupCategory, string>>;
}

export const presets: Preset[] = presetsJson as Preset[];

export function getPreset(id: string): Preset | undefined {
  return presets.find((p) => p.id === id);
}

/** Total and wattage computed from the preset's actual PC parts, plus its setup's total. */
export function presetSummary(preset: Preset) {
  return {
    totalIDR: buildTotals(preset.parts).pcIDR,
    drawW: estimateDrawW(resolveBuild(preset.parts)),
    setupIDR: buildTotals(preset.setup ?? {}).setupIDR,
  };
}

/**
 * The suggested setup for a build: from the preset sharing the most PC parts with
 * it, ties broken by the closest PC subtotal (so an empty or custom build gets the
 * setup of the preset nearest its budget). Undefined when no preset has a setup.
 */
export function suggestedSetupFor(
  parts: Build["parts"],
): { preset: Preset; setup: NonNullable<Preset["setup"]> } | undefined {
  const pcIDR = buildTotals(parts).pcIDR;
  const score = (p: Preset) => ({
    shared: Object.entries(p.parts).filter(
      ([c, id]) => parts[c as PcCategory] === id,
    ).length,
    gap: Math.abs(buildTotals(p.parts).pcIDR - pcIDR),
  });
  let best: { preset: Preset; shared: number; gap: number } | undefined;
  for (const preset of presets) {
    if (!preset.setup) continue;
    const s = score(preset);
    if (
      !best ||
      s.shared > best.shared ||
      (s.shared === best.shared && s.gap < best.gap)
    )
      best = { preset, ...s };
  }
  return best && best.preset.setup
    ? { preset: best.preset, setup: best.preset.setup }
    : undefined;
}
