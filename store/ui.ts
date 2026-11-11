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

  /** Which slot group the slot list shows. Switching it also switches the 3D view. */
  slotGroup: "pc" | "setup";
  setSlotGroup: (group: "pc" | "setup") => void;

  /** Which 3D view the viewport shows (Phase 12). The PC | Desk switch sets it alone. */
  view3d: "pc" | "desk";
  setView3d: (view: "pc" | "desk") => void;

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
  setSlotGroup: (slotGroup) =>
    set({ slotGroup, view3d: slotGroup === "setup" ? "desk" : "pc" }),

  view3d: "pc",
  setView3d: (view3d) => set({ view3d }),

  exploded: false,
  setExploded: (exploded) => set({ exploded }),
}));
