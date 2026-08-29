const fontkit = require("fontkit");
const fs = require("fs");
const pfbPath =
  "D:/install/Trae/resources/app/node_modules/trae-browser-inspect/dist/pdfjs/standard_fonts/FoxitSerif.pfb";

function pfbToPfa(buffer) {
  const u8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let out = "";
  let i = 0;
  let chunks = 0;
  while (i < u8.length) {
    if (u8[i] !== 0x80) {
      // skip stray bytes (shouldn't happen)
      i++;
      continue;
    }
    const type = u8[i + 1];
    if (type === 3) break; // EOF marker
    const len =
      u8[i + 2] | (u8[i + 3] << 8) | (u8[i + 4] << 16) | (u8[i + 5] << 24);
    let data = u8.slice(i + 6, i + 6 + len);
    i += 6 + len;
    chunks++;
    if (type === 1) {
      out += Buffer.from(data).toString("latin1");
    } else if (type === 2) {
      let hex = "";
      for (let k = 0; k < data.length; k++)
        hex += data[k].toString(16).padStart(2, "0");
      out += "<" + hex + ">";
    }
  }
  return { pfa: out, chunks };
}

const buf = fs.readFileSync(pfbPath);
const { pfa, chunks } = pfbToPfa(buf);
console.log("chunks", chunks, "pfa length", pfa.length);
fs.writeFileSync("/tmp/FoxitSerif.pfa", pfa);

let font;
try {
  font = fontkit.create(Buffer.from(pfa, "latin1"));
  console.log("fontkit parsed PFA: type", font.type, "numGlyphs", font.numGlyphs, "upm", font.unitsPerEm);
  const g = font.glyphForCode(65);
  console.log("A id", g.id, "adv", g.advanceWidth, "cmds", g.path.commands.length);
  const types = {};
  g.path.commands.forEach((c) => (types[c.type] = (types[c.type] || 0) + 1));
  console.log("A cmd types", JSON.stringify(types));
} catch (e) {
  console.log("PFA parse err", e.message);
}
