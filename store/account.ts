import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Role } from "@/types/supabase";

/**
 * Who is logged in, as last reported by a sync: just enough for the account menu
 * to show a name without asking the server. Never used for any decision (the
 * server checks every request itself). Cleared on logout.
 */
interface AccountState {
  name: string | null;
  role: Role | null;
  set: (name: string, role: Role) => void;
  clear: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      name: null,
      role: null,
      set: (name, role) => set({ name, role }),
      clear: () => set({ name: null, role: null }),
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
