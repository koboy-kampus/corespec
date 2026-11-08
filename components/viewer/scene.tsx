"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import type { Group } from "three";
import {
  MM_TO_UNITS,
  focusPoint,
  layoutBuild,
  type CaseLayout,
  type PartLayout,
  type Vec3,
} from "@/lib/viewer/layout";
import type { Category, ResolvedBuild } from "@/types/parts";
import { clampDelta } from "@/lib/viewer/spring";
import { Animated } from "./animated";
import { CameraRig } from "./camera-rig";
import { CaseShell } from "./case-shell";
import { ACCENT, type Flag } from "./palette";
import { PartMesh } from "./part-mesh";

export interface SceneProps {
  parts: ResolvedBuild;
  /** Per-category flag from check(), so flagged parts glow. */
  flags?: Partial<Record<Category, Flag>>;
  /** Slot the camera eases toward; null for the home view. */
  activeSlot?: Category | null;
  /** "builder" adds orbit controls; "showcase" slowly spins with no controls. */
  mode: "builder" | "showcase";
  /** Shown instead of the canvas when WebGL isn't available. */
  fallback: ReactNode;
  reducedMotion: boolean;
  /** Stop the showcase spin while it's off screen. */
  paused?: boolean;
}

type Item =
  | { key: string; kind: "case"; shell: CaseLayout; flag?: Flag }
  | { key: string; kind: "part"; layout: PartLayout; flag?: Flag };

const NO_FLAGS: Partial<Record<Category, Flag>> = {};
const BASE_YAW = -0.35;
const PART_DROP = 160; // mm
const CASE_DROP = 60;

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

/**
 * Keeps removed items around (marked leaving) until their exit animation ends.
 * Same key = same instance, so a part that moves keeps its spring state.
 */
function usePresence(items: Item[]) {
  const [prev, setPrev] = useState(items);
  const [leaving, setLeaving] = useState<Item[]>([]);
  if (items !== prev) {
    const now = new Set(items.map((i) => i.key));
    const gone = prev.filter((p) => !now.has(p.key));
    const goneKeys = new Set(gone.map((g) => g.key));
    setLeaving((l) => [
      ...l.filter((x) => !now.has(x.key) && !goneKeys.has(x.key)),
      ...gone,
    ]);
    setPrev(items);
  }
  const done = useCallback(
    (key: string) => setLeaving((l) => l.filter((x) => x.key !== key)),
    [],
  );
  return { leaving, done };
}

/** Slow turntable spin for the landing hero. Keeps requesting frames only while spinning. */
function Turntable({
  spinning,
  children,
}: {
  spinning: boolean;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const swayT = useRef(0);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    if (!spinning || !ref.current) return;
    // Sway rather than spin, so the glass side always faces the viewer.
    swayT.current += clampDelta(delta);
    ref.current.rotation.y = BASE_YAW + Math.sin(swayT.current * 0.45) * 0.5;
    invalidate();
  });
  // Kick the demand loop when spinning starts or resumes.
  useEffect(() => {
    if (spinning) invalidate();
  }, [spinning, invalidate]);
  return (
    <group ref={ref} rotation={[0, BASE_YAW, 0]}>
      {children}
    </group>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <hemisphereLight args={["#ffffff", "#2a1a1e", 0.8]} />
      <directionalLight position={[2, 5, 8]} intensity={2.2} />
      <directionalLight position={[-5, 2, -4]} intensity={1.2} color={ACCENT} />
      {/* A light inside the case, like case lighting, so the parts read through the glass. */}
      <pointLight
        position={[-0.6, 1.4, 0.6]}
        intensity={5}
        distance={7}
        decay={1.4}
        color="#fff4f5"
      />
      {/* Soft studio reflections, rendered once from these light panels (no downloaded HDRI). */}
      <Environment resolution={64} frames={1}>
        <Lightformer
          intensity={1.4}
          position={[0, 5, 2]}
          rotation-x={Math.PI / 2}
          scale={[8, 2, 1]}
        />
        <Lightformer
          intensity={0.8}
          position={[-5, 1, 3]}
          rotation-y={Math.PI / 2}
          scale={[3, 6, 1]}
        />
        <Lightformer
          form="ring"
          color={ACCENT}
          intensity={1.2}
          position={[4, 1, -4]}
          scale={2}
        />
      </Environment>
    </>
  );
}

function SceneCanvas({
  parts,
  flags = NO_FLAGS,
  activeSlot = null,
  mode,
  fallback,
  reducedMotion,
  paused = false,
}: SceneProps) {
  const scene = useMemo(() => layoutBuild(parts), [parts]);
  const items = useMemo<Item[]>(
    () => [
      {
        key: parts.case?.id ?? "ghost-case",
        kind: "case",
        shell: scene.case,
        flag: flags.case,
      },
      ...scene.parts.map((layout): Item => ({
        key: layout.id,
        kind: "part",
        layout,
        flag: flags[layout.category],
      })),
    ],
    [scene, parts.case?.id, flags],
  );
  const { leaving, done } = usePresence(items);

  const focus = useMemo<Vec3 | null>(() => {
    // The case slot shows the whole case, so it uses the home view.
    if (!activeSlot || activeSlot === "case" || mode !== "builder") return null;
    return focusPoint(scene, activeSlot).map((v) => v * MM_TO_UNITS) as Vec3;
  }, [scene, activeSlot, mode]);
  const caseSize = scene.case.size.map((v) => v * MM_TO_UNITS) as Vec3;

  const render = (item: Item, isLeaving: boolean) => (
    <Animated
      key={item.key}
      target={item.kind === "case" ? [0, 0, 0] : item.layout.origin}
      drop={item.kind === "case" ? CASE_DROP : PART_DROP}
      leaving={isLeaving}
      onExited={() => done(item.key)}
      instant={reducedMotion}
    >
      {item.kind === "case" ? (
        <CaseShell shell={item.shell} flag={item.flag} />
      ) : (
        <PartMesh layout={item.layout} flag={item.flag} />
      )}
    </Animated>
  );

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.1, far: 100, position: [0, 0, 12] }}
      gl={{ antialias: true, alpha: true }}
      fallback={fallback}
      aria-hidden
    >
      <Lights />
      <Turntable spinning={mode === "showcase" && !reducedMotion && !paused}>
        <group scale={MM_TO_UNITS}>
          {/* One keyed list, so a removed part keeps its instance while it animates out. */}
          {[
            ...items.map((i) => render(i, false)),
            ...leaving.map((i) => render(i, true)),
          ]}
        </group>
      </Turntable>
      <CameraRig
        caseSize={caseSize}
        focus={focus}
        interactive={mode === "builder"}
      />
    </Canvas>
  );
}

/** The 3D build viewer. Loaded client-side only (see viewer.tsx). */
export default function Scene(props: SceneProps) {
  const [webgl] = useState(hasWebGL);
  return webgl ? <SceneCanvas {...props} /> : <>{props.fallback}</>;
}
