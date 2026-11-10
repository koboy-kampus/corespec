import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { isSetupCategory } from "@/lib/categories";
import { getItem } from "@/lib/parts";
import { getPreset, suggestedSetupFor } from "@/lib/presets";
import type { Build, Category } from "@/types/parts";

type Parts = Build["parts"];

/**
 * The build being edited plus the library of saved builds ("My builds"), all in
 * localStorage. Every change saves automatically; there is no save button.
 *
 * skipHydration: the server can't see localStorage, so the saved build is loaded
 * after mount (call `useBuildStore.persist.rehydrate()` in a client effect) to avoid
 * React hydration mismatches.
 */

export const DEFAULT_NAME = "Untitled build";
const MAX_NAME = 60;

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyBuild(): Build {
  return {
    id: newId(),
    name: DEFAULT_NAME,
    parts: {},
    updatedAt: new Date().toISOString(),
  };
}

/**
 * localStorage in the browser; an in-memory stand-in on the server and in tests.
 * (Node 26 exposes a global `localStorage` that is undefined unless configured,
 * so we only trust window.localStorage.)
 */
function browserStorage(): Storage {
  if (typeof window !== "undefined" && window.localStorage)
    return window.localStorage;
  const mem = new Map<string, string>();
  return {
    get length() {
      return mem.size;
    },
    clear: () => mem.clear(),
    getItem: (k) => mem.get(k) ?? null,
    key: (i) => [...mem.keys()][i] ?? null,
    removeItem: (k) => void mem.delete(k),
    setItem: (k, v) => void mem.set(k, v),
  };
}

/** True for a build with no parts and the default name: not worth keeping in the library. */
export function isBlank(build: Build): boolean {
  return Object.keys(build.parts).length === 0 && build.name === DEFAULT_NAME;
}

function cleanName(name: string): string {
  return name.trim().slice(0, MAX_NAME) || DEFAULT_NAME;
}

/** Keeps only known ids (PC parts and setup items) filed under the right slot. */
export function cleanParts(parts: Parts): Parts {
  const out: Parts = {};
  for (const [category, id] of Object.entries(parts) as [Category, string][]) {
    if (getItem(id)?.category === category) out[category] = id;
  }
  return out;
}

/** Just the setup slots of a build. */
function setupOf(parts: Parts): Parts {
  return Object.fromEntries(
    Object.entries(parts).filter(([c]) => isSetupCategory(c as Category)),
  );
}

interface BuildState {
  /** The build open in the builder. */
  build: Build;
  /** Every other saved build, newest first. */
  saved: Build[];

  /** Put a part in its slot. Ignores unknown ids or a part filed under the wrong slot. */
  setPart: (category: Category, partId: string) => void;
  removePart: (category: Category) => void;
  /** Replace the PC parts with a preset's parts, and take its name. Setup items stay. */
  loadPreset: (presetId: string) => void;
  /**
   * Fill the empty setup slots with the suggested setup of the preset closest to
   * this PC. Setup items already picked are kept.
   */
  addSuggestedSetup: () => void;
  /** Rename the open build. */
  rename: (name: string) => void;

  /** Keep the open build in the library and start an empty one. */
  newBuild: () => void;
  /** Make a saved build the open one. */
  openBuild: (id: string) => void;
  renameBuild: (id: string, name: string) => void;
  /** Save a copy next to the original. Returns the copy's id. */
  duplicateBuild: (id: string) => string | undefined;
  /** Delete a build. Deleting the open one opens the newest saved build instead. */
  deleteBuild: (id: string) => void;
  /** Open a shared build as a new build of your own. */
  importBuild: (build: { name: string; parts: Parts }) => string;
}

const touch = (build: Build, patch: Partial<Build>): Build => ({
  ...build,
  ...patch,
  updatedAt: new Date().toISOString(),
});

/** The open build goes into the library unless it's blank. */
const shelve = (s: BuildState): Build[] =>
  isBlank(s.build) ? s.saved : [s.build, ...s.saved];

export const useBuildStore = create<BuildState>()(
  persist(
    (set, get) => ({
      build: emptyBuild(),
      saved: [],

      setPart: (category, partId) =>
        set((s) => {
          const part = getItem(partId);
          if (!part || part.category !== category) return s;
          return {
            build: touch(s.build, {
              parts: { ...s.build.parts, [category]: partId },
            }),
          };
        }),

      removePart: (category) =>
        set((s) => {
          const parts = { ...s.build.parts };
          delete parts[category];
          return { build: touch(s.build, { parts }) };
        }),

      loadPreset: (presetId) =>
        set((s) => {
          const preset = getPreset(presetId);
          if (!preset) return s;
          return {
            build: touch(s.build, {
              name: preset.name,
              parts: { ...setupOf(s.build.parts), ...preset.parts },
            }),
          };
        }),

      addSuggestedSetup: () =>
        set((s) => {
          const suggestion = suggestedSetupFor(s.build.parts);
          if (!suggestion) return s;
          return {
            build: touch(s.build, {
              parts: { ...suggestion.setup, ...s.build.parts },
            }),
          };
        }),

      rename: (name) =>
        set((s) => ({ build: touch(s.build, { name: cleanName(name) }) })),

      newBuild: () =>
        set((s) =>
          isBlank(s.build) ? s : { saved: shelve(s), build: emptyBuild() },
        ),

      openBuild: (id) =>
        set((s) => {
          const target = s.saved.find((b) => b.id === id);
          if (!target) return s;
          return {
            build: target,
            saved: shelve(s).filter((b) => b.id !== id),
          };
        }),

      renameBuild: (id, name) =>
        set((s) =>
          id === s.build.id
            ? { build: touch(s.build, { name: cleanName(name) }) }
            : {
                saved: s.saved.map((b) =>
                  b.id === id ? touch(b, { name: cleanName(name) }) : b,
                ),
              },
        ),

      duplicateBuild: (id) => {
        const s = get();
        const source = [s.build, ...s.saved].find((b) => b.id === id);
        if (!source) return undefined;
        const copy = touch(source, {
          id: newId(),
          name: cleanName(`${source.name} (copy)`),
          parts: { ...source.parts },
        });
        set({ saved: [copy, ...s.saved] });
        return copy.id;
      },

      deleteBuild: (id) =>
        set((s) => {
          if (id !== s.build.id)
            return { saved: s.saved.filter((b) => b.id !== id) };
          const [next, ...rest] = s.saved;
          return next ? { build: next, saved: rest } : { build: emptyBuild() };
        }),

      importBuild: ({ name, parts }) => {
        const build = touch(emptyBuild(), {
          name: cleanName(name),
          parts: cleanParts(parts),
        });
        set((s) => ({ saved: shelve(s), build }));
        return build.id;
      },
    }),
    {
      name: "corespec-build",
      version: 2,
      storage: createJSONStorage(browserStorage),
      partialize: (s) => ({ build: s.build, saved: s.saved }),
      // v1 stored only the open build; it carries over as the open build.
      migrate: (persisted, version) => {
        const old = (persisted ?? {}) as { build?: Build; saved?: Build[] };
        return {
          build: old.build ?? emptyBuild(),
          saved: version < 2 ? [] : (old.saved ?? []),
        };
      },
      skipHydration: true,
    },
  ),
);
