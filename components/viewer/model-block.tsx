"use client";

import {
  Component,
  createContext,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { Outlines, useGLTF } from "@react-three/drei";
import { fitModel, planarUv } from "@/lib/viewer/fit-model";
import type { Vec3 } from "@/lib/viewer/layout";
import { DRACO_DECODER_PATH, MODELS, type ModelId } from "@/lib/viewer/models";
import { modelLook, type ModelPalette } from "./palette";
import { screenTexture } from "./screen-texture";

/**
 * When true, a loading model suspends up to the nearest outer <Suspense> instead
 * of showing its box: the landing hero uses this to reveal the scene only once
 * every model is in, so the swap from its poster image is invisible.
 */
export const SuspendModelsUp = createContext(false);

/** If a model file fails to load, show the next model in the chain (or the box). */
class ModelBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function FittedModel({
  id,
  size,
  glow,
  palette,
}: {
  id: ModelId;
  size: Vec3;
  glow?: string;
  palette: ModelPalette;
}) {
  const spec = MODELS[id];
  // Loaded on first use, Draco-decoded with the self-hosted decoder. useGLTF caches
  // by URL, so items sharing a model (every RAM stick) load its file once.
  const { scene } = useGLTF(spec.url, DRACO_DECODER_PATH);
  const [sx, sy, sz] = size;
  const meshes = useMemo(() => {
    const fitted = fitModel(scene, spec.basis, [sx, sy, sz], spec.fit);
    // Screens get flat UVs for their gradient (see planarUv).
    for (const m of fitted)
      if (spec.recolour[m.materialName] === "screen") planarUv(m.geometry);
    return fitted;
  }, [scene, spec, sx, sy, sz]);
  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes]);

  return (
    <>
      {meshes.map((m, i) => {
        // A model that keeps its own textures uses its own material (unless it glows).
        if (spec.keepTextures && m.material && !glow)
          return <mesh key={i} geometry={m.geometry} material={m.material} />;
        const tone = spec.recolour[m.materialName];
        const look = (tone && modelLook(tone, palette)) || m;
        const own = "emissive" in look ? look : undefined;
        // A screen glows with the same soft gradient as the procedural one, and
        // a flagged monitor's screen keeps it; the rest turns amber.
        const screen = tone === "screen";
        const tint = screen ? undefined : glow;
        const map = screen ? screenTexture() : null;
        return (
          <mesh key={i} geometry={m.geometry}>
            <meshStandardMaterial
              color={look.color}
              roughness={look.roughness}
              metalness={look.metalness}
              emissive={tint ?? own?.emissive ?? "#000000"}
              emissiveIntensity={tint ? 0.25 : (own?.emissiveIntensity ?? 0)}
              emissiveMap={map}
            />
            {glow ? <Outlines thickness={2.5} color={glow} /> : null}
          </mesh>
        );
      })}
    </>
  );
}

/** The first model in `ids` that loads, else the next one, else `fallback`. */
function ModelChain({
  ids,
  size,
  glow,
  fallback,
  palette,
}: {
  ids: ModelId[];
  size: Vec3;
  glow?: string;
  fallback: ReactNode;
  palette: ModelPalette;
}) {
  const suspendUp = useContext(SuspendModelsUp);
  const [first, ...rest] = ids;
  if (!first || !MODELS[first]) return <>{fallback}</>;
  const next = rest.length ? (
    <ModelChain
      ids={rest}
      size={size}
      glow={glow}
      fallback={fallback}
      palette={palette}
    />
  ) : (
    fallback
  );
  const model = (
    <FittedModel id={first} size={size} glow={glow} palette={palette} />
  );
  return (
    <ModelBoundary fallback={next}>
      {suspendUp ? model : <Suspense fallback={fallback}>{model}</Suspense>}
    </ModelBoundary>
  );
}

/**
 * A real model fitted to the block: the item's own model, else its category's
 * (resolveModel's chain), with the procedural look as the loading and error fallback.
 */
export function ModelBlock({
  ids,
  pos,
  size,
  glow,
  fallback,
  palette = "pc",
}: {
  ids: ModelId[];
  pos: Vec3;
  size: Vec3;
  glow?: string;
  /** The procedural look, drawn around the block's centre. */
  fallback: ReactNode;
  /** Which view's tones the model's materials take (see `modelLook`). */
  palette?: ModelPalette;
}) {
  return (
    <group position={pos}>
      <ModelChain
        ids={ids}
        size={size}
        glow={glow}
        fallback={fallback}
        palette={palette}
      />
    </group>
  );
}
