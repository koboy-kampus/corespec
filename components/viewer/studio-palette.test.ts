import { describe, expect, it } from "vitest";
import { DESK_TONES, TONES } from "./palette";
import { isDarkColour } from "./studio-palette";

describe("the receipt studio's dark-material rule (Phase 20b)", () => {
  it("outlines black and charcoal items", () => {
    for (const tone of ["black", "dark", "pad", "fabric", "mesh"] as const)
      expect(isDarkColour(DESK_TONES[tone].color), tone).toBe(true);
    for (const tone of ["black", "psu", "pcb"] as const)
      expect(isDarkColour(TONES[tone].color), tone).toBe(true);
  });

  it("leaves light, wooden and metal materials alone", () => {
    for (const tone of ["wood", "steel", "desk", "light"] as const)
      expect(isDarkColour(DESK_TONES[tone].color), tone).toBe(false);
    for (const tone of ["silver", "fin", "gold"] as const)
      expect(isDarkColour(TONES[tone].color), tone).toBe(false);
    expect(isDarkColour("#ffffff")).toBe(false);
    expect(isDarkColour(undefined)).toBe(false);
  });
});
