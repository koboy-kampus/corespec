import { check } from "@/lib/compat/check";
import { CATEGORY_LABEL } from "@/lib/categories";
import { formatMM } from "@/lib/format";
import { buildTotalIDR, partLabel, resolveBuild } from "@/lib/parts";
import { estimateDrawW } from "@/lib/power";
import { getPreset } from "@/lib/presets";
import type { Category } from "@/types/parts";

/**
 * Everything the landing page shows about "an example build" is derived from one
 * real preset, so the hero card, bento tiles and catalogue never disagree.
 */
const PRESET_ID = "sweet-spot-1440p";
const preset = getPreset(PRESET_ID);
if (!preset)
  throw new Error(
    `Showcase preset "${PRESET_ID}" is missing from data/presets.json`,
  );

const parts = resolveBuild(preset.parts);
const { cpu, motherboard, ram, gpu, cooler, case: pcCase, psu } = parts;
if (!cpu || !motherboard || !ram || !gpu || !cooler || !pcCase || !psu) {
  throw new Error(`Showcase preset "${PRESET_ID}" must fill every slot`);
}

const totalIDR = buildTotalIDR(preset.parts);
const ROW_ORDER: Category[] = [
  "cpu",
  "gpu",
  "motherboard",
  "ram",
  "storage",
  "psu",
];

export interface ShowcaseRow {
  category: Category;
  name: string;
  priceIDR: number;
}

/** Share of the total per category: the three biggest, then everything else as "Other". */
function costSplit() {
  const byCat = Object.values(parts)
    .map((p) => ({ label: CATEGORY_LABEL[p.category], price: p.priceIDR }))
    .sort((a, b) => b.price - a.price);
  const top = byCat.slice(0, 3);
  const other = byCat.slice(3).reduce((s, p) => s + p.price, 0);
  const rows = [...top, { label: "Other", price: other }];
  return rows.map((r) => ({
    label: r.label,
    pct: Math.round((r.price / totalIDR) * 100),
  }));
}

export const showcase = {
  presetId: PRESET_ID,
  /** The resolved parts, for the hero 3D scene. */
  parts,
  name: preset.name,
  totalIDR,
  partCount: Object.keys(parts).length,
  compatible: check(preset.parts).length === 0,
  drawW: estimateDrawW(parts),
  psuWatts: psu.watts,
  rows: ROW_ORDER.flatMap((c): ShowcaseRow[] => {
    const p = parts[c];
    return p ? [{ category: c, name: partLabel(p), priceIDR: p.priceIDR }] : [];
  }),
  costSplit: costSplit(),
  checks: [
    { label: "CPU socket", value: `${cpu.socket} = ${motherboard.socket}` },
    { label: "Memory type", value: `${ram.ddr} = ${motherboard.ddr}` },
    {
      label: "GPU length",
      value: `${formatMM(gpu.lengthMm)} / ${formatMM(pcCase.maxGpuMm)}`,
    },
    {
      label: "Cooler height",
      value: `${formatMM(cooler.heightMm)} / ${formatMM(pcCase.maxCoolerMm)}`,
    },
  ],
  gpu: { name: partLabel(gpu), priceIDR: gpu.priceIDR, lengthMm: gpu.lengthMm },
};
