"use client";

import { createContext, useEffect, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import type { Texture } from "three";
import { radialMap } from "./radial-map";
import { STUDIO_FLOOR } from "./studio-palette";

export { isDarkColour, STUDIO_EDGE, STUDIO_FLOOR } from "./studio-palette";

/**
 * The receipt's light "studio" look (Phase 20b). Only the PDF receipt's
 * capture turns it on (`studio` on the scenes, from the capture stage); the
 * builder and desk views never do, so they look exactly as before.
 *
 * The canvas stays transparent: the capture stage lays the picture over the
 * light grey gradient in 2D (exact colours, no tone mapping) and saves a JPEG.
 * In 3D the studio adds brighter neutral lights (no coral), a soft light
 * floor with a contact shadow, and thin grey outlines on dark materials so
 * black items keep their shape on the light background.
 */

/** True inside a studio capture: models outline their dark materials. */
export const Studio = createContext(false);

/** Brighter than the app's scenes (three.js's default is 1). */
const EXPOSURE = 1.25;

/** Raises the exposure for this canvas only (the capture's own). */
function Exposure() {
  // Read the renderer through get() inside the effect: it's three.js state,
  // not a React value.
  const get = useThree((s) => s.get);
  useEffect(() => {
    const { gl, invalidate } = get();
    gl.toneMappingExposure = EXPOSURE;
    invalidate();
  }, [get]);
  return null;
}

/** The PC scene's studio lights: a strong key, a front fill, white rims and a bright case interior. */
export function PcStudioLights() {
  return (
    <>
      <Exposure />
      <ambientLight intensity={0.8} />
      <hemisphereLight args={["#ffffff", "#d9dce2", 0.9]} />
      {/* Key: above and to the left of the camera, so its highlight misses the glass. */}
      <directionalLight position={[-4, 7, 8]} intensity={2.6} />
      {/* Fill from the front, low, so the parts behind the glass aren't in shadow. */}
      <directionalLight position={[3, 0.5, 10]} intensity={1.1} />
      {/* White rims from behind: edges on the dark case against the light background. */}
      <directionalLight position={[5, 5, -8]} intensity={1.2} />
      <directionalLight position={[-6, 3, -6]} intensity={0.7} />
      {/* Inside the case, like bright case lighting: the parts read through the glass. */}
      {/*
        Near the glass (z ≈ 1 unit = 100 mm out) and off to the front of the
        case, so they light the parts' fronts without a hotspot reflecting
        straight back at the camera from the metal (cooler, GPU shroud).
      */}
      <pointLight
        position={[-1.6, 1.5, 0.9]}
        intensity={6}
        distance={7}
        decay={1.6}
        color="#ffffff"
      />
      <pointLight
        position={[-1.6, -1.1, 0.9]}
        intensity={5}
        distance={6}
        decay={1.6}
        color="#ffffff"
      />
    </>
  );
}

/** The desk scene's studio lights: the app's key and white rims, a front fill, no coral. */
export function DeskStudioLights() {
  return (
    <>
      <Exposure />
      <ambientLight intensity={1} />
      <hemisphereLight args={["#ffffff", "#d9dce2", 1]} />
      <directionalLight position={[2, 7, 9]} intensity={3.2} />
      {/* Fill from in front, low, so the desk's front edge and the chair aren't flat black. */}
      <directionalLight position={[-3, 2, 11]} intensity={1.2} />
      <directionalLight position={[4, 6, -8]} intensity={1.7} />
      <directionalLight position={[-5, 4, -7]} intensity={0.9} />
    </>
  );
}

let floorMap: Texture | null = null;
const floorTexture = () => (floorMap ??= radialMap(256, 2.2, 0.95));
let shadowMap: Texture | null = null;
const shadowTexture = () => (shadowMap ??= radialMap(64, 3.5, 1));

/**
 * A soft light floor fading into the background, with a contact shadow under
 * the PC (sizes in mm, inside the scene's mm group). `y` is the floor's height.
 */
export function PcStudioFloor({
  y,
  footprint: [l, w],
}: {
  y: number;
  footprint: [number, number];
}) {
  const size = Math.max(l, w) * 4.5;
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y - 1, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial
          color={STUDIO_FLOOR}
          alphaMap={floorTexture()}
          transparent
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y - 0.5, 0]}>
        <planeGeometry args={[l * 1.5, w * 1.7]} />
        <meshBasicMaterial
          color="#000000"
          alphaMap={shadowTexture()}
          transparent
          opacity={0.32}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

/** Wraps a scene's models so they know they're in the studio. */
export function StudioProvider({
  on,
  children,
}: {
  on: boolean;
  children: ReactNode;
}) {
  return <Studio.Provider value={on}>{children}</Studio.Provider>;
}
