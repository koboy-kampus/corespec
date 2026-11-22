"""Round 2: boxy pillows on the gaming chair + an ergonomic office chair."""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Matrix, Vector
from lib3d import *
from models_a import gaming_chair, about

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")  # tools/blender/out (git-ignored)


def bend(obj, angle_deg):
    m = obj.modifiers.new("bend", "SIMPLE_DEFORM")
    m.deform_method = "BEND"
    m.deform_axis = "Z"
    m.angle = math.radians(angle_deg)
    # keep bevel before bend
    bpy.context.view_layer.objects.active = obj
    return obj


def office_chair():
    reset()
    # 5-star base, gas lift, mechanism
    cyl("hub", 42, 55, (0, 0, 100), "black", verts=32, bevel=4)
    for k in range(5):
        a = math.radians(90 + k * 72)
        box(f"leg{k}", (290, 44, 30), (165 * math.cos(a), 165 * math.sin(a), 88), "black", bevel=10, segments=3,
            rot=(0, math.radians(5), a))
        tip = Vector((310 * math.cos(a), 310 * math.sin(a), 0))
        box(f"fork{k}", (30, 30, 28), (tip.x, tip.y, 68), "black", bevel=5)
        for s in (-1, 1):
            cyl(f"wheel{k}{s}", 26, 12, (tip.x + s * 9 * math.sin(a), tip.y - s * 9 * math.cos(a), 28), "black",
                rot=(math.radians(90), 0, a), verts=20, bevel=3)
    cyl("sleeve", 27, 220, (0, 0, 235), "black", verts=28, bevel=3)
    cyl("piston", 17, 110, (0, 0, 395), "steel", verts=24)
    box("mech", (230, 220, 40), (0, 0, 440), "dark", bevel=8)
    box("knob", (16, 16, 70), (130, 70, 430), "black", bevel=5)
    # seat with a waterfall front edge
    box("seat_shell", (480, 460, 26), (0, 15, 470), "black", bevel=10)
    box("seat_cushion", (500, 480, 70), (0, 20, 515), "fabric", bevel=28, segments=4)
    # spine from the mechanism up behind the seat
    box("spine", (70, 40, 300), (0, -240, 520), "black", bevel=10, rot=(math.radians(-14), 0, 0))
    # loop armrests
    for s in (-1, 1):
        box(f"arm_link{s}", (70, 40, 26), (s * 235, -40, 470), "black", bevel=6)
        box(f"arm_post{s}", (36, 46, 200), (s * 270, -40, 575), "black", bevel=8)
        box(f"arm_pad{s}", (78, 250, 28), (s * 270, -5, 685), "dark", bevel=12, segments=3)
    # curved mesh back on a black frame, reclined
    pivot = (0, -255, 560)
    px, py, pz = pivot
    K = 0.0016  # edges ~100 mm forward at x = 250
    frame = [(-205, 0), (-245, 200), (-252, 430), (-240, 600), (-220, 660), (-185, 705), (-135, 728), (-70, 738)]
    frame_o = frame + [(-x, z) for x, z in reversed(frame)]
    meshp = [(-180, 30), (-218, 200), (-225, 430), (-214, 590), (-195, 640), (-162, 678), (-118, 698), (-60, 706)]
    mesh_o = meshp + [(-x, z) for x, z in reversed(meshp)]
    lum = [(-150, 0), (-150, 75), (150, 75), (150, 0)]
    back = [
        curved_slab("back_frame", frame_o, 30, "black", K, loc=(px, py, pz), bevel=9),
        curved_slab("back_mesh", mesh_o, 10, "mesh", K, loc=(px, py + 17, pz), bevel=3, segments=2),
        curved_slab("lumbar", lum, 22, "dark", K, loc=(px, py + 30, pz + 180), bevel=10),
    ]
    about(back, pivot, 10)
    return join_by_material("chair-office")


report = {}
for fn in (office_chair, gaming_chair):
    o = fn()
    report[o.name] = stats(o)
    export_glb(f"{OUT}/{o.name}.glb")
    render_preview(f"{OUT}/{o.name}.png", (0, 0, 640), cam_dir=(1.0, 1.1, 0.45), dist=3300)
print(json.dumps(report, indent=1))
