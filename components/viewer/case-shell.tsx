"use client";

import { Edges, RoundedBox } from "@react-three/drei";
import type { CaseLayout, Vec3 } from "@/lib/viewer/layout";
import { CASE_TONE, GLOW, type Flag } from "./palette";

interface Panel {
  pos: Vec3;
  size: Vec3;
  /** Below 1 the panel reads as mesh, so you can see through it. */
  opacity: number;
}

function panels({ size: [L, H, W], wall: t }: CaseLayout): Panel[] {
  return [
    { pos: [0, 0, -W / 2 + t / 2], size: [L, H, t], opacity: 1 }, // board tray
    { pos: [0, -H / 2 + t / 2, 0], size: [L, t, W], opacity: 1 }, // floor
    { pos: [L / 2 - t / 2, 0, 0], size: [t, H, W], opacity: 1 }, // rear
    { pos: [0, H / 2 - t / 2, 0], size: [L, t, W], opacity: 0.35 }, // top mesh
    { pos: [-L / 2 + t / 2, 0, 0], size: [t, H, W], opacity: 0.25 }, // front mesh
  ];
}

/**
 * The case: metal walls, a smoked-glass side panel facing the camera, a PSU shroud
 * when there's room, and thin edge lines. With no case picked, only a faint outline.
 */
export function CaseShell({ shell, flag }: { shell: CaseLayout; flag?: Flag }) {
  const [L, H, W] = shell.size;
  const edge = flag ? GLOW[flag] : "#ffffff";

  const outline = (
    <mesh>
      <boxGeometry args={[L, H, W]} />
      <meshBasicMaterial visible={false} />
      <Edges
        color={edge}
        transparent
        opacity={flag ? 0.9 : shell.ghost ? 0.14 : 0.22}
      />
    </mesh>
  );

  if (shell.ghost) return outline;

  return (
    <>
      {panels(shell).map((p, i) => (
        <RoundedBox
          key={i}
          args={p.size}
          radius={2}
          smoothness={2}
          position={p.pos}
        >
          <meshStandardMaterial
            {...CASE_TONE}
            transparent={p.opacity < 1}
            opacity={p.opacity}
            depthWrite={p.opacity === 1}
          />
        </RoundedBox>
      ))}

      {shell.shroud ? (
        <mesh position={shell.shroud.pos}>
          <boxGeometry args={shell.shroud.size} />
          <meshStandardMaterial
            {...CASE_TONE}
            transparent
            opacity={0.5}
            depthWrite={false}
          />
          <Edges color="#ffffff" transparent opacity={0.12} />
        </mesh>
      ) : null}

      {/* smoked glass */}
      <mesh position={[0, 0, W / 2 - 2]} renderOrder={10}>
        <boxGeometry args={[L - 2 * shell.wall, H - 2 * shell.wall, 3]} />
        <meshStandardMaterial
          color="#8d95a3"
          roughness={0.05}
          metalness={0.2}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      {outline}
    </>
  );
}
