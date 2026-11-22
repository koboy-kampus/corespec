import { CanvasTexture, SRGBColorSpace, type Texture } from "three";

let screenMap: Texture | null = null;

/**
 * A monitor screen's soft glow: a gentle diagonal gradient, made once and
 * shared by the procedural screen and the models' `screen` material.
 */
export function screenTexture(): Texture {
  if (screenMap) return screenMap;
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 64, 64);
  grad.addColorStop(0, "#56607e");
  grad.addColorStop(0.55, "#2c3348");
  grad.addColorStop(1, "#191c28");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  screenMap = new CanvasTexture(c);
  screenMap.colorSpace = SRGBColorSpace;
  return screenMap;
}
