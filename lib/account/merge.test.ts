import { describe, expect, it } from "vitest";
import type { Build } from "@/types/parts";
import {
  applySync,
  guestBuilds,
  mergeBuilds,
  type AccountBuild,
  type LocalBuilds,
} from "./merge";

const ME = "user-1";
const T = (h: number) => `2026-11-12T${String(h).padStart(2, "0")}:00:00.000Z`;

const mine = (id: string, h: number, name = id): Build => ({
  id,
  name,
  parts: { cpu: "cpu-amd-ryzen-5-7600" },
  updatedAt: T(h),
  owner: ME,
});
const guest = (id: string, h: number): Build => ({
  id,
  name: id,
  parts: { cpu: "cpu-amd-ryzen-5-7600" },
  updatedAt: T(h),
});
const theirs = (id: string, h: number, name = id): AccountBuild => ({
  id,
  name,
  parts: { gpu: "x" },
  updatedAt: T(h),
  deletedAt: null,
});
const tomb = (id: string, h: number): AccountBuild => ({
  id,
  name: "Deleted build",
  parts: {},
  updatedAt: T(h),
  deletedAt: T(h),
});
const ids = (bs: { id: string }[]) => bs.map((b) => b.id);

describe("mergeBuilds", () => {
  it("uploads builds the account doesn't have", () => {
    const plan = mergeBuilds([mine("a", 1)], [], []);
    expect(ids(plan.upload)).toEqual(["a"]);
    expect(ids(plan.builds)).toEqual(["a"]);
    expect(plan.tombstones).toEqual([]);
  });

  it("brings down builds only the account has", () => {
    const plan = mergeBuilds([], [], [theirs("r", 2)]);
    expect(plan.upload).toEqual([]);
    expect(ids(plan.builds)).toEqual(["r"]);
  });

  it("keeps the newest edit on either side", () => {
    const plan = mergeBuilds(
      [mine("a", 5, "local a"), mine("b", 1, "local b")],
      [],
      [theirs("a", 3, "remote a"), theirs("b", 4, "remote b")],
    );
    expect(ids(plan.upload)).toEqual(["a"]);
    expect(plan.builds.map((b) => b.name)).toEqual(["local a", "remote b"]);
  });

  it("takes the account's copy on a tie (nothing to upload)", () => {
    const plan = mergeBuilds([mine("a", 3)], [], [theirs("a", 3, "remote")]);
    expect(plan.upload).toEqual([]);
    expect(plan.builds[0].name).toBe("remote");
  });

  it("sends a delete as a tombstone and drops the build", () => {
    const plan = mergeBuilds([], [{ id: "a", at: T(6) }], [theirs("a", 2)]);
    expect(plan.tombstones).toEqual([{ id: "a", at: T(6) }]);
    expect(plan.builds).toEqual([]);
    expect(plan.deleted).toContain("a");
  });

  it("lets a delete win over a newer edit in the account", () => {
    const plan = mergeBuilds([], [{ id: "a", at: T(1) }], [theirs("a", 9)]);
    expect(plan.tombstones).toHaveLength(1);
    expect(plan.builds).toEqual([]);
  });

  it("writes a tombstone even for a build the account never got", () => {
    const plan = mergeBuilds([], [{ id: "a", at: T(1) }], []);
    expect(plan.tombstones).toEqual([{ id: "a", at: T(1) }]);
  });

  it("doesn't write a tombstone the account already has", () => {
    const plan = mergeBuilds([], [{ id: "a", at: T(1) }], [tomb("a", 1)]);
    expect(plan.tombstones).toEqual([]);
    expect(plan.deleted).toEqual(["a"]);
  });

  it("never re-uploads a build deleted in another browser, even a newer stale copy", () => {
    // Browser B still has "a" (edited at 9:00) but browser A deleted it at 2:00.
    const plan = mergeBuilds([mine("a", 9)], [], [tomb("a", 2)]);
    expect(plan.upload).toEqual([]);
    expect(plan.builds).toEqual([]);
    expect(plan.deleted).toEqual(["a"]);
  });

  it("sorts the result newest first and strips the owner", () => {
    const plan = mergeBuilds([mine("a", 1)], [], [theirs("b", 2)]);
    expect(ids(plan.builds)).toEqual(["b", "a"]);
    expect(plan.builds.every((b) => b.owner === undefined)).toBe(true);
  });
});

describe("applySync", () => {
  const blank = (): Build => ({
    id: "blank",
    name: "Untitled build",
    parts: {},
    updatedAt: T(0),
  });
  const state = (over: Partial<LocalBuilds>): LocalBuilds => ({
    build: guest("g-open", 1),
    saved: [],
    tombstones: [],
    ...over,
  });

  it("adds account builds this browser doesn't have, marked as the account's", () => {
    const next = applySync(
      state({}),
      { builds: [], tombstones: [] },
      { builds: [{ ...theirs("r", 3), owner: undefined }], deleted: [] },
      ME,
      blank,
    );
    expect(ids(next.saved)).toEqual(["r"]);
    expect(next.saved[0].owner).toBe(ME);
    expect(next.build.id).toBe("g-open");
  });

  it("replaces a build with the account's copy", () => {
    const a = mine("a", 1, "old");
    const next = applySync(
      state({ saved: [a] }),
      { builds: [a], tombstones: [] },
      { builds: [{ ...mine("a", 4, "new"), owner: undefined }], deleted: [] },
      ME,
      blank,
    );
    expect(next.saved).toEqual([mine("a", 4, "new")]);
  });

  it("keeps an edit made while the sync was in flight", () => {
    const sent = mine("a", 1, "sent");
    const editedSince = mine("a", 2, "edited since");
    const next = applySync(
      state({ saved: [editedSince] }),
      { builds: [sent], tombstones: [] },
      { builds: [mine("a", 1, "sent")], deleted: [] },
      ME,
      blank,
    );
    expect(next.saved[0].name).toBe("edited since");
  });

  it("removes builds deleted in the account, and opens another if the open one goes", () => {
    const next = applySync(
      state({ build: mine("a", 5), saved: [mine("b", 3), guest("g", 4)] }),
      { builds: [mine("a", 5), mine("b", 3)], tombstones: [] },
      { builds: [mine("b", 3)], deleted: ["a"] },
      ME,
      blank,
    );
    expect(next.build.id).toBe("g");
    expect(ids(next.saved)).toEqual(["b"]);
  });

  it("opens a blank build when nothing is left", () => {
    const next = applySync(
      state({ build: mine("a", 5) }),
      { builds: [mine("a", 5)], tombstones: [] },
      { builds: [], deleted: ["a"] },
      ME,
      blank,
    );
    expect(next.build.id).toBe("blank");
    expect(next.saved).toEqual([]);
  });

  it("forgets tombstones that were sent, keeps ones added in flight", () => {
    const next = applySync(
      state({
        tombstones: [
          { id: "x", at: T(1) },
          { id: "y", at: T(2) },
        ],
      }),
      { builds: [], tombstones: [{ id: "x", at: T(1) }] },
      { builds: [], deleted: ["x"] },
      ME,
      blank,
    );
    expect(next.tombstones).toEqual([{ id: "y", at: T(2) }]);
  });

  it("doesn't bring back a build deleted here while the sync was in flight", () => {
    const next = applySync(
      state({ tombstones: [{ id: "r", at: T(5) }] }),
      { builds: [], tombstones: [] },
      { builds: [theirs("r", 3)], deleted: [] },
      ME,
      blank,
    );
    expect(next.saved).toEqual([]);
  });

  it("never touches guest builds", () => {
    const g = guest("g", 2);
    const next = applySync(
      state({ build: g, saved: [guest("h", 1)] }),
      { builds: [], tombstones: [] },
      { builds: [], deleted: ["g", "h"] },
      ME,
      blank,
    );
    expect(next.build).toBe(g);
    expect(ids(next.saved)).toEqual(["h"]);
  });
});

describe("guestBuilds", () => {
  it("lists builds without an owner that are worth keeping", () => {
    const empty: Build = {
      id: "e",
      name: "Untitled build",
      parts: {},
      updatedAt: T(1),
    };
    const list = guestBuilds(
      { build: empty, saved: [guest("g", 1), mine("m", 2)] },
      (b) => Object.keys(b.parts).length === 0,
    );
    expect(ids(list)).toEqual(["g"]);
  });
});
