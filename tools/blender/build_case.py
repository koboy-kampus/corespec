"""PC case for the desk view: mid-tower, glass side on +X, simple internals behind it."""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy, bmesh
from mathutils import Vector
from lib3d import *
from lib3d import _finish

OUT = "/home/claude/models3d/out"


def glass_mat():
    m = mat("glass")
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (0.6, 0.65, 0.7, 1)
    b.inputs["Roughness"].default_value = 0.05
    b.inputs["Alpha"].default_value = 0.18
    m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    return m


def ring(name, r, t, loc, material):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=t, major_segments=32, minor_segments=8,
                                     location=loc, rotation=(math.radians(90), 0, 0))
    o = bpy.context.active_object; o.name = name
    return _finish(o, material, smooth=True)


def pc_case():
    reset()
    W, D, H, T = 227, 428, 464, 8   # x width, y depth (front at -Y), z height, panel thickness
    x0, x1, y0, y1 = -W / 2, W / 2, -D / 2, D / 2
    # shell: top, bottom, back, solid left side, front frame
    box("top", (W, D, T), (0, 0, H - T / 2), "black", bevel=3)
    box("bottom", (W, D, T), (0, 0, 14 + T / 2), "black", bevel=2)
    box("back", (W - 2 * T, T, H - 22), (0, y1 - T / 2, 14 + (H - 22) / 2), "black", bevel=1)
    box("left", (T, D, H - 14), (x0 + T / 2, 0, 14 + (H - 14) / 2), "black", bevel=3)
    # glass side (+X) in a thin frame
    box("glass", (3, D - 24, H - 40), (x1 - 2, 0, 14 + (H - 14) / 2), "glass")
    for z in (22, H - 8):
        box(f"gframe_h{z}", (6, D, 8), (x1 - 3, 0, z), "black", bevel=1)
    for y in (y0 + 6, y1 - 6):
        box(f"gframe_v{y}", (6, 12, H - 14), (x1 - 3, y, 14 + (H - 14) / 2), "black", bevel=1)
    # front: mesh panel with a black surround and a power button on top
    box("front_frame", (W, 10, H - 14), (0, y0 + 5, 14 + (H - 14) / 2), "black", bevel=4)
    box("front_mesh", (W - 34, 4, H - 70), (0, y0 - 1, 14 + (H - 14) / 2), "mesh", bevel=1)
    # vertical RGB strips down both front edges (they glow like the fan rings)
    for sx in (-1, 1):
        box(f"front_strip{sx}", (5, 3, H - 90), (sx * (W / 2 - 9), y0 - 1.5, 14 + (H - 14) / 2), "accent", bevel=1)
    cyl("power", 6, 3, (W / 2 - 30, y0 + 30, H + 1), "steel", verts=20)
    box("io", (40, 14, 2), (W / 2 - 70, y0 + 30, H + 0.5), "dark")
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(f"foot{sx}{sy}", (40, 30, 14), (sx * (W / 2 - 30), sy * (D / 2 - 40), 7), "dark", bevel=4)
    # internals (seen through the glass)
    box("mobo", (4, 300, 300), (x0 + T + 14, 30, 150 + 160), "dark", bevel=1)
    box("shroud", (W - T - 6, D - 2 * T - 8, 120), (T / 2 - 1, 0, 14 + T + 60), "black", bevel=4)
    gpu_len = 300
    box("gpu", (115, gpu_len, 48), (x0 + T + 16 + 60, y1 - T - gpu_len / 2 - 8, 214), "dark", bevel=6)
    box("gpu_shroud", (117, gpu_len - 20, 6), (x0 + T + 16 + 60, y1 - T - gpu_len / 2 - 8, 189), "steel", bevel=2)
    for i in range(3):
        ring(f"gpu_fan{i}", 34, 2.5, (0, 0, 0), "accent")
        o = bpy.context.active_object
        o.rotation_euler = (0, 0, 0)
        o.location = (x0 + T + 16 + 60, y1 - T - 50 - i * 95, 187)
    box("cooler", (80, 120, 150), (x0 + T + 16 + 55, 60, 335), "steel", bevel=3)
    box("cooler_top", (82, 124, 10), (x0 + T + 16 + 55, 60, 412), "black", bevel=2)
    box("cooler_fan", (24, 124, 124), (x0 + T + 16 + 55, 60 - 72, 335), "black", bevel=6)
    ring("cooler_ring", 52, 2.5, (x0 + T + 16 + 55, 60 - 85, 335), "accent")
    for i in range(2):
        box(f"ram{i}", (34, 6, 130), (x0 + T + 32, 140 + i * 10, 345), "dark", bevel=1)
    # front intake fans with RGB rings, and a rear exhaust fan
    for i in range(3):
        z = 14 + T + 140 + i * 105
        box(f"fan{i}", (120, 26, 120), (0, y0 + 26, z), "black", bevel=8)
        ring(f"fan_ring{i}", 52, 3, (0, y0 + 12, z), "accent")
    box("rear_fan", (120, 26, 120), (0, y1 - T - 16, 360), "black", bevel=8)
    ring("rear_ring", 52, 3, (0, y1 - T - 30, 360), "accent")
    # visible ARGB behind the glass: strips along the top and the PSU shroud
    box("strip_top", (5, D - 40, 5), (x1 - 14, 0, H - T - 6), "accent", bevel=1.5)
    box("strip_shroud", (5, D - 40, 5), (x1 - 14, 0, 14 + T + 122), "accent", bevel=1.5)
    o = join_by_material("case-mid-tower")
    # transparent glass in the exported glTF
    g = bpy.data.materials.get("glass")
    if g:
        b = g.node_tree.nodes["Principled BSDF"]
        b.inputs["Alpha"].default_value = 0.18
        b.inputs["Roughness"].default_value = 0.05
        b.inputs["Base Color"].default_value = (0.6, 0.65, 0.7, 1)
    return o


o = pc_case()
print(json.dumps({o.name: stats(o)}))
export_glb(f"{OUT}/{o.name}.glb")
# preview only (after export): clear glass, glowing RGB, a light inside
for m in bpy.data.materials:
    b = m.node_tree.nodes.get("Principled BSDF") if m.use_nodes else None
    if not b:
        continue
    if m.name == "glass":
        b.inputs["Alpha"].default_value = 0.05
    if m.name == "accent":
        b.inputs["Emission Color"].default_value = (1.0, 0.25, 0.3, 1)
        b.inputs["Emission Strength"].default_value = 8
    if m.name == "steel":
        b.inputs["Base Color"].default_value = (0.45, 0.45, 0.48, 1)
    if m.name == "dark":
        b.inputs["Base Color"].default_value = (0.18, 0.18, 0.2, 1)
bpy.ops.object.light_add(type="POINT", location=(20, 0, 330))
bpy.context.active_object.data.energy = 3e5
render_preview(f"{OUT}/{o.name}.png", (0, 0, 230), cam_dir=(1.25, -1.0, 0.45), dist=1600, res=(900, 760), samples=24)
