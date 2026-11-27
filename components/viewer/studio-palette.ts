import { Color } from "three";

/**
 * The receipt studio's colours and its "is this material dark?" rule (Phase
 * 20b), apart from the React components in studio.tsx so they can be tested.
 */

/** Light grey for the floor, between the background gradient's two ends. */
export const STUDIO_FLOOR = "#e9ebef";

/**
 * The receipt's desk picture: the home view's camera distance times this, so
 * the setup fills the picture (about 17% tighter). The PC picture keeps its
 * framing.
 */
export const STUDIO_DESK_FRAMING = 0.83;

/** The outline on dark materials: a soft grey, a pixel or so wide. */
export const STUDIO_EDGE = { color: "#9a9fa8", opacity: 0.55, px: 1.25 };

/**
 * Below this linear luminance a material counts as dark (black and charcoal
 * items, PCBs); the oak top, steel and light greys stay unoutlined.
 */
const DARK_LUMINANCE = 0.06;

export function isDarkColour(colour: string | undefined): boolean {
  if (!colour) return false;
  const c = new Color(colour); // linear RGB
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < DARK_LUMINANCE;
}
