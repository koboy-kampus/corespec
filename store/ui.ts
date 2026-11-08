import { create } from "zustand";
import type { Category } from "@/types/parts";

/** Small, non-persisted UI state shared across the shell and builder. */
interface UiState {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  /** Category whose PartPicker is open, or null. */
  pickerCategory: Category | null;
  openPicker: (category: Category) => void;
  closePicker: () => void;

  /** Last slot the user focused; the 3D camera eases toward it (Phase 5). */
  activeSlot: Category | null;
  setActiveSlot: (category: Category | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),

  pickerCategory: null,
  openPicker: (category) =>
    set({ pickerCategory: category, activeSlot: category }),
  closePicker: () => set({ pickerCategory: null }),

  activeSlot: null,
  setActiveSlot: (activeSlot) => set({ activeSlot }),
}));
