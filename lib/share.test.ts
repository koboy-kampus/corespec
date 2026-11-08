import { describe, expect, it } from "vitest";
import { ALL_PARTS } from "@/lib/parts";
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
