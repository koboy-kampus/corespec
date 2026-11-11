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
import {
  BoxGeometry,
  CanvasTexture,
  SRGBColorSpace,
  type Group,
  type Texture,
} from "three";
import type { CompatResult } from "@/lib/compat/rules";
import {
  chairFadeTargets,
  deskFocus,
  itemBounds,
  layoutDesk,
  SEATED_DIR,
  SEATED_FIT,
  seatedTarget,
  segmentHitsBox,
  type Box,
  type DeskBlock,
  type DeskKey,
  type DeskLayout,
  type Placed,
} from "@/lib/viewer/desk-layout";
import { deskHighlights } from "@/lib/viewer/desk-highlights";
import { MM_TO_UNITS, type Vec3 } from "@/lib/viewer/layout";
import { clampDelta } from "@/lib/viewer/spring";
import type { Case, Item, ResolvedSetup } from "@/types/parts";
import { Animated, setFade } from "./animated";
import { CameraRig, type CameraKeys, type CameraView } from "./camera-rig";
import { DESK_TONES, WARN } from "./palette";
import { PartTooltip } from "./part-tooltip";
import { hasWebGL, usePresence } from "./scene-common";

export interface DeskSceneProps {
  setup: ResolvedSetup;
  /** The chosen case: the PC is drawn as a box this size. */
  pcCase?: Case;
  /** Setup rule results: their warnings glow amber (see `deskHighlights`). */
  warnings?: Pick<CompatResult, "id" | "severity" | "partIds">[];
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
const CHAIR_MARGIN = 60;
const NO_WARNINGS: NonNullable<DeskSceneProps["warnings"]> = [];

/**
 * Seated view: from behind the chair and a little above eye height, looking at the
 * middle of the screen. Orbit stays in front of the desk and above the floor.
 */
const SEATED_VIEW: CameraView = {
  dir: SEATED_DIR,
  polar: [Math.PI * 0.14, Math.PI * 0.49],
  azimuth: [-1.15, 1.15],
  zoom: [0.3, 1.5],
  fit: SEATED_FIT,
};

function DeskLights() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <hemisphereLight args={["#ffffff", "#2a2629", 0.9]} />
      {/* Key light from in front and above, where the person sits. */}
      <directionalLight position={[2, 7, 9]} intensity={2.6} />
      <directionalLight position={[-7, 4, 3]} intensity={0.6} />
      {/* A faint coral rim from behind, the brand colour without tinting the desk. */}
      <directionalLight
        position={[-6, 3, -6]}
        intensity={0.35}
        color="#fe2e4b"
      />
    </>
  );
}

let screenMap: Texture | null = null;
/** The screen's soft glow: a gentle diagonal gradient, made once. */
function screenTexture(): Texture {
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

/** e^(−k·r²), shifted and scaled so it's 1 in the middle (r = 0) and 0 at the edge (r = 1). */
const gauss = (r: number, k: number) =>
  (Math.exp(-k * r * r) - Math.exp(-k)) / (1 - Math.exp(-k));

/**
 * A round greyscale alpha map: `peak · gauss(r, k)` from the middle out, 0 at the
 * edge. Grey on black, not white with alpha: three.js reads an alphaMap's green
 * channel, so transparency in the canvas itself would be ignored (a hard disc).
 */
function radialMap(px: number, k: number, peak: number): Texture {
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

let floorMap: Texture | null = null;
/** The floor fades out smoothly from the middle, so it has no visible edge. */
const floorTexture = () => (floorMap ??= radialMap(256, 2.5, 0.6));

let blobMap: Texture | null = null;
/** A soft shadow: densest in the middle, gone well before the edge. */
const blobTexture = () => (blobMap ??= radialMap(64, 4, 1));

/**
 * Soft contact shadows: one wide, faint patch under each thing that stands on the
 * floor (the desk, the PC, the chair), never a dark disc per leg. Plain textured
 * planes from the layout: no extra render pass, cheap on phones.
 */
function FloorShadows({ layout }: { layout: DeskLayout }) {
  const blobs = useMemo(() => {
    const out: { x: number; z: number; sx: number; sz: number; o: number }[] =
      [];
    const { widthMm: W, depthMm: D, ghost } = layout.desk;
    // The faded stand-in desk casts a fainter shadow too.
    out.push({ x: 0, z: 0, sx: W * 1.3, sz: D * 1.5, o: ghost ? 0.12 : 0.38 });
    for (const item of layout.items) {
      if (item.key === "desk" || item.spot !== "floor") continue;
      const b = itemBounds(item);
      const sx = b.max[0] - b.min[0];
      const sz = b.max[2] - b.min[2];
      out.push({
        x: (b.min[0] + b.max[0]) / 2,
        z: (b.min[2] + b.max[2]) / 2,
        sx: sx * 1.4 + 200,
        sz: sz * 1.4 + 200,
        o: 0.4,
      });
    }
    return out;
  }, [layout]);
  return (
    <>
      {blobs.map((b, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[b.x, 0.5, b.z]}
          renderOrder={0}
        >
          <planeGeometry args={[b.sx, b.sz]} />
          <meshBasicMaterial
            color="#000000"
            alphaMap={blobTexture()}
            transparent
            opacity={b.o}
            depthWrite={false}
          />
        </mesh>
      ))}
    </>
  );
}

/** A box whose ends come forward by `bend` mm along a parabola: a curved monitor. */
function useBentBox(size: Vec3, bend: number) {
  const [l, h, d] = size;
  return useMemo(() => {
    const geo = new BoxGeometry(l, h, d - bend, 32, 1, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = (2 * pos.getX(i)) / l;
      pos.setZ(i, pos.getZ(i) - bend / 2 + bend * t * t);
    }
    geo.computeVertexNormals();
    return geo;
  }, [l, h, d, bend]);
}

function BentMesh({ b, children }: { b: DeskBlock; children: ReactNode }) {
  const geo = useBentBox(b.size, b.bend ?? 0);
  return (
    <mesh position={b.pos} geometry={geo}>
      {children}
    </mesh>
  );
}

/** One block: a rounded box, a cylinder for poles and round bases, or a curved panel. */
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
  // A flagged monitor's screen keeps its picture; the body and outline turn amber.
  const screen = b.tone === "screen";
  const tint = screen ? undefined : glow;
  const opacity = ghost ? 0.35 : (tone.opacity ?? 1);
  const rotation: [number, number, number, "YXZ"] | undefined =
    b.tilt || b.turn ? [b.tilt ?? 0, b.turn ?? 0, 0, "YXZ"] : undefined;
  const material = (
    <meshStandardMaterial
      color={tone.color}
      roughness={tone.roughness}
      metalness={tone.metalness}
      emissive={tint ?? tone.emissive ?? "#000000"}
      emissiveIntensity={tint ? 0.22 : (tone.emissiveIntensity ?? 0)}
      emissiveMap={screen ? screenTexture() : null}
      transparent={opacity < 1}
      opacity={opacity}
      depthWrite={opacity >= 1}
      // The screen sits just in front of the panel: pull it forward in depth so
      // the two never flicker through each other (curved panels especially).
      polygonOffset={screen}
      polygonOffsetFactor={screen ? -2 : 0}
      polygonOffsetUnits={screen ? -2 : 0}
    />
  );
  const outline = glow ? <Outlines thickness={2.5} color={glow} /> : null;
  if (b.bend)
    return (
      <BentMesh b={b}>
        {material}
        {outline}
      </BentMesh>
    );
  if (b.round) {
    const r = Math.min(b.size[0], b.size[2]) / 2;
    return (
      <mesh position={b.pos} rotation={rotation}>
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
      rotation={rotation}
    >
      {material}
      {outline}
    </RoundedBox>
  );
}

/**
 * Fades the chair while it stands between the camera and the screen, the desk top
 * or the PC (orbiting round behind it). It stands beside the desk, so from the
 * seated view it stays visible.
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

/** A thin amber line down the side of the desk top that something hangs over. */
function EdgeLine({
  side,
  desk,
}: {
  side: "left" | "right";
  desk: { widthMm: number; depthMm: number; heightMm: number };
}) {
  const x = ((side === "left" ? -1 : 1) * desk.widthMm) / 2;
  return (
    <mesh position={[x, desk.heightMm - 12, 0]}>
      <boxGeometry args={[10, 30, desk.depthMm + 6]} />
      <meshBasicMaterial color={WARN} toneMapped={false} />
    </mesh>
  );
}

function DeskCanvas({
  setup,
  pcCase,
  warnings = NO_WARNINGS,
  activeSlot = null,
  fallback,
  reducedMotion,
  cameraKeysRef,
  embedded = false,
  skipIntro = false,
}: DeskSceneProps) {
  const layout = useMemo(() => layoutDesk(setup, pcCase), [setup, pcCase]);
  const highlights = useMemo(
    () => deskHighlights(layout, warnings),
    [layout, warnings],
  );
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
  const [fx0, , fz0] = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);
  const [aimX, aimY, aimZ] = seatedTarget(layout);
  const view = useMemo<CameraView>(
    () => ({
      ...SEATED_VIEW,
      target: [aimX * MM_TO_UNITS, aimY * MM_TO_UNITS, aimZ * MM_TO_UNITS],
    }),
    [aimX, aimY, aimZ],
  );

  const chairTargets = useMemo(() => chairFadeTargets(layout), [layout]);
  // The floor covers what's framed and fades out well before its edge.
  const floorSize = Math.max(max[0] - min[0], max[2] - min[2]) * 2;

  const itemFor = (slot: DeskKey): Item | undefined =>
    slot === "pc" ? pcCase : setup[slot];

  const render = (item: (typeof items)[number], isLeaving: boolean) => {
    const glow = highlights.glow[item.slot] ? WARN : undefined;
    const ghost = item.id === "default-desk";
    const part = itemFor(item.slot);
    const meshes = item.blocks.map((b, i) => (
      <BlockMesh key={i} b={b} glow={glow} ghost={ghost} />
    ));
    const turned = item.rotY ? (
      <group rotation={[0, item.rotY, 0]}>{meshes}</group>
    ) : (
      meshes
    );
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
              {turned}
            </ChairFader>
          ) : (
            turned
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
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[fx0, -1, fz0]}
          renderOrder={-1}
        >
          <planeGeometry args={[floorSize, floorSize]} />
          <meshBasicMaterial
            color="#221f23"
            alphaMap={floorTexture()}
            transparent
            depthWrite={false}
          />
        </mesh>
        {[
          ...items.map((i) => render(i, false)),
          ...leaving.map((i) => render(i, true)),
        ]}
        <FloorShadows layout={layout} />
        {highlights.edges.map((side) => (
          <EdgeLine key={side} side={side} desk={layout.desk} />
        ))}
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
