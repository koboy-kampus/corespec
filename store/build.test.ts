import { beforeEach, describe, expect, it } from "vitest";
import { useBuildStore } from "./build";

const get = () => useBuildStore.getState();

describe("build store", () => {
  beforeEach(() => get().reset());

  it("starts empty", () => {
    expect(get().build.parts).toEqual({});
    expect(get().build.name).toBe("Untitled build");
  });

  it("sets and removes a part", () => {
    get().setPart("cpu", "cpu-amd-ryzen-5-7600");
    expect(get().build.parts.cpu).toBe("cpu-amd-ryzen-5-7600");
    get().removePart("cpu");
    expect(get().build.parts.cpu).toBeUndefined();
  });

  it("ignores unknown ids and parts in the wrong slot", () => {
    get().setPart("cpu", "nope");
    get().setPart("gpu", "cpu-amd-ryzen-5-7600");
    expect(get().build.parts).toEqual({});
  });

  it("loads a preset's parts and name", () => {
    get().loadPreset("budget-1080p");
    expect(get().build.name).toBe("Budget 1080p");
    expect(Object.keys(get().build.parts)).toHaveLength(8);
  });

  it("renames, falling back to the default for blank names", () => {
    get().rename("  My rig  ");
    expect(get().build.name).toBe("My rig");
    get().rename("   ");
    expect(get().build.name).toBe("Untitled build");
  });

  it("reset gives a fresh id", () => {
    const before = get().build.id;
    get().reset();
    expect(get().build.id).not.toBe(before);
  });
});
