import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getPart } from "@/lib/parts";
import { getPreset } from "@/lib/presets";
import type { Build, Category } from "@/types/parts";

/**
 * The current build, saved to localStorage.
 *
 * skipHydration: the server can't see localStorage, so the saved build is loaded
 * after mount (call `useBuildStore.persist.rehydrate()` in a client effect) to avoid
 * React hydration mismatches.
 */

const DEFAULT_NAME = "Untitled build";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyBuild(): Build {
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

interface BuildState {
  build: Build;
  /** Put a part in its slot. Ignores unknown ids or a part filed under the wrong slot. */
  setPart: (category: Category, partId: string) => void;
  removePart: (category: Category) => void;
  /** Replace the current parts with a preset's parts, and take its name. */
  loadPreset: (presetId: string) => void;
  /** Start over with an empty build. */
  reset: () => void;
  rename: (name: string) => void;
}

const touch = (build: Build, patch: Partial<Build>): Build => ({
  ...build,
  ...patch,
  updatedAt: new Date().toISOString(),
});

export const useBuildStore = create<BuildState>()(
  persist(
    (set) => ({
      build: emptyBuild(),

      setPart: (category, partId) =>
        set((s) => {
          const part = getPart(partId);
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
              parts: { ...preset.parts },
            }),
          };
        }),

      reset: () => set({ build: emptyBuild() }),

      rename: (name) =>
        set((s) => ({
          build: touch(s.build, { name: name.trim() || DEFAULT_NAME }),
        })),
    }),
    {
      name: "corespec-build",
      version: 1,
      storage: createJSONStorage(browserStorage),
      partialize: (s) => ({ build: s.build }),
      skipHydration: true,
    },
  ),
);
