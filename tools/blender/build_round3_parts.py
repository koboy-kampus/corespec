"""Round 3: monitors (flat + curved), monitor arm, bookshelf speaker, light bar, desk lamp, mousepad."""
import json, math, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bpy
from mathutils import Matrix, Vector
from lib3d import *

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")  # tools/blender/out (git-ignored)


def rrect(w, h, r, n=4):
    """Rounded-rectangle outline (x, z) centred on 0, bottom at z=0."""
    pts = []
    for cx, cz, a0 in [(w / 2 - r, h - r, 0), (-w / 2 + r, h - r, 90), (-w / 2 + r, r, 180), (w / 2 - r, r, 270)]:
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


