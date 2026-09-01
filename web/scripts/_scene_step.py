"""FreeCAD headless: rebuild bracket_part.stp as a real B-Rep STEP AP214.

Run:  FreeCADCmd.exe _scene_step.py
"""

import Part
from FreeCAD import Base

mm = 1.0

base = Part.makeBox(80 * mm, 60 * mm, 10 * mm, Base.Vector(-80 * mm, -30 * mm, 0))
wall = Part.makeBox(10 * mm, 60 * mm, 50 * mm, Base.Vector(-10 * mm, -30 * mm, 10 * mm))
shape = base.fuse(wall)

holes = [
    Part.makeCylinder(3 * mm, 16 * mm, Base.Vector(-50 * mm, -18 * mm, -3 * mm), Base.Vector(0, 0, 1)),
    Part.makeCylinder(3 * mm, 16 * mm, Base.Vector(-50 * mm, 18 * mm, -3 * mm), Base.Vector(0, 0, 1)),
    Part.makeCylinder(3 * mm, 16 * mm, Base.Vector(-13 * mm, -18 * mm, 45 * mm), Base.Vector(1, 0, 0)),
    Part.makeCylinder(3 * mm, 16 * mm, Base.Vector(-13 * mm, 18 * mm, 45 * mm), Base.Vector(1, 0, 0)),
]
for h in holes:
    shape = shape.cut(h)

shape.Label = "bracket_part"
Part.export([shape], r"C:\nft-scenes\creo-export\bracket_part.stp")
print("bracket_part.stp written, solids:", len(shape.Solids))
