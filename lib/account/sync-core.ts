import "server-only";
import { getItem } from "@/lib/parts";
import type { Supabase } from "@/lib/supabase/server";
import type { Build, Category } from "@/types/parts";
import type { Role } from "@/types/supabase";
import { mergeBuilds, type AccountBuild, type Tombstone } from "./merge";

/** The most builds one sync takes (the account keeps up to 200 live ones). */
const MAX_BUILDS = 250;
const MAX_TOMBSTONES = 500;
const DEFAULT_NAME = "Untitled build";

export interface SyncInput {
  /** The account this browser's builds belong to, as far as it knows. */
  account: string | null;
  builds: Build[];
  tombstones: Tombstone[];
}

export type SyncFailure =
  /** No valid session (never logged in, logged out, or the refresh failed). */
  | "signed-out"
  | "not-configured"
  | "invalid"
  /** The account already keeps 200 builds. */
  | "limit"
  | "error";

export type SyncResponse =
  | {
      ok: true;
      userId: string;
      displayName: string;
      role: Role;
      /**
       * True when this browser's builds belonged to another account (or to none):
       * they were not sent, and the browser should forget that account's builds.
       */
      switched: boolean;
      builds: Build[];
      deleted: string[];
    }
  | { ok: false; reason: SyncFailure; message: string };

const fail = (reason: SyncFailure, message: string): SyncResponse => ({
  ok: false,
  reason,
  message,
});

const SIGNED_OUT = "Your session has ended. Please log in again.";

function isoOrNow(v: unknown): string {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return new Date(Number.isNaN(t) ? Date.now() : t).toISOString();
}

const isId = (v: unknown): v is string =>
  typeof v === "string" && v.length >= 1 && v.length <= 64;

/** Only known items, each in its own slot; anything else is dropped. */
function cleanParts(v: unknown): Build["parts"] {
  const out: Build["parts"] = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [category, id] of Object.entries(v)) {
    if (typeof id === "string" && getItem(id)?.category === category)
      out[category as Category] = id;
  }
  return out;
}

function cleanName(v: unknown): string {
  return (typeof v === "string" ? v.trim().slice(0, 60) : "") || DEFAULT_NAME;
}

/** Checks everything the browser sent. Returns null when it isn't a sync request. */
export function readSyncInput(raw: unknown): SyncInput | null {
  if (!raw || typeof raw !== "object") return null;
  const { account, builds, tombstones } = raw as Record<string, unknown>;
  if (account !== null && !isId(account)) return null;
  if (!Array.isArray(builds) || builds.length > MAX_BUILDS) return null;
  if (!Array.isArray(tombstones) || tombstones.length > MAX_TOMBSTONES)
    return null;
  const seen = new Set<string>();
  const cleanBuilds: Build[] = [];
  for (const b of builds) {
    if (!b || typeof b !== "object") return null;
    const { id, name, parts, updatedAt } = b as Record<string, unknown>;
    if (!isId(id) || seen.has(id)) return null;
    seen.add(id);
    cleanBuilds.push({
      id,
      name: cleanName(name),
      parts: cleanParts(parts),
      updatedAt: isoOrNow(updatedAt),
    });
  }
  const cleanTombs: Tombstone[] = [];
  for (const t of tombstones) {
    if (!t || typeof t !== "object") return null;
    const { id, at } = t as Record<string, unknown>;
    if (!isId(id)) return null;
    cleanTombs.push({ id, at: isoOrNow(at) });
  }
  return { account, builds: cleanBuilds, tombstones: cleanTombs };
}

interface BuildRow {
  id: string;
  name: string;
  parts: Record<string, string>;
  updated_at: string;
  deleted_at: string | null;
}

const COLUMNS = "id, name, parts, updated_at, deleted_at";

const toAccountBuild = (r: BuildRow): AccountBuild => ({
  id: r.id,
  name: r.name,
  parts: r.parts as Build["parts"],
  updatedAt: new Date(r.updated_at).toISOString(),
  deletedAt:
    r.deleted_at === null ? null : new Date(r.deleted_at).toISOString(),
});

/**
 * One sync, as the visitor (RLS applies to every query): verify the session
 * (renewing an expired access token on the way), read the account's builds,
 * merge (lib/account/merge.ts), write what changed, and return the result.
 */
export async function runSync(
  supabase: Supabase | null,
  raw: unknown,
): Promise<SyncResponse> {
  if (!supabase) return fail("not-configured", "Accounts aren't set up.");
  const input = readSyncInput(raw);
  if (!input) return fail("invalid", "That sync request wasn't valid.");

  // getClaims() renews an expired access token with the refresh token first (and
  // the client writes the new cookies), then verifies it. If the refresh token is
  // gone or already used, there is no session: the user has to log in again.
  const { data: auth, error: authError } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (authError || !userId) return fail("signed-out", SIGNED_OUT);

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) return fail("error", "Couldn't reach your account.");
  if (!profile) return fail("signed-out", SIGNED_OUT);

  const switched = input.account !== userId;
  const local = switched ? [] : input.builds;
  const localDeleted = switched ? [] : input.tombstones;

  const { data: rows, error: readError } = await supabase
    .from("builds")
    .select(COLUMNS)
    .returns<BuildRow[]>();
  if (readError || !rows) return fail("error", "Couldn't read your builds.");

  const plan = mergeBuilds(local, localDeleted, rows.map(toAccountBuild));

  const writes = [
    ...plan.upload.map((b) => ({
      owner: userId,
      id: b.id,
      name: b.name,
      parts: b.parts as Record<string, string>,
      updated_at: b.updatedAt,
      deleted_at: null,
    })),
    ...plan.tombstones.map((t) => ({
      owner: userId,
      id: t.id,
      name: "Deleted build",
      parts: {},
      updated_at: t.at,
      deleted_at: t.at,
    })),
  ];

  let builds = plan.builds;
  if (writes.length > 0) {
    const { data: written, error: writeError } = await supabase
      .from("builds")
      .upsert(writes, { onConflict: "owner,id" })
      .select(COLUMNS)
      .returns<BuildRow[]>();
    if (writeError) {
      return writeError.hint === "build_limit"
        ? fail(
            "limit",
            "Your account already keeps 200 builds. Delete some to sync more.",
          )
        : fail("error", "Couldn't save your builds.");
    }
    // The database may adjust a write (a clock far ahead is capped), so the
    // browser takes the stored version.
    const stored = new Map(
      (written ?? [])
        .map(toAccountBuild)
        .filter((r) => r.deletedAt === null)
        .map((r) => [r.id, r]),
    );
    builds = builds.map((b) => {
      const s = stored.get(b.id);
      return s
        ? { id: s.id, name: s.name, parts: s.parts, updatedAt: s.updatedAt }
        : b;
    });
  }

  return {
    ok: true,
    userId,
    displayName: profile.display_name,
    role: profile.role,
    switched,
    builds,
    deleted: plan.deleted,
  };
}
