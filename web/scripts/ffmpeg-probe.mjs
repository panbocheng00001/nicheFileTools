// Probe: can @ffmpeg/core decode GSM and generate/decode EXR in this build?
// Serves web/public over HTTP so toBlobURL can fetch the core in Node.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

const PUBLIC = path.resolve("public");
const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];
  const fp = path.join(PUBLIC, url);
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("nf");
      return;
    }
    const ext = path.extname(fp);
    const ct = ext === ".wasm" ? "application/wasm" : "text/javascript";
    res.writeHead(200, { "Content-Type": ct });
    res.end(data);
  });
});

const PORT = 8731;
await new Promise((r) => server.listen(PORT, r));
const base = `http://localhost:${PORT}`;

const ffmpeg = new FFmpeg();
try {
  await ffmpeg.load({
    coreURL: await toBlobURL(`${base}/ffmpeg/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${base}/ffmpeg/ffmpeg-core.wasm`, "application/wasm"),
  });
  console.log("FFMPEG_LOADED ok");
} catch (e) {
  console.log("FFMPEG_LOADED fail:", e.message);
  process.exit(1);
}

// Build a tiny 8000Hz mono sine WAV (0.1s)
function makeWav() {
  const sr = 8000,
    n = sr * 0.1;
  const data = new Int16Array(n);
  for (let i = 0; i < n; i++) data[i] = Math.round(8000 * Math.sin((2 * Math.PI * 440 * i) / sr));
  const hdr = new ArrayBuffer(44);
  const v = new DataView(hdr);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); ws(8, "WAVE"); ws(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true);
  v.setUint16(34, 16, true); ws(36, "data"); v.setUint32(40, n * 2, true);
  return new Uint8Array([...new Uint8Array(hdr), ...new Uint8Array(data.buffer)]);
}

async function tryRun(label, args) {
  try {
    await ffmpeg.exec(args);
    console.log(`RUN ${label} ok`);
    return true;
  } catch (e) {
    console.log(`RUN ${label} FAIL:`, e.message);
    return false;
  }
}

// GSM test
await ffmpeg.writeFile("in.wav", await fetchFile(new Blob([makeWav()])));
const gsmEnc = await tryRun("wav->gsm", ["-i", "in.wav", "-acodec", "gsm", "out.gsm"]);
let gsmDecode = false;
if (gsmEnc) {
  const g = await ffmpeg.readFile("out.gsm");
  console.log("GSM_SIZE", (g).length ?? (g).byteLength);
  gsmDecode = await tryRun("gsm->wav", ["-i", "out.gsm", "truth.wav"]);
}
console.log("GSM_DECODE_SUPPORTED", gsmDecode);

// EXR test: generate via ffmpeg, decode via ffmpeg
await tryRun("testsrc->exr", [
  "-f", "lavfi", "-i", "testsrc=size=64x64", "-frames:v", "1",
  "-pix_fmt", "gbrpf32le", "gen.exr",
]);
let exrDecode = false;
try {
  const exr = await ffmpeg.readFile("gen.exr");
  console.log("EXR_SIZE", exr.byteLength ?? exr.length);
  exrDecode = await tryRun("exr->png", ["-i", "gen.exr", "truth.png"]);
} catch (e) {
  console.log("EXR_GEN_FAIL", e.message);
}
console.log("EXR_DECODE_SUPPORTED", exrDecode);

server.close();
process.exit(0);
