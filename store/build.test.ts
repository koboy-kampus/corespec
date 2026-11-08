import { beforeEach, describe, expect, it } from "vitest";
import { emptyBuild, useBuildStore } from "./build";

const get = () => useBuildStore.getState();

describe("build store", () => {
  beforeEach(() => useBuildStore.setState({ build: emptyBuild(), saved: [] }));

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
});

describe("build library", () => {
  beforeEach(() => useBuildStore.setState({ build: emptyBuild(), saved: [] }));

  it("keeps the open build when starting a new one, but not a blank one", () => {
    get().newBuild();
    expect(get().saved).toHaveLength(0);
    get().loadPreset("budget-1080p");
    const first = get().build.id;
    get().newBuild();
    expect(get().saved.map((b) => b.id)).toEqual([first]);
    expect(get().build.parts).toEqual({});
  });

  it("opens a saved build and shelves the current one", () => {
    get().loadPreset("budget-1080p");
    const a = get().build.id;
    get().newBuild();
    get().loadPreset("creator-workstation");
    const b = get().build.id;
    get().openBuild(a);
    expect(get().build.id).toBe(a);
    expect(get().saved.map((x) => x.id)).toEqual([b]);
    get().openBuild("missing");
    expect(get().build.id).toBe(a);
  });

  it("renames and duplicates any build", () => {
    get().loadPreset("budget-1080p");
    const id = get().build.id;
    const copy = get().duplicateBuild(id);
    expect(copy).toBeDefined();
    expect(get().saved[0].name).toBe("Budget 1080p (copy)");
    expect(get().saved[0].parts).toEqual(get().build.parts);
    get().renameBuild(copy!, "  Spare  ");
    expect(get().saved[0].name).toBe("Spare");
    get().renameBuild(id, "Main");
    expect(get().build.name).toBe("Main");
  });

  it("deleting the open build opens the newest saved one", () => {
    get().loadPreset("budget-1080p");
    const a = get().build.id;
    get().newBuild();
    get().loadPreset("creator-workstation");
    get().deleteBuild(get().build.id);
    expect(get().build.id).toBe(a);
    expect(get().saved).toEqual([]);
    get().deleteBuild(a);
    expect(get().build.parts).toEqual({});
  });

  it("imports a shared build as a new build, dropping bad parts", () => {
    get().loadPreset("budget-1080p");
    const id = get().importBuild({
      name: "From Rei",
      parts: { cpu: "cpu-amd-ryzen-5-7600", gpu: "cpu-amd-ryzen-5-7600" },
    });
    expect(get().build.id).toBe(id);
    expect(get().build.parts).toEqual({ cpu: "cpu-amd-ryzen-5-7600" });
    expect(get().saved[0].name).toBe("Budget 1080p");
  });

  it("migrates a v1 save (one build) into the library", async () => {
    const options = useBuildStore.persist.getOptions();
    const v1 = { build: { ...emptyBuild(), name: "Old rig" } };
    const migrated = (await options.migrate?.(v1, 1)) as {
      build: { name: string };
      saved: unknown[];
    };
    expect(migrated.build.name).toBe("Old rig");
    expect(migrated.saved).toEqual([]);
  });
});
