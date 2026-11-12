import type { Build } from "@/types/parts";

/**
 * How builds in this browser and builds in the account come together (Phase 16).
 * Pure functions, so every rule is unit-tested (merge.test.ts):
 *
 * - The newest edit of a build wins (by `updatedAt`).
 * - Deleting wins over everything. A deleted build leaves a tombstone, here (until
 *   the next sync) and then in the account for good, so a stale copy in another
 *   browser can never upload it again.
 * - Builds that only live in this browser (guest builds, no `owner`) are never
 *   sent anywhere; they join the account only when the user imports them.
 */

/** A build as the account keeps it: deleted ones stay as tombstones. */
export interface AccountBuild {
  id: string;
  name: string;
  parts: Build["parts"];
  updatedAt: string;
  deletedAt: string | null;
}

/** A build deleted in this browser that the account hasn't heard about yet. */
export interface Tombstone {
  id: string;
  /** When it was deleted (ISO). */
  at: string;
}

export interface MergePlan {
  /** Live builds to write to the account: new ones, or newer than the account's. */
  upload: Build[];
  /** Tombstones to write to the account. */
  tombstones: Tombstone[];
  /** The account's live builds after the writes, newest first. */
  builds: Build[];
  /** Ids that are deleted in the account (this browser must drop them). */
  deleted: string[];
}

const time = (iso: string) => {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
};

export const newestFirst = (
  a: { updatedAt: string },
  b: { updatedAt: string },
) => time(b.updatedAt) - time(a.updatedAt);

/**
 * Merges this browser's account builds (`local`, all with this account as owner)
 * and its pending deletes (`localDeleted`) with what the account holds (`remote`).
 */
export function mergeBuilds(
  local: Build[],
  localDeleted: Tombstone[],
  remote: AccountBuild[],
): MergePlan {
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const deletedHere = new Map(localDeleted.map((t) => [t.id, t]));
  const upload: Build[] = [];
  const tombstones: Tombstone[] = [];
  const builds = new Map<string, Build>();
  const deleted = new Set<string>();

  for (const r of remote) {
    if (r.deletedAt !== null) deleted.add(r.id);
  }

  // Deletes from this browser: always win, even over a newer edit elsewhere.
  for (const t of localDeleted) {
    deleted.add(t.id);
    if (remoteById.get(t.id)?.deletedAt == null) tombstones.push(t);
  }

  for (const b of local) {
    if (deleted.has(b.id) || deletedHere.has(b.id)) continue;
    const r = remoteById.get(b.id);
    if (r && time(r.updatedAt) >= time(b.updatedAt)) {
      builds.set(b.id, fromAccount(r));
    } else {
      upload.push(b);
      builds.set(b.id, {
        id: b.id,
        name: b.name,
        parts: b.parts,
        updatedAt: b.updatedAt,
      });
    }
  }

  for (const r of remote) {
    if (r.deletedAt !== null || deleted.has(r.id) || builds.has(r.id)) continue;
    builds.set(r.id, fromAccount(r));
  }

  return {
    upload,
    tombstones,
    builds: [...builds.values()].sort(newestFirst),
    deleted: [...deleted],
  };
}

/** The account's copy, without an owner (the browser adds its own, see applySync). */
function fromAccount(r: AccountBuild): Build {
  return { id: r.id, name: r.name, parts: r.parts, updatedAt: r.updatedAt };
}

/** What this browser keeps: the open build and the library. */
export interface LocalBuilds {
  build: Build;
  saved: Build[];
  tombstones: Tombstone[];
}

/** What a sync sent, so changes made while it was in flight are kept. */
export interface SyncSent {
  builds: Build[];
  tombstones: Tombstone[];
}

/** What the account said back. */
export interface SyncResult {
  builds: Build[];
  deleted: string[];
}

/**
 * Applies a finished sync to this browser's builds:
 * - builds deleted in the account go (the open one too: the newest other build
 *   opens instead, or `blank()` when none is left);
 * - account builds replace this browser's copy, unless it was edited again while
 *   the sync was in flight (then the next sync sends that edit);
 * - account builds this browser doesn't have yet are added to the library;
 * - tombstones the account now has are forgotten here.
 * Guest builds are never touched.
 */
export function applySync(
  state: LocalBuilds,
  sent: SyncSent,
  result: SyncResult,
  owner: string,
  blank: () => Build,
): LocalBuilds {
  const sentById = new Map(sent.builds.map((b) => [b.id, b]));
  const fromAccount = new Map(
    result.builds.map((b) => [b.id, { ...b, owner }]),
  );
  const deleted = new Set(result.deleted);
  const sentTombs = new Set(sent.tombstones.map((t) => t.id));
  const pendingTombs = state.tombstones.filter((t) => !sentTombs.has(t.id));
  const pendingIds = new Set(pendingTombs.map((t) => t.id));

  const settle = (b: Build): Build | null => {
    if (b.owner !== owner) return b; // a guest build (or another account's)
    if (deleted.has(b.id)) return null;
    const theirs = fromAccount.get(b.id);
    if (!theirs) return b; // created while the sync was in flight
    const before = sentById.get(b.id);
    const editedSince = before ? before.updatedAt !== b.updatedAt : false;
    return editedSince ? b : theirs;
  };

  const known = new Set([state.build, ...state.saved].map((b) => b.id));
  const added = result.builds
    .filter(
      (b) => !known.has(b.id) && !deleted.has(b.id) && !pendingIds.has(b.id),
    )
    .map((b) => fromAccount.get(b.id)!);

  const saved = [
    ...state.saved.map(settle).filter((b): b is Build => b !== null),
    ...added,
  ].sort(newestFirst);

  const open = settle(state.build);
  if (open) return { build: open, saved, tombstones: pendingTombs };
  const [next, ...rest] = saved;
  return next
    ? { build: next, saved: rest, tombstones: pendingTombs }
    : { build: blank(), saved, tombstones: pendingTombs };
}

/** Builds that would go into the account on import: guest builds worth keeping. */
export function guestBuilds(
  state: Pick<LocalBuilds, "build" | "saved">,
  isBlank: (b: Build) => boolean,
): Build[] {
  return [state.build, ...state.saved].filter((b) => !b.owner && !isBlank(b));
}
