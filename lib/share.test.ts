import { describe, expect, it } from "vitest";
import { ALL_ITEMS, ALL_PARTS } from "@/lib/parts";
import { presets } from "@/lib/presets";
import { decodeBuild, encodeBuild, partCode, sharePath } from "./share";

describe("share codes", () => {
  it("gives every catalogue part a unique code", () => {
    const codes = new Set(ALL_PARTS.map((p) => partCode(p.id)));
    expect(codes.size).toBe(ALL_PARTS.length);
  });

  it.each(presets.map((p) => [p.name, p] as const))(
    "round-trips %s",
    (name, preset) => {
      const code = encodeBuild({ name, parts: preset.parts });
      expect(code).toMatch(/^[A-Za-z0-9._-]+$/);
      expect(code.length).toBeLessThan(80);
      expect(decodeBuild(code)).toEqual({
        name,
        parts: preset.parts,
        missing: 0,
      });
    },
  );

  it("keeps non-English names and emoji", () => {
    const code = encodeBuild({ name: "Rakitan Rei 🔥 — ñ", parts: {} });
    expect(decodeBuild(code)?.name).toBe("Rakitan Rei 🔥 — ñ");
  });

  it("names an unnamed build and handles an empty one", () => {
    expect(decodeBuild(encodeBuild({ name: "  ", parts: {} }))).toEqual({
      name: "Shared build",
      parts: {},
      missing: 0,
    });
  });

  it("skips parts that are no longer in the catalogue", () => {
    const code = encodeBuild({
      name: "Old",
      parts: { cpu: "cpu-amd-ryzen-5-7600" },
    });
    const withGhost = code.replace(".", "zzzzz.");
    expect(decodeBuild(withGhost)).toEqual({
      name: "Old",
      parts: { cpu: "cpu-amd-ryzen-5-7600" },
      missing: 1,
    });
  });

  it("rejects codes that aren't valid", () => {
    for (const bad of ["", "2abcde", "1abc", "1abcde.%%%", "1abcde.____"]) {
      expect(decodeBuild(bad)).toBeNull();
    }
  });

  it("builds the /b/ path", () => {
    expect(sharePath({ name: "", parts: {} })).toBe("/b/1");
  });
});

describe("share codes with setup items (Phase 10)", () => {
  it("gives every PC part and setup item a unique code", () => {
    const codes = new Set(ALL_ITEMS.map((p) => partCode(p.id)));
    expect(codes.size).toBe(ALL_ITEMS.length);
  });

  it("still opens a link made before setup items existed", () => {
    // A share link made before Phase 10 (1440p Sweet Spot preset).
    const old =
      "1654xbg2b3ce70ausgreibz6191dic7kuiowgv67u.MTQ0MHAgU3dlZXQgU3BvdA";
    const sweet = presets.find((p) => p.id === "sweet-spot-1440p")!;
    expect(decodeBuild(old)).toEqual({
      name: "1440p Sweet Spot",
      parts: sweet.parts,
      missing: 0,
    });
  });

  it("round-trips a PC with a full suggested setup", () => {
    const creator = presets.find((p) => p.id === "creator-workstation")!;
    const parts = { ...creator.parts, ...creator.setup };
    const code = encodeBuild({ name: "Full desk", parts });
    expect(decodeBuild(code)).toEqual({ name: "Full desk", parts, missing: 0 });
    // 20 slots x 5 characters, plus the version and name.
    expect(code.length).toBeLessThan(120);
  });
});
