import { create } from "zustand";

/** Small, non-persisted UI state shared across the shell (navbar, drawer, palette). */
interface UiState {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
}));
