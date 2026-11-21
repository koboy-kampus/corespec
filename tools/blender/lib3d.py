"""Small helpers for building CoreSpec models with bpy (units: millimetres, Blender Z up).

Axis convention so the exported glTF matches CoreSpec's item space
(x = width/right, y = up, z = toward the person):
  Blender +X -> glTF +X, Blender +Z -> glTF +Y, Blender -Y -> glTF +Z.
So "toward the person" is Blender -Y, and the desk is at Blender +Y.
"""
import math
import bpy
import bmesh
from mathutils import Vector, Matrix

MAT_LOOK = {
    # name: (base colour, roughness, metalness) -- only for previews; the site recolours by name
    "desk": ((0.42, 0.40, 0.42, 1), 0.7, 0.05),
    "wood": ((0.55, 0.40, 0.27, 1), 0.6, 0.0),
    "leg": ((0.33, 0.32, 0.34, 1), 0.4, 0.75),
    "steel": ((0.48, 0.47, 0.49, 1), 0.35, 0.8),
    "dark": ((0.27, 0.26, 0.29, 1), 0.5, 0.35),
    "black": ((0.09, 0.09, 0.1, 1), 0.55, 0.25),
    "fabric": ((0.2, 0.19, 0.21, 1), 0.9, 0.05),
    "accent": ((0.85, 0.12, 0.2, 1), 0.6, 0.05),
    "pad": ((0.12, 0.12, 0.13, 1), 0.95, 0.0),
    "screen": ((0.02, 0.02, 0.03, 1), 0.2, 0.1),
    "light": ((1.0, 0.95, 0.9, 1), 0.4, 0.0),
    "mesh": ((0.15, 0.15, 0.16, 1), 0.8, 0.1),
}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.unit_settings.system = "METRIC"
    s.unit_settings.scale_length = 0.001


def mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    col, rough, metal = MAT_LOOK.get(name, ((0.5, 0.5, 0.5, 1), 0.5, 0.0))
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = col
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if name in ("screen", "light"):
        b.inputs["Emission Color"].default_value = (1, 1, 1, 1) if name == "light" else (0.25, 0.3, 0.45, 1)
        b.inputs["Emission Strength"].default_value = 2.0 if name == "light" else 0.6
    m.diffuse_color = col
    return m


def _finish(obj, material, bevel=0.0, segments=2, subsurf=0, smooth=True):
    obj.data.materials.append(mat(material))
    if bevel > 0:
        b = obj.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = segments
        b.limit_method = "ANGLE"
    if subsurf:
        s = obj.modifiers.new("sub", "SUBSURF")
        s.levels = subsurf
        s.render_levels = subsurf
    if smooth:
        for p in obj.data.polygons:
            p.use_smooth = True
    return obj


def box(name, size, loc, material, bevel=0.0, segments=2, subsurf=0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, material, bevel, segments, subsurf, smooth=bevel > 0 or subsurf > 0)


def cyl(name, radius, depth, loc, material, rot=(0, 0, 0), verts=24, bevel=0.0, r2=None):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=radius, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    o.name = name
    _finish(o, material, bevel, 2, 0, smooth=True)
    # flat caps
    for p in o.data.polygons:
        if len(p.vertices) > 4:
            p.use_smooth = False
    return o


def sphere(name, radius, loc, material, scale=(1, 1, 1), segs=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=segs // 2, radius=radius, location=loc)
    o = bpy.context.active_object
    o.name = name
    o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return _finish(o, material, smooth=True)


def outline_slab(name, pts, thickness, material, bevel=6.0, segments=3, loc=(0, 0, 0), rot=(0, 0, 0)):
    """A flat shape from an XZ outline (list of (x, z)), extruded along Y by thickness, centred on Y=0."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((x, -thickness / 2, z)) for x, z in pts]
    f = bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=[f])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    moved = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, thickness, 0)), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = rot
    bpy.context.view_layer.objects.active = o
    return _finish(o, material, bevel, segments, 0, smooth=True)


def apply_all():
    for o in list(bpy.context.scene.objects):
        if o.type != "MESH":
            continue
        bpy.context.view_layer.objects.active = o
        o.select_set(True)
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
        o.select_set(False)


def join_by_material(name):
    """Apply modifiers, then join everything into one object (materials kept as slots)."""
    apply_all()
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    # merge duplicate material slots by name
    bpy.ops.object.material_slot_remove_unused()
    return o


def stats(o):
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    dims = o.dimensions
    return {"tris": tris, "dims_mm": [round(dims.x), round(dims.y), round(dims.z)], "materials": [m.name for m in o.data.materials]}


def export_glb(path):
    """Export in metres with the origin at the bottom centre (repo checklist), then restore for the preview."""
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.context.view_layer.update()
    ws = [o.matrix_world @ v.co for o in objs for v in o.data.vertices]
    cx = (min(v.x for v in ws) + max(v.x for v in ws)) / 2
    cy = (min(v.y for v in ws) + max(v.y for v in ws)) / 2
    z0 = min(v.z for v in ws)
    for o in objs:
        o.location = (o.location.x - cx, o.location.y - cy, o.location.z - z0)
        o.scale = (0.001, 0.001, 0.001)
        o.location = o.location * 0.001
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.view_layer.update()
    _gltf(path)
    for o in objs:
        o.scale = (1, 1, 1)
        o.location = o.location * 1000 + Vector((cx, cy, z0))
    bpy.context.scene.unit_settings.scale_length = 0.001
    bpy.context.view_layer.update()


def _gltf(path):
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=False,
                              export_apply=True, export_yup=True, export_materials="EXPORT",
                              export_draco_mesh_compression_enable=False)


def render_preview(path, target, cam_dir=(1.0, -1.25, 0.75), dist=None, res=(900, 700), samples=24):
    """Quick Cycles CPU render. target: (x, y, z) centre; cam_dir: from target toward the camera."""
    scene = bpy.context.scene
    world = bpy.data.worlds.new("w")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.055, 0.055, 0.065, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    # floor
    bpy.ops.mesh.primitive_plane_add(size=8000, location=(target[0], target[1], 0))
    fl = bpy.context.active_object
    fm = bpy.data.materials.new("floor_preview")
    fm.use_nodes = True
    fm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.08, 0.08, 0.09, 1)
    fm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.8
    fl.data.materials.append(fm)
    # lights
    for loc, energy, size in [((2000, -2500, 3000), 2.2e7, 1500), ((-2500, -800, 1800), 8e6, 1200), ((0, 2500, 2200), 9e6, 1500)]:
        bpy.ops.object.light_add(type="AREA", location=loc)
        L = bpy.context.active_object
        L.data.energy = energy
        L.data.size = size
        d = Vector(target) - L.location
        L.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    # camera
    d = Vector(cam_dir).normalized()
    bpy.ops.object.camera_add(location=Vector(target) + d * (dist or 3000))
    cam = bpy.context.active_object
    cam.data.lens = 45
    cam.data.clip_end = 100000
    cam.rotation_euler = (Vector(target) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y = res
    scene.render.filepath = path
    scene.view_settings.view_transform = "AgX"
    bpy.ops.render.render(write_still=True)


def curved_slab(name, pts, thickness, material, k, loc=(0, 0, 0), bevel=6.0, segments=3, step=20.0):
    """Like outline_slab, but cut into vertical strips and curved: y += k * x^2 (edges come toward +Y when k > 0)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((x, -thickness / 2, z)) for x, z in pts]
    f = bm.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm, faces=[f])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    moved = [e for e in ext["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=Vector((0, thickness, 0)), verts=moved)
    xs = [p[0] for p in pts]
    x = min(xs) + step
    while x < max(xs):
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(x, 0, 0), plane_no=(1, 0, 0))
        x += step
    for v in bm.verts:
        v.co.y += k * v.co.x * v.co.x
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.location = loc
    bpy.context.view_layer.objects.active = o
    _finish(o, material, bevel, segments, 0, smooth=True)
    if bevel > 0:
        o.modifiers["bevel"].angle_limit = math.radians(50)
    return o
