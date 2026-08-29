// Fix pfm-to-ttf? No — fix exr-to-png tiled/multipart detection.
// The OpenEXR version field: low byte = file-format version (1 or 2);
// bit 8 (0x100) = multipart flag; tiled is indicated by a "tiles" attribute.
// The old code mapped versionNumber 1/2/3/4 -> scanline/tiled/multipart/tiled-multipart,
// which is wrong and falsely rejects valid scanline v2 files.
import fs from "fs";
const f = "src/lib/converters/exr-to-png.ts";
let s = fs.readFileSync(f, "utf8");

const b1 = `  o += 4;
  const version = view.getUint32(o, true);
  o += 4;
  const versionNumber = version & 0xff;
  // versionNumber: 1=scanline single, 2=tiled single, 3=scanline multipart, 4=tiled multipart
  if (versionNumber < 1 || versionNumber > 4) {
    throw new Error(\`Unsupported EXR version (\${versionNumber}).\`);
  }
  if (versionNumber === 2 || versionNumber === 4) {
    throw new Error(
      "Tiled EXR is not supported by the in-browser decoder. Re-export as a scanline EXR (or use the desktop app).",
    );
  }
  if (versionNumber === 3 || versionNumber === 4) {
    throw new Error(
      "Multi-part EXR is not supported by the in-browser decoder. Flatten to a single-part EXR (or use the desktop app).",
    );
  }`;

const a1 = `  o += 4;
  const version = view.getUint32(o, true);
  o += 4;
  const versionNumber = version & 0xff;
  // OpenEXR version flags live in the high bits; the low byte is the
  // file-format version (1 or 2). Tiled vs scanline is NOT encoded in the
  // version number - it is indicated by the "tiles" attribute (parsed below).
  // Multipart is flagged by bit 8 (0x100).
  const isMultipart = (version & 0x100) !== 0;
  if (versionNumber < 1 || versionNumber > 2) {
    throw new Error(\`Unsupported EXR version (\${versionNumber}).\`);
  }
  if (isMultipart) {
    throw new Error(
      "Multi-part EXR is not supported by the in-browser decoder. Flatten to a single-part EXR (or use the desktop app).",
    );
  }`;

if (!s.includes(b1)) { console.error("PATCH1 NOT FOUND"); process.exit(3); }
s = s.replace(b1, a1);

const b2 = `  const channels: Channel[] = [];
  let compression = 0; // 0 = NO_COMPRESSION`;
const a2 = `  const channels: Channel[] = [];
  let compression = 0; // 0 = NO_COMPRESSION
  let tiled = false; // set when a "tiles" attribute is present`;
if (!s.includes(b2)) { console.error("PATCH2 NOT FOUND"); process.exit(3); }
s = s.replace(b2, a2);

const b3 = `    } else if (type === "compression") {
      compression = u8[o];
    }`;
const a3 = `    } else if (type === "compression") {
      compression = u8[o];
    } else if (name === "tiles") {
      tiled = true;
    }`;
if (!s.includes(b3)) { console.error("PATCH3 NOT FOUND"); process.exit(3); }
s = s.replace(b3, a3);

const b4 = `    o = valueStart + size;
  }

  if (channels.length === 0) {`;
const a4 = `    o = valueStart + size;
  }

  if (tiled) {
    throw new Error(
      "Tiled EXR is not supported by the in-browser decoder. Re-export as a scanline EXR (or use the desktop app).",
    );
  }

  if (channels.length === 0) {`;
if (!s.includes(b4)) { console.error("PATCH4 NOT FOUND"); process.exit(3); }
s = s.replace(b4, a4);

fs.writeFileSync("src/lib/converters/exr-to-png.fixed.ts", s);
console.log("wrote fixed file OK");
