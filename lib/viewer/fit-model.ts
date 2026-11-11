import {
  Box3,
  Matrix4,
  Vector3,
  type BufferGeometry,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import type { Vec3 } from "./layout";
import type { ModelFit } from "./models";

export interface FittedMesh {
  geometry: BufferGeometry;
  /** Name of the model's original material, used to pick a colour. */
  materialName: string;
  /** The original material's look, kept for materials we don't recolour. */
  color: string;
  roughness: number;
  metalness: number;
  /** The original material itself, for models that keep their own textures. */
  material?: Material;
}

/**
 * Bakes a loaded model into plain geometries that fill an item's box, centred on
 * the origin, after rotating it with `basis`:
 * - "stretch" (the default) scales each axis to `size`, so it fills the box exactly;
 * - "contain" scales all axes by the same amount, as large as fits inside the box,
 *   centred across and sitting on the box's bottom (-y).
 * The caller owns (and disposes) the returned geometries.
 */
export function fitModel(
  root: Object3D,
  basis: [Vec3, Vec3, Vec3],
  size: Vec3,
  fit: ModelFit = "stretch",
): FittedMesh[] {
  const rotate = new Matrix4().makeBasis(
    new Vector3(...basis[0]),
    new Vector3(...basis[1]),
    new Vector3(...basis[2]),
  );
  // A mirrored basis turns triangles inside out; flip their winding back afterwards.
  const mirrored = rotate.determinant() < 0;
  root.updateMatrixWorld(true);

  const out: FittedMesh[] = [];
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry
      .clone()
      .applyMatrix4(mesh.matrixWorld)
      .applyMatrix4(rotate);
    if (mirrored) flipWinding(geometry);
    const raw = mesh.material as Material | Material[];
    const mat = (Array.isArray(raw) ? raw[0] : raw) as
      Partial<MeshStandardMaterial> | undefined;
    out.push({
      geometry,
      materialName: mat?.name ?? "",
      color: mat?.color ? `#${mat.color.getHexString()}` : "#808080",
      roughness: mat?.roughness ?? 0.6,
      metalness: mat?.metalness ?? 0.2,
      material: Array.isArray(raw) ? raw[0] : raw,
    });
  });

  const box = new Box3();
  for (const m of out) {
    m.geometry.computeBoundingBox();
    if (m.geometry.boundingBox) box.union(m.geometry.boundingBox);
  }
  const center = box.getCenter(new Vector3());
  const extent = box.getSize(new Vector3());
  const perAxis = size.map(
    (s, i) => s / Math.max(extent.getComponent(i), 1e-6),
  );
  const scale =
    fit === "contain"
      ? new Vector3().setScalar(Math.min(...perAxis))
      : new Vector3(...perAxis);
  // "contain" drops the model onto the box's floor: its bottom at -size.y / 2.
  const lift = fit === "contain" ? (extent.y * scale.y - size[1]) / 2 : 0;
  const transform = new Matrix4()
    .makeTranslation(0, lift, 0)
    .multiply(new Matrix4().makeScale(scale.x, scale.y, scale.z))
    .multiply(new Matrix4().makeTranslation(-center.x, -center.y, -center.z));
  for (const m of out) {
    m.geometry.applyMatrix4(transform);
    m.geometry.computeVertexNormals();
  }
  return out;
}

/** Reverses every triangle's vertex order, so front faces stay front faces after a mirror. */
export function flipWinding(geometry: BufferGeometry): void {
  const index = geometry.getIndex();
  if (index) {
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1);
      index.setX(i + 1, index.getX(i + 2));
      index.setX(i + 2, b);
    }
    index.needsUpdate = true;
    return;
  }
  for (const attr of Object.values(geometry.attributes)) {
    const size = attr.itemSize;
    for (let i = 0; i + 2 < attr.count; i += 3) {
      for (let k = 0; k < size; k++) {
        const b = attr.getComponent(i + 1, k);
        attr.setComponent(i + 1, k, attr.getComponent(i + 2, k));
        attr.setComponent(i + 2, k, b);
      }
    }
    attr.needsUpdate = true;
  }
}
