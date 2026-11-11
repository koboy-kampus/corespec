import type { Item } from "@/types/parts";

// Display helpers with no catalogue data, so client components that only need a
// label (the 3D tooltip, the desk description) don't download every part.

/** "AMD Ryzen 5 7600" */
export function partLabel(part: Item): string {
  return `${part.brand} ${part.name}`;
}
