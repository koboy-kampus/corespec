"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import {
  MM_TO_UNITS,
  explodedOrigin,
  focusPoint,
  layoutBuild,
  partBounds,
  type CaseLayout,
  type PartLayout,
  type Vec3,
} from "@/lib/viewer/layout";
import type { PcCategory, ResolvedBuild } from "@/types/parts";
import { clampDelta } from "@/lib/viewer/spring";
import { Animated } from "./animated";
import { CameraRig, type CameraKeys } from "./camera-rig";
import { CaseShell } from "./case-shell";
import { ACCENT, type Flag } from "./palette";
import { PartMesh } from "./part-mesh";
import { PartTooltip } from "./part-tooltip";
import { hasWebGL, usePresence } from "./scene-common";

export interface SceneProps {
  parts: ResolvedBuild;
  /** Per-category flag from check(), so flagged parts glow. */
  flags?: Partial<Record<PcCategory, Flag>>;
  /** Slot the camera eases toward; null for the home view. */
  activeSlot?: PcCategory | null;
  /** "builder" adds orbit controls; "showcase" slowly spins with no controls. */
  mode: "builder" | "showcase";
  /** Shown instead of the canvas when WebGL isn't available. */
  fallback: ReactNode;
  reducedMotion: boolean;
  /** Stop the showcase spin while it's off screen. */
  paused?: boolean;
  /** Pull the parts out toward the glass so each one is visible. */
  exploded?: boolean;
  /** Keyboard camera controls, filled in by the camera rig (builder only). */
  cameraKeysRef?: RefObject<CameraKeys | null>;
  /**
   * The viewer sits inside a scrolling page: a plain wheel and a one-finger swipe
   * scroll the page; Ctrl+wheel, pinch and two fingers move the camera.
   */
  embedded?: boolean;
  /**
   * Parts already in the build when the scene first appears are placed without the
   * drop animation (a shared build opens assembled). Later changes still animate.
   */
  skipIntro?: boolean;
}

type Item =
  | { key: string; kind: "case"; shell: CaseLayout; flag?: Flag }
  | { key: string; kind: "part"; layout: PartLayout; flag?: Flag };

const NO_FLAGS: Partial<Record<PcCategory, Flag>> = {};
const BASE_YAW = -0.35;
const PART_DROP = 160; // mm
const CASE_DROP = 60;
const SWAY_FRAME_MS = 1000 / 30;

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
  const next = useRef<ReturnType<typeof setTimeout> | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    if (!spinning || !ref.current) return;
    // Sway rather than spin, so the glass side always faces the viewer.
    swayT.current += clampDelta(delta);
    ref.current.rotation.y = BASE_YAW + Math.sin(swayT.current * 0.45) * 0.5;
    // A slow sway looks the same at 30 fps and costs half the frames of 60.
    next.current ??= setTimeout(() => {
      next.current = null;
      invalidate();
    }, SWAY_FRAME_MS);
  });
  // Kick the demand loop when spinning starts or resumes; stop the timer when it ends.
  useEffect(() => {
    if (spinning) invalidate();
    return () => {
      if (next.current) clearTimeout(next.current);
      next.current = null;
    };
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
      {/*
        No <Environment>: its reflection map cost about 345 ms of blocking time on a
        mid-range phone (Lighthouse mobile, Phase 9) for a barely visible difference.
      */}
    </>
  );
}

/** Tooltip just above the part's top edge, relative to its group. */
function HoverLabel({
  layout,
  parts,
  flag,
}: {
  layout: PartLayout;
  parts: ResolvedBuild;
  flag?: Flag;
}) {
  const part = parts[layout.category];
  if (!part) return null;
  const { min, max } = partBounds(layout);
  const top: Vec3 = [
    (min[0] + max[0]) / 2 - layout.origin[0],
    max[1] - layout.origin[1],
    (min[2] + max[2]) / 2 - layout.origin[2],
  ];
  return <PartTooltip part={part} position={top} flag={flag} />;
}

function SceneCanvas({
  parts,
  flags = NO_FLAGS,
  activeSlot = null,
  mode,
  fallback,
  reducedMotion,
  paused = false,
  exploded = false,
  cameraKeysRef,
  embedded = false,
  skipIntro = false,
}: SceneProps) {
  const scene = useMemo(() => layoutBuild(parts), [parts]);
  const [hovered, setHovered] = useState<string | null>(null);
  const interactive = mode === "builder";
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
  // Keys present on the first render, which skip the drop when skipIntro is set.
  const [introKeys] = useState<ReadonlySet<string>>(
    () => new Set(skipIntro ? items.map((i) => i.key) : []),
  );

  const focus = useMemo<Vec3 | null>(() => {
    // The case slot shows the whole case, so it uses the home view.
    if (!activeSlot || activeSlot === "case" || mode !== "builder") return null;
    return focusPoint(scene, activeSlot).map((v) => v * MM_TO_UNITS) as Vec3;
  }, [scene, activeSlot, mode]);
  const caseSize = scene.case.size.map((v) => v * MM_TO_UNITS) as Vec3;

  const render = (item: Item, isLeaving: boolean) => (
    <Animated
      key={item.key}
      target={
        item.kind === "case" ? [0, 0, 0] : explodedOrigin(item.layout, exploded)
      }
      drop={item.kind === "case" ? CASE_DROP : PART_DROP}
      leaving={isLeaving}
      onExited={() => done(item.key)}
      instant={reducedMotion || introKeys.has(item.key)}
    >
      {item.kind === "case" ? (
        <CaseShell shell={item.shell} flag={item.flag} />
      ) : (
        <group
          // Hover tooltips in the builder; the hero has no pointer interaction.
          onPointerOver={
            interactive && !isLeaving
              ? (e) => {
                  e.stopPropagation();
                  setHovered(item.key);
                }
              : undefined
          }
          onPointerOut={
            interactive
              ? () => setHovered((h) => (h === item.key ? null : h))
              : undefined
          }
        >
          <PartMesh layout={item.layout} flag={item.flag} />
          {hovered === item.key && !isLeaving ? (
            <HoverLabel layout={item.layout} parts={parts} flag={item.flag} />
          ) : null}
        </group>
      )}
    </Animated>
  );

  return (
    <Canvas
      frameloop="demand"
      // The hero is decoration: a lower pixel ratio halves its fill cost on phones.
      dpr={mode === "showcase" ? [1, 1.5] : [1, 2]}
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
        exploded={exploded}
        keysRef={cameraKeysRef}
        embedded={embedded}
      />
    </Canvas>
  );
}

/** The 3D build viewer. Loaded client-side only (see viewer.tsx). */
export default function Scene(props: SceneProps) {
  const [webgl] = useState(hasWebGL);
  return webgl ? <SceneCanvas {...props} /> : <>{props.fallback}</>;
}
