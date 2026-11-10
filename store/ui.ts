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

  /** Which slot group the slot list shows (Phase 12 also switches the 3D view). */
  slotGroup: "pc" | "setup";
  setSlotGroup: (group: "pc" | "setup") => void;

  /** 3D exploded view: parts pulled out toward the glass. */
  exploded: boolean;
  setExploded: (exploded: boolean) => void;
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

  slotGroup: "pc",
  setSlotGroup: (slotGroup) => set({ slotGroup }),

  exploded: false,
  setExploded: (exploded) => set({ exploded }),
}));
