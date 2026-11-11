"use client";

import {
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Outlines, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { Group } from "three";
import {
  deskFocus,
  itemBounds,
  layoutDesk,
  segmentHitsBox,
  type Box,
  type DeskBlock,
  type Placed,
  type DeskKey,
} from "@/lib/viewer/desk-layout";
import { MM_TO_UNITS, type Vec3 } from "@/lib/viewer/layout";
import { clampDelta } from "@/lib/viewer/spring";
import type { Case, Item, ResolvedSetup } from "@/types/parts";
import { Animated, setFade } from "./animated";
import { CameraRig, type CameraKeys, type CameraView } from "./camera-rig";
import { ACCENT, DESK_TONES } from "./palette";
import { PartTooltip } from "./part-tooltip";
import { hasWebGL, usePresence } from "./scene-common";

export interface DeskSceneProps {
  setup: ResolvedSetup;
  /** The chosen case: the PC is drawn as a box this size. */
  pcCase?: Case;
  /** Setup items flagged by the Phase 11 rules glow coral. */
  flagged?: Partial<Record<DeskKey, true>>;
  /** Slot the camera eases toward; null for the seated view. */
  activeSlot?: DeskKey | null;
  fallback: ReactNode;
  reducedMotion: boolean;
  cameraKeysRef?: RefObject<CameraKeys | null>;
  /** Inside a scrolling page (shared builds): see SceneProps.embedded. */
  embedded?: boolean;
  /** Items already there on the first render skip the drop (shared builds). */
  skipIntro?: boolean;
}

const ITEM_DROP = 160; // mm
const DESK_DROP = 60;
/** The chair fades to this when it stands between the camera and the screen. */
const CHAIR_FADED = 0.22;
const FADE_S = 0.2;
/** Grow the chair's box a little, so a line that only grazes it still fades it. */
const CHAIR_MARGIN = 120;
const NO_FLAGS: Partial<Record<DeskKey, true>> = {};

/**
 * Seated view: from behind the chair and a little above eye height, looking at the
 * middle of the screen. Orbit stays in front of the desk and above the floor.
 */
const SEATED_VIEW: CameraView = {
  dir: [0.12, 0.5, 1],
  polar: [Math.PI * 0.14, Math.PI * 0.49],
  azimuth: [-1.15, 1.15],
  zoom: [0.3, 1.5],
  fit: 0.78,
};

function DeskLights() {
  return (
    <>
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#ffffff", "#2a1a1e", 0.8]} />
      <directionalLight position={[3, 8, 6]} intensity={2} />
      <directionalLight position={[-6, 3, -5]} intensity={1.1} color={ACCENT} />
    </>
  );
}

/** One block: a rounded box, or a cylinder for poles and round bases. */
function BlockMesh({
  b,
  glow,
  ghost,
}: {
  b: DeskBlock;
  glow?: string;
  ghost?: boolean;
}) {
  const tone = DESK_TONES[b.tone];
  const material = (
    <meshStandardMaterial
      color={tone.color}
      roughness={tone.roughness}
      metalness={tone.metalness}
      emissive={glow ?? tone.emissive ?? "#000000"}
      emissiveIntensity={glow ? 0.18 : (tone.emissiveIntensity ?? 0)}
      transparent={ghost}
      opacity={ghost ? 0.35 : 1}
      depthWrite={!ghost}
    />
  );
  if (b.round) {
    const r = Math.min(b.size[0], b.size[2]) / 2;
    return (
      <mesh position={b.pos}>
        <cylinderGeometry args={[r, r, b.size[1], 24]} />
        {material}
      </mesh>
    );
  }
  return (
    <RoundedBox
      args={b.size}
      radius={Math.min(4, Math.min(...b.size) * 0.3)}
      smoothness={2}
      position={b.pos}
    >
      {material}
      {glow ? <Outlines thickness={2.5} color={glow} /> : null}
    </RoundedBox>
  );
}

/**
 * Fades the chair while it stands between the camera and what matters: the screen,
 * or the keyboard area at the front of the desk.
 */
function ChairFader({
  box,
  targets,
  instant,
  children,
}: {
  box: Box;
  targets: Vec3[];
  instant: boolean;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const fade = useRef(1);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const grown = useMemo<Box>(
    () => ({
      min: box.min.map((v) => v - CHAIR_MARGIN) as Vec3,
      max: box.max.map((v) => v + CHAIR_MARGIN) as Vec3,
    }),
    [box],
  );
  useFrame((_, rawDelta) => {
    if (!ref.current) return;
    const cam = camera.position.toArray().map((v) => v / MM_TO_UNITS) as Vec3;
    const hidden = targets.some((t) => segmentHitsBox(cam, t, grown));
    const target = hidden ? CHAIR_FADED : 1;
    if (fade.current === target) return;
    const step = instant ? 1 : clampDelta(rawDelta) / FADE_S;
    fade.current =
      target < fade.current
        ? Math.max(target, fade.current - step)
        : Math.min(target, fade.current + step);
    setFade(ref.current, fade.current);
    invalidate();
  });
  return <group ref={ref}>{children}</group>;
}

/** Where an item's tooltip sits: just above its top, relative to its group. */
function tooltipPoint(item: Placed): Vec3 {
  const b = itemBounds(item);
  return [
    (b.min[0] + b.max[0]) / 2 - item.origin[0],
    b.max[1] - item.origin[1],
    (b.min[2] + b.max[2]) / 2 - item.origin[2],
  ];
}

function DeskCanvas({
  setup,
  pcCase,
  flagged = NO_FLAGS,
  activeSlot = null,
  fallback,
  reducedMotion,
  cameraKeysRef,
  embedded = false,
  skipIntro = false,
}: DeskSceneProps) {
  const layout = useMemo(() => layoutDesk(setup, pcCase), [setup, pcCase]);
  const [hovered, setHovered] = useState<string | null>(null);
  const items = useMemo(
    () => layout.items.map((i) => ({ ...i, key: i.id, slot: i.key })),
    [layout],
  );
  const { leaving, done } = usePresence(items);
  const [introKeys] = useState<ReadonlySet<string>>(
    () => new Set(skipIntro ? items.map((i) => i.key) : []),
  );

  const focus = useMemo<Vec3 | null>(() => {
    if (!activeSlot || activeSlot === "desk") return null;
    const p = deskFocus(layout, activeSlot);
    return p ? (p.map((v) => v * MM_TO_UNITS) as Vec3) : null;
  }, [layout, activeSlot]);

  const { min, max } = layout.frame;
  const frame = [0, 1, 2].map((i) => (max[i] - min[i]) * MM_TO_UNITS) as Vec3;
  // Aim between the desk top and the screen, centred on what's framed (the PC on
  // the floor pulls it left), so the whole setup fits.
  const [fx0, , fz0] = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);
  const aimY = (layout.desk.heightMm + layout.lookAt[1]) / 2;
  const aimX = (fx0 + layout.lookAt[0]) / 2;
  const aimZ = (fz0 + layout.lookAt[2]) / 2;
  const view = useMemo<CameraView>(
    () => ({
      ...SEATED_VIEW,
      target: [aimX * MM_TO_UNITS, aimY * MM_TO_UNITS, aimZ * MM_TO_UNITS],
    }),
    [aimX, aimY, aimZ],
  );

  const { heightMm: deskH, depthMm: deskD } = layout.desk;
  const [lx, ly, lz] = layout.lookAt;
  const chairTargets = useMemo<Vec3[]>(
    () => [
      [lx, ly, lz],
      [0, deskH, deskD / 2 - 120],
    ],
    [lx, ly, lz, deskH, deskD],
  );

  const itemFor = (slot: DeskKey): Item | undefined =>
    slot === "pc" ? pcCase : setup[slot];

  const render = (item: (typeof items)[number], isLeaving: boolean) => {
    const glow = flagged[item.slot] ? ACCENT : undefined;
    const ghost = item.id === "default-desk";
    const part = itemFor(item.slot);
    const meshes = item.blocks.map((b, i) => (
      <BlockMesh key={i} b={b} glow={glow} ghost={ghost} />
    ));
    return (
      <Animated
        key={item.key}
        target={item.origin}
        drop={item.slot === "desk" ? DESK_DROP : ITEM_DROP}
        leaving={isLeaving}
        onExited={() => done(item.key)}
        instant={reducedMotion || introKeys.has(item.key)}
      >
        <group
          onPointerOver={
            !isLeaving && part
              ? (e) => {
                  e.stopPropagation();
                  setHovered(item.key);
                }
              : undefined
          }
          onPointerOut={() => setHovered((h) => (h === item.key ? null : h))}
        >
          {item.slot === "chair" ? (
            <ChairFader
              box={itemBounds(item)}
              targets={chairTargets}
              instant={reducedMotion}
            >
              {meshes}
            </ChairFader>
          ) : (
            meshes
          )}
          {hovered === item.key && !isLeaving && part ? (
            <PartTooltip
              part={part}
              position={tooltipPoint(item)}
              flag={glow ? "warning" : undefined}
            />
          ) : null}
        </group>
      </Animated>
    );
  };

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.1, far: 200, position: [0, 6, 20] }}
      gl={{ antialias: true, alpha: true }}
      fallback={fallback}
      aria-hidden
    >
      <DeskLights />
      <group scale={MM_TO_UNITS}>
        {[
          ...items.map((i) => render(i, false)),
          ...leaving.map((i) => render(i, true)),
        ]}
      </group>
      <CameraRig
        caseSize={frame}
        focus={focus}
        interactive
        keysRef={cameraKeysRef}
        embedded={embedded}
        view={view}
      />
    </Canvas>
  );
}

/** The 3D desk view (Phase 12). Its own chunk: loaded client-side only, on demand. */
export default function DeskScene(props: DeskSceneProps) {
  const [webgl] = useState(hasWebGL);
  return webgl ? <DeskCanvas {...props} /> : <>{props.fallback}</>;
}
