const fontkit = require("fontkit");
const fs = require("fs");
const p =
  "D:/install/Trae/resources/app/node_modules/trae-browser-inspect/dist/pdfjs/standard_fonts/FoxitSerif.pfb";
const buf = fs.readFileSync(p);
console.log("loaded bytes", buf.length, "isBuffer", Buffer.isBuffer(buf));
let font;
try {
  font = fontkit.create(buf);
} catch (e) {
  console.log("create err", e.message);
  try {
    font = fontkit.openSync(p);
  } catch (e2) {
    console.log("openSync err", e2.message);
    process.exit(1);
  }
}
console.log("type", font.type, "numGlyphs", font.numGlyphs, "unitsPerEm", font.unitsPerEm);
console.log("ascender", font.ascender, "descender", font.descender);
console.log("postscriptName", font.postscriptName);
function inspectGlyph(g, label) {
  if (!g) {
    console.log(label, "NULL");
    return;
  }
  console.log("---", label, "id", g.id, "advanceWidth", g.advanceWidth);
  const path = g.path;
  console.log(
    "  path commands count",
    path && path.commands ? path.commands.length : "n/a",
  );
  if (path && path.commands)
    console.log("  sample cmd", JSON.stringify(path.commands.slice(0, 4)));
}
inspectGlyph(font.getGlyph(0), ".notdef");
try {
  inspectGlyph(font.glyphForCode(65), "A (code65)");
} catch (e) {
  console.log("glyphForCode err", e.message);
}
try {
  console.log(
    "characterToGlyph A ->",
    font.characterToGlyph ? font.characterToGlyph("A") : "n/a",
  );
} catch (e) {
  console.log("characterToGlyph err", e.message);
}
try {
  const g = font.glyphForCode(65);
  const types = {};
  g.path.commands.forEach((c) => (types[c.type] = (types[c.type] || 0) + 1));
  console.log("A cmd types", JSON.stringify(types));
} catch (e) {
  console.log("cmdtypes err", e.message);
}
