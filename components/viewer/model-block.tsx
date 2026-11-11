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
import { fitModel } from "@/lib/viewer/fit-model";
import type { Vec3 } from "@/lib/viewer/layout";
import { DRACO_DECODER_PATH, MODELS, type ModelId } from "@/lib/viewer/models";
import { TONES } from "./palette";

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
}: {
  id: ModelId;
  size: Vec3;
  glow?: string;
}) {
  const spec = MODELS[id];
  // Loaded on first use, Draco-decoded with the self-hosted decoder. useGLTF caches
  // by URL, so items sharing a model (every RAM stick) load its file once.
  const { scene } = useGLTF(spec.url, DRACO_DECODER_PATH);
  const [sx, sy, sz] = size;
  const meshes = useMemo(
    () => fitModel(scene, spec.basis, [sx, sy, sz], spec.fit),
    [scene, spec, sx, sy, sz],
  );
  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes]);

  return (
    <>
      {meshes.map((m, i) => {
        // A model that keeps its own textures uses its own material (unless it glows).
        if (spec.keepTextures && m.material && !glow)
          return <mesh key={i} geometry={m.geometry} material={m.material} />;
        const tone = spec.recolour[m.materialName];
        const look = tone ? TONES[tone] : m;
        return (
          <mesh key={i} geometry={m.geometry}>
            <meshStandardMaterial
              color={look.color}
              roughness={look.roughness}
              metalness={look.metalness}
              emissive={glow ?? "#000000"}
              emissiveIntensity={glow ? 0.25 : 0}
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
}: {
  ids: ModelId[];
  size: Vec3;
  glow?: string;
  fallback: ReactNode;
}) {
  const suspendUp = useContext(SuspendModelsUp);
  const [first, ...rest] = ids;
  if (!first || !MODELS[first]) return <>{fallback}</>;
  const next = rest.length ? (
    <ModelChain ids={rest} size={size} glow={glow} fallback={fallback} />
  ) : (
    fallback
  );
  const model = <FittedModel id={first} size={size} glow={glow} />;
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
}: {
  ids: ModelId[];
  pos: Vec3;
  size: Vec3;
  glow?: string;
  /** The procedural look, drawn around the block's centre. */
  fallback: ReactNode;
}) {
  return (
    <group position={pos}>
      <ModelChain ids={ids} size={size} glow={glow} fallback={fallback} />
    </group>
  );
}
