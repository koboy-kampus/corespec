import { describe, expect, it } from "vitest";
import { applyCatalogueOverlay, getItem } from "@/lib/parts";
import type { Item } from "@/types/parts";
import {
  deleteBlock,
  isSeedItem,
  presetsUsing,
  SEED_MESSAGE,
} from "./item-delete";

const free = { seed: false, presets: [], usage: 0 };

describe("item delete guard", () => {
  it("refuses an item from the repo's JSON: deactivate instead", () => {
    expect(deleteBlock({ ...free, seed: true })).toEqual({
      reason: "seed",
      message: SEED_MESSAGE,
    });
    expect(SEED_MESSAGE).toBe(
      "Catalogue item from the repo: deactivate instead.",
    );
  });

  it("refuses an item a preset uses", () => {
    expect(deleteBlock({ ...free, presets: ["Budget 1080p"] })).toEqual({
      reason: "preset",
      message: "Used by the preset Budget 1080p, so it can't be deleted.",
    });
  });

  it("refuses an item saved builds use, with the count", () => {
    expect(deleteBlock({ ...free, usage: 1 })?.message).toBe(
      "Used in 1 saved build — deactivate instead.",
    );
    expect(deleteBlock({ ...free, usage: 3 })).toEqual({
      reason: "used",
      message: "Used in 3 saved builds — deactivate instead.",
    });
  });

  it("refuses when the usage couldn't be checked", () => {
    expect(deleteBlock({ ...free, usage: null })?.reason).toBe("unknown");
  });

  it("allows a free item: not in the repo, no preset, no saved build", () => {
    expect(deleteBlock(free)).toBeNull();
  });

  it("puts the repo first: a seed item is refused even when nothing uses it", () => {
    expect(deleteBlock({ seed: true, presets: ["X"], usage: 5 })?.reason).toBe(
      "seed",
    );
  });
});

describe("what the guard is told", () => {
  it("knows the repo's items, also while the database overlay is applied", () => {
    const cpu = getItem("cpu-amd-ryzen-5-5600")!;
    expect(isSeedItem(cpu.id)).toBe(true);
    const added = { ...cpu, id: "cpu-admin-added-guard", name: "New" } as Item;
    applyCatalogueOverlay({ key: "guard", items: [added] });
    expect(getItem(added.id)).toBeDefined();
    expect(isSeedItem(added.id)).toBe(false);
    expect(isSeedItem(cpu.id)).toBe(true);
    applyCatalogueOverlay(null);
  });

  it("finds the presets that use an item, PC parts and setup items alike", () => {
    expect(presetsUsing("cpu-amd-ryzen-5-5600").length).toBeGreaterThan(0);
    expect(presetsUsing("cpu-admin-added-guard")).toEqual([]);
  });
});
