"use client";

import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { Outlines, useGLTF } from "@react-three/drei";
import { fitModel } from "@/lib/viewer/fit-model";
import type { Vec3 } from "@/lib/viewer/layout";
import { DRACO_DECODER_PATH, MODELS, type ModelId } from "@/lib/viewer/models";
import { MODEL_RECOLOUR } from "./palette";

/** If a model file fails to load, keep showing the placeholder box. */
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
  // Loaded on first use (lazy), Draco-decoded with the self-hosted decoder, cached by URL.
  const { scene } = useGLTF(MODELS[id].url, DRACO_DECODER_PATH);
  const [sx, sy, sz] = size;
  const meshes = useMemo(
    () => fitModel(scene, MODELS[id].basis, [sx, sy, sz]),
    [scene, id, sx, sy, sz],
  );
  useEffect(() => () => meshes.forEach((m) => m.geometry.dispose()), [meshes]);

  return (
    <>
      {meshes.map((m, i) => {
        const look = MODEL_RECOLOUR[m.materialName] ?? m;
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

/** A real model fitted to the block, with the box as the loading and error fallback. */
export function ModelBlock({
  id,
  pos,
  size,
  glow,
  fallback,
}: {
  id: ModelId;
  pos: Vec3;
  size: Vec3;
  glow?: string;
  /** The placeholder box, drawn at the block's centre. */
  fallback: ReactNode;
}) {
  return (
    <group position={pos}>
      <ModelBoundary fallback={fallback}>
        <Suspense fallback={fallback}>
          <FittedModel id={id} size={size} glow={glow} />
        </Suspense>
      </ModelBoundary>
    </group>
  );
}
