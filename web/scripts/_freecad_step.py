"""FreeCAD GUI helper: build the L-bracket (base + wall, four bolt holes) as a
real B-Rep document, isometric view, zoom to fit. Passed to FreeCAD.exe as a
startup script — runs after the GUI is up.
"""

import FreeCAD as App
import FreeCADGui
from FreeCAD import Base

doc = App.newDocument("bracket_part")

base = doc.addObject("Part::Box", "Base")
base.Length, base.Width, base.Height = 80, 60, 10
base.Placement = App.Placement(Base.Vector(-80, -30, 0), App.Rotation())

wall = doc.addObject("Part::Box", "Wall")
wall.Length, wall.Width, wall.Height = 10, 60, 50
wall.Placement = App.Placement(Base.Vector(-10, -30, 10), App.Rotation())

union = doc.addObject("Part::MultiFuse", "Body")
union.Shapes = [base, wall]

holes = []
for name, pos, rot in [
    ("HoleB1", Base.Vector(-50, -18, -3), App.Rotation()),                       # along Z
    ("HoleB2", Base.Vector(-50, 18, -3), App.Rotation()),
    ("HoleW1", Base.Vector(-13, -18, 45), App.Rotation(Base.Vector(0, 1, 0), 90)),  # along X
    ("HoleW2", Base.Vector(-13, 18, 45), App.Rotation(Base.Vector(0, 1, 0), 90)),
]:
    cyl = doc.addObject("Part::Cylinder", name)
    cyl.Radius, cyl.Height = 3, 16
    cyl.Placement = App.Placement(pos, rot)
    holes.append(cyl)

cut = doc.addObject("Part::Cut", "Bracket")
cut.Base = union
cut.Tool = holes[0]
for h in holes[1:]:
    c = doc.addObject("Part::Cut", "HoleCut")
    c.Base = cut
    c.Tool = h
    cut = c
doc.recompute()

for obj in (base, wall, union, *holes):
    obj.Visibility = False

FreeCADGui.activeDocument().activeView().viewIsometric()
FreeCADGui.SendMsgToActiveView("ViewFit")
print("step scene ready")
