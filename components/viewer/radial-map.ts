"use client";

import { CanvasTexture, type Texture } from "three";

/** Soft round alpha maps for floors and contact shadows (the desk scene, and the receipt's studio). */

/** e^(−k·r²), shifted and scaled so it's 1 in the middle (r = 0) and 0 at the edge (r = 1). */
const gauss = (r: number, k: number) =>
  (Math.exp(-k * r * r) - Math.exp(-k)) / (1 - Math.exp(-k));

/**
 * A round greyscale alpha map: `peak · gauss(r, k)` from the middle out, 0 at the
 * edge. Grey on black, not white with alpha: three.js reads an alphaMap's green
 * channel, so transparency in the canvas itself would be ignored (a hard disc).
 */
export function radialMap(px: number, k: number, peak: number): Texture {
  const c = document.createElement("canvas");
  c.width = px;
  c.height = px;
  const g = c.getContext("2d")!;
  g.fillStyle = "#000";
  g.fillRect(0, 0, px, px);
  const grad = g.createRadialGradient(
    px / 2,
    px / 2,
    0,
    px / 2,
    px / 2,
    px / 2,
  );
  for (let i = 0; i <= 16; i++) {
    const r = i / 16;
    const v = Math.round(255 * peak * gauss(r, k));
    grad.addColorStop(r, `rgb(${v},${v},${v})`);
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  return new CanvasTexture(c);
}
