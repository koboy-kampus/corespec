import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Role } from "@/types/supabase";

/**
 * What the sync engine (components/account/account-sync.tsx) is doing, for the
 * save status in the navbar on /builder. "idle": not logged in (or accounts
 * off), so builds only save in this browser. "syncing" covers changes waiting
 * to be sent too. Not saved: it starts at "idle" on every page load.
 */
export type SyncStatus = "idle" | "syncing" | "synced" | "failed";

/**
 * Who is logged in, as last reported by a sync: just enough for the account menu
 * to show a name without asking the server. Never used for any decision (the
 * server checks every request itself). Cleared on logout.
 */
interface AccountState {
  name: string | null;
  role: Role | null;
  sync: SyncStatus;
  set: (name: string, role: Role) => void;
  setSync: (sync: SyncStatus) => void;
  clear: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      name: null,
      role: null,
      sync: "idle",
      set: (name, role) => set({ name, role }),
      setSync: (sync) => set((s) => (s.sync === sync ? s : { sync })),
      clear: () => set({ name: null, role: null, sync: "idle" }),
    }),
    {
      name: "corespec-account",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : undefinedStorage,
      ),
      partialize: (s) => ({ name: s.name, role: s.role }),
      skipHydration: true,
    },
  ),
);

const undefinedStorage: Storage = {
  length: 0,
  clear: () => {},
  getItem: () => null,
  key: () => null,
  removeItem: () => {},
  setItem: () => {},
};
