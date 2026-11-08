"use client";

import { Outlines, RoundedBox } from "@react-three/drei";
import type { Facing, Fan, PartLayout, Vec3 } from "@/lib/viewer/layout";
import { GLOW, TONES, type Flag } from "./palette";

const FACE: Record<Facing, { rot: Vec3; normal: Vec3 }> = {
  "+z": { rot: [0, 0, 0], normal: [0, 0, 1] },
  "-z": { rot: [0, Math.PI, 0], normal: [0, 0, -1] },
  "+x": { rot: [0, Math.PI / 2, 0], normal: [1, 0, 0] },
  "-x": { rot: [0, -Math.PI / 2, 0], normal: [-1, 0, 0] },
  "+y": { rot: [-Math.PI / 2, 0, 0], normal: [0, 1, 0] },
  "-y": { rot: [Math.PI / 2, 0, 0], normal: [0, -1, 0] },
};

/** Rounded corners that never exceed half the thinnest side. */
function radiusFor(size: Vec3): number {
  return Math.min(3, Math.min(...size) * 0.3);
}

/** A fan as a frame ring, a dark blade disc and a hub, sitting just off the face. */
function FanDisc({ pos, radius, facing }: Fan) {
  const { rot, normal } = FACE[facing];
  const at = pos.map((p, i) => p + normal[i] * 0.8) as Vec3;
  return (
    <group position={at} rotation={rot}>
      <mesh>
        <circleGeometry args={[radius * 0.9, 40]} />
        <meshStandardMaterial color="#0d0c0e" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0, 0.3]}>
        <ringGeometry args={[radius * 0.9, radius, 40]} />
        <meshStandardMaterial color="#4b4a4b" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.5]}>
        <circleGeometry args={[radius * 0.28, 24]} />
        <meshStandardMaterial color="#2b282d" roughness={0.5} metalness={0.4} />
      </mesh>
    </group>
  );
}

/** A placeholder part: rounded boxes sized from its dims, glowing when check() flags it. */
export function PartMesh({
  layout,
  flag,
}: {
  layout: PartLayout;
  flag?: Flag;
}) {
  const glow = flag ? GLOW[flag] : undefined;
  return (
    <>
      {layout.blocks.map((b, i) => (
        <RoundedBox
          key={i}
          args={b.size}
          radius={radiusFor(b.size)}
          smoothness={3}
          position={b.pos}
        >
          <meshStandardMaterial
            {...TONES[b.tone]}
            emissive={glow ?? "#000000"}
            emissiveIntensity={glow ? 0.25 : 0}
          />
          {glow ? <Outlines thickness={2.5} color={glow} /> : null}
        </RoundedBox>
      ))}
      {layout.fans.map((f, i) => (
        <FanDisc key={i} {...f} />
      ))}
    </>
  );
}
