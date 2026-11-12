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

describe("setup items in the build (Phase 10)", () => {
  beforeEach(() => useBuildStore.setState({ build: emptyBuild(), saved: [] }));

  it("sets setup items next to PC parts, and rejects the wrong slot", () => {
    get().setPart("monitor", "monitor-aoc-24g4");
    get().setPart("keyboard", "monitor-aoc-24g4");
    expect(get().build.parts).toEqual({ monitor: "monitor-aoc-24g4" });
  });

  it("keeps setup items when a preset replaces the PC", () => {
    get().setPart("chair", "chair-ikea-markus");
    get().loadPreset("budget-1080p");
    expect(get().build.parts.chair).toBe("chair-ikea-markus");
    expect(get().build.parts.cpu).toBe("cpu-amd-ryzen-5-5600");
  });

  it("adds the suggested setup only to empty slots", () => {
    get().loadPreset("budget-1080p");
    get().setPart("monitor", "monitor-dell-p2422h");
    get().addSuggestedSetup();
    const parts = get().build.parts;
    expect(parts.monitor).toBe("monitor-dell-p2422h");
    expect(parts.keyboard).toBe("keyboard-royal-kludge-rk84");
    expect(parts.cpu).toBe("cpu-amd-ryzen-5-5600");
  });

  it("loads a v2 save from before Phase 10 unchanged (no migration needed)", async () => {
    const options = useBuildStore.persist.getOptions();
    const saved = {
      build: {
        ...emptyBuild(),
        name: "Old rig",
        parts: { cpu: "cpu-amd-ryzen-5-7600" },
      },
      saved: [],
    };
    expect(await options.migrate?.(saved, 2)).toEqual(saved);
  });
});

describe("account builds (Phase 16)", () => {
  const ME = "user-1";
  beforeEach(() =>
    useBuildStore.setState({
      build: emptyBuild(),
      saved: [],
      account: null,
      tombstones: [],
    }),
  );
  const fill = () => get().setPart("cpu", "cpu-amd-ryzen-5-7600");

  it("makes guest builds while logged out, account builds while logged in", () => {
    fill();
    get().newBuild();
    expect(get().saved[0].owner).toBeUndefined();
    get().setAccount(ME);
    fill();
    get().newBuild();
    expect(get().build.owner).toBe(ME);
    expect(get().importBuild({ name: "Shared", parts: {} })).toBe(
      get().build.id,
    );
    expect(get().build.owner).toBe(ME);
  });

  it("leaves a tombstone when an account build is deleted, not for a guest build", () => {
    fill();
    const guestId = get().build.id;
    get().setAccount(ME);
    get().newBuild();
    fill();
    const mineId = get().build.id;
    get().deleteBuild(mineId);
    get().deleteBuild(guestId);
    expect(get().tombstones.map((t) => t.id)).toEqual([mineId]);
  });

  it("imports guest builds into the account (blank ones stay out)", () => {
    fill();
    get().newBuild();
    get().setAccount(ME);
    expect(get().importGuestBuilds()).toBe(1);
    expect(get().saved[0].owner).toBe(ME);
    expect(get().build.owner).toBeUndefined(); // the blank open build
    expect(get().importGuestBuilds()).toBe(0);
  });

  it("forgets the account's builds on logout and keeps guest builds", () => {
    fill();
    get().newBuild(); // guest build saved
    get().setAccount(ME);
    fill();
    get().newBuild();
    fill(); // the open build is the account's
    get().forgetAccount();
    expect(get().account).toBeNull();
    expect(get().build.owner).toBeUndefined();
    expect([get().build, ...get().saved].every((b) => !b.owner)).toBe(true);
    expect(get().tombstones).toEqual([]);
  });

  it("forgets an earlier account's builds when another account logs in", () => {
    get().setAccount("someone-else");
    fill();
    get().newBuild();
    get().setAccount(ME);
    expect([get().build, ...get().saved].some((b) => b.owner)).toBe(false);
    expect(get().account).toBe(ME);
  });

  it("applies a sync: account builds come down marked as the account's", () => {
    get().setAccount(ME);
    get().applyAccountSync(
      { builds: [], tombstones: [] },
      {
        builds: [
          {
            id: "r",
            name: "From phone",
            parts: {},
            updatedAt: "2026-11-12T08:00:00.000Z",
          },
        ],
        deleted: [],
      },
    );
    expect(get().saved.map((b) => [b.id, b.owner])).toEqual([["r", ME]]);
  });
});
