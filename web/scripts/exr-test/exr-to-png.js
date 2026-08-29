"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExrToPngConverter = void 0;
// EXR (OpenEXR) → PNG：纯 JS 解码器（技术需求文档 §4.3.2）。
// 支持单 part 的 scanline EXR，压缩方式：NO_COMPRESSION / RLE / ZIPS / ZIP / PXR24。
// PIZ / B44 / B44A / DWAA / DWAB 及 tiled / multipart 如实报错（与 eot-to-ttf 的处理风格一致）。
// 解码后做色调映射（Reinhard / ACES Filmic）+ sRGB gamma，再用 upng-js 编码 PNG。
const upng_js_1 = __importDefault(require("upng-js"));
const interfaces_1 = require("./interfaces");
// ---- 低层解压（zlib / raw deflate 通过 DecompressionStream）----
async function inflateZlib(bytes) {
    // OpenEXR ZIP/ZIPS use RAW DEFLATE (RFC 1951), not zlib-wrapped.
    const ds = new DecompressionStream("deflate-raw");
    const stream = new Blob([bytes]).stream().pipeThrough(ds);
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
}
// 半精度浮点 (IEEE 754 half) → 单精度浮点
function halfToFloat(h) {
    const s = (h & 0x8000) >> 15;
    const e = (h & 0x7c00) >> 10;
    const f = h & 0x03ff;
    if (e === 0) {
        if (f === 0)
            return s ? -0 : 0;
        // subnormal
        return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
    }
    if (e === 0x1f) {
        if (f === 0)
            return s ? -Infinity : Infinity;
        return NaN;
    }
    return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}
const EXR_MAGIC = [0x76, 0x2f, 0x31, 0x01];
// 解析头（只读单 part scanline 的常见情况）
function parseHeader(view, u8) {
    let o = 0;
    for (let i = 0; i < 4; i++) {
        if (u8[o + i] !== EXR_MAGIC[i]) {
            throw new Error("Not a valid OpenEXR (EXR) file — bad magic number.");
        }
    }
    o += 4;
    const version = view.getUint32(o, true);
    o += 4;
    const versionNumber = version & 0xff;
    // versionNumber: 1=scanline single, 2=tiled single, 3=scanline multipart, 4=tiled multipart
    if (versionNumber < 1 || versionNumber > 4) {
        throw new Error(`Unsupported EXR version (${versionNumber}).`);
    }
    if (versionNumber === 2 || versionNumber === 4) {
        throw new Error("Tiled EXR is not supported by the in-browser decoder. Re-export as a scanline EXR (or use the desktop app).");
    }
    if (versionNumber === 3 || versionNumber === 4) {
        throw new Error("Multi-part EXR is not supported by the in-browser decoder. Flatten to a single-part EXR (or use the desktop app).");
    }
    // 属性列表，直到 name 为空
    let xMin = 0, yMin = 0, xMax = 0, yMax = 0;
    const channels = [];
    let compression = 0; // 0 = NO_COMPRESSION
    const readString = () => {
        let s = "";
        while (u8[o] !== 0) {
            s += String.fromCharCode(u8[o++]);
        }
        o++; // 跳过 null
        return s;
    };
    const readAttrValue = (size) => {
        const v = u8.slice(o, o + size);
        o += size;
        return v;
    };
    // eslint-disable-next-line no-constant-condition
    while (true) {
        const name = readString();
        if (name === "")
            break;
        const type = readString();
        const size = view.getUint32(o, true);
        o += 4;
        const valueStart = o;
        if (type === "box2i") {
            // xMin,yMin,xMax,yMax (4 x int32)
            const dv = new DataView(u8.buffer, u8.byteOffset + o, 16);
            if (name === "dataWindow") {
                xMin = dv.getInt32(0, true);
                yMin = dv.getInt32(4, true);
                xMax = dv.getInt32(8, true);
                yMax = dv.getInt32(12, true);
            }
        }
        else if (type === "chlist") {
            // 解析 channel 列表
            const end = o + size;
            while (o < end) {
                const cname = readString();
                if (cname === "")
                    break;
                const cv = new DataView(u8.buffer, u8.byteOffset + o, 16);
                const pixelType = cv.getInt32(0, true);
                const xSampling = cv.getInt32(4, true);
                const ySampling = cv.getInt32(8, true);
                o += 16; // pixelType(4)+xSampling(4)+ySampling(4)+pLinear(1)+pad(3)
                channels.push({
                    name: cname,
                    pixelType,
                    xSampling,
                    ySampling,
                    bytes: pixelType === 1 ? 2 : 4,
                });
            }
        }
        else if (type === "compression") {
            compression = u8[o];
        }
        o = valueStart + size;
    }
    if (channels.length === 0) {
        throw new Error("EXR has no channels. The file may be corrupt.");
    }
    if (xMax < xMin || yMax < yMin) {
        throw new Error("EXR data window is invalid.");
    }
    const width = xMax - xMin + 1;
    const height = yMax - yMin + 1;
    if (width <= 0 || height <= 0 || width > 65536 || height > 65536) {
        throw new Error("EXR dimensions are out of range.");
    }
    // 通道按字母序排序（EXR 数据按此顺序存储）
    channels.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    return {
        header: { width, height, xMin, yMin, channels, compression },
        dataOffset: o,
    };
}
// 解压单条 scanline 的像素字节（含 EXR 的预测/PXR24 还原）
async function decompressScanline(comp, raw, expectedBytes) {
    switch (comp) {
        case 0: // NO_COMPRESSION
            return raw;
        case 1: // RLE
            return rleDecode(raw, expectedBytes);
        case 2: // ZIPS（单 scanline deflate + uint16 预测）
        case 3: // ZIP（deflate + uint16 预测）
            return unzipPredict(await inflateZlib(raw), expectedBytes);
        case 5: // PXR24
            throw new Error("This EXR uses PXR24 compression, which the in-browser decoder does not yet support. Re-export with ZIP (or no) compression, or use the desktop app.");
        case 4: // PIZ
        case 6: // B44
        case 7: // B44A
        case 8: // DWAA
        case 9: // DWAB
            throw new Error("This EXR uses PIZ/B44/DWAA compression, which the in-browser decoder does not yet support. Re-export with ZIP (or no) compression, or use the desktop app.");
        default:
            throw new Error(`Unknown EXR compression type (${comp}).`);
    }
}
function rleDecode(raw, expected) {
    const out = new Uint8Array(expected);
    let i = 0;
    let o = 0;
    while (o < expected && i < raw.length) {
        const c = raw[i++];
        if (c >= 128) {
            const count = 257 - c;
            const v = raw[i++];
            for (let k = 0; k < count; k++)
                out[o++] = v;
        }
        else {
            const count = c + 1;
            for (let k = 0; k < count; k++)
                out[o++] = raw[i++];
        }
    }
    return out;
}
// ZIP/ZIPS：解压后是"预测"后的字节，按 uint16 数组做累加还原
function unzipPredict(inflated, expected) {
    const out = inflated.slice(0, expected);
    // Offset-agnostic: read/write the uint16 values via explicit byte indexing
    // so it never depends on out.byteOffset (which varies by platform).
    const n = out.length >> 1;
    const u16 = new Uint16Array(n);
    for (let i = 0; i < n; i++)
        u16[i] = out[i * 2] | (out[i * 2 + 1] << 8);
    for (let i = 1; i < n; i++)
        u16[i] = (u16[i] + u16[i - 1]) & 0xffff;
    for (let i = 0; i < n; i++) {
        out[i * 2] = u16[i] & 0xff;
        out[i * 2 + 1] = (u16[i] >> 8) & 0xff;
    }
    return out;
}
// 从一条 scanline 的字节中按通道顺序读取样本到 float
function readSample(ch, u8, byteOffset) {
    if (ch.pixelType === 1) {
        const h = u8[byteOffset] | (u8[byteOffset + 1] << 8);
        return halfToFloat(h);
    }
    const dv = new DataView(u8.buffer, u8.byteOffset + byteOffset, 4);
    if (ch.pixelType === 2)
        return dv.getFloat32(0, true);
    return dv.getUint32(0, true); // UINT → float
}
class ExrToPngConverter {
    info = {
        id: "exr-to-png",
        name: "EXR to PNG",
        sourceFormats: [".exr", ".sxr", ".mxr"],
        targetFormat: ".png",
        category: "image",
        maxWebFileSize: 200 * 1024 * 1024,
        classType: "A",
        description: "Decode OpenEXR HDR images to 8-bit sRGB PNG with Reinhard/ACES tone mapping.",
    };
    validate(file) {
        return (0, interfaces_1.defaultValidate)(this.info, file);
    }
    async convert(options) {
        const buf = await options.inputFile.arrayBuffer();
        const u8 = new Uint8Array(buf);
        const view = new DataView(buf);
        const { header, dataOffset } = parseHeader(view, u8);
        // 选取颜色通道
        const lower = (s) => s.toLowerCase();
        const find = (n) => header.channels.find((c) => lower(c.name) === lower(n));
        const rCh = find("R") ?? find("Y");
        const gCh = find("G") ?? rCh;
        const bCh = find("B") ?? rCh;
        const aCh = find("A");
        if (!rCh || !gCh || !bCh) {
            throw new Error("No RGB(A) channel found in this EXR. The in-browser decoder handles color EXR only.");
        }
        if (rCh.xSampling !== 1 || rCh.ySampling !== 1) {
            throw new Error("Subsampled (xSampling/ySampling > 1) EXR channels are not supported.");
        }
        const { width, height, xMin, yMin } = header;
        const bytesPerRow = width *
            header.channels.reduce((s, c) => (c.xSampling === 1 ? s + c.bytes : s), 0);
        const rgba = new Float32Array(width * height * 4);
        let o = dataOffset;
        for (let y = yMin; y <= yMin + height - 1; y++) {
            const sy = view.getInt32(o, true);
            o += 4;
            const dataSize = view.getUint32(o, true);
            o += 4;
            const raw = u8.slice(o, o + dataSize);
            o += dataSize;
            if (sy !== y) {
                throw new Error("EXR scanline order mismatch (unsupported lineOrder).");
            }
            const row = await decompressScanline(header.compression, raw, bytesPerRow);
            // 每条 scanline 内像素按 pixelStride 顺序排布：
            // 第 x 个像素从 bo = x * pixelStride 开始读取，否则每个像素都会
            // 从行首读起（导致第 2、3... 像素重复第 1 个像素的颜色）。
            const pixelStride = bytesPerRow / width;
            const rowBase = (y - yMin) * width;
            for (let x = 0; x < width; x++) {
                let bo = x * pixelStride;
                let r = 0, g = 0, b = 0, a = 1;
                for (const ch of header.channels) {
                    if (ch.xSampling !== 1)
                        continue;
                    const v = readSample(ch, row, bo);
                    bo += ch.bytes;
                    if (ch === rCh)
                        r = v;
                    else if (ch === gCh)
                        g = v;
                    else if (ch === bCh)
                        b = v;
                    else if (aCh && ch === aCh)
                        a = v;
                }
                const idx = (rowBase + x) * 4;
                rgba[idx] = r;
                rgba[idx + 1] = g;
                rgba[idx + 2] = b;
                rgba[idx + 3] = aCh ? a : 1;
            }
        }
        // 色调映射 + gamma
        const p = options.params ?? {};
        const tone = (p.toneMap ?? "reinhard").toLowerCase();
        const exposure = Math.max(0.01, Math.min(20, Number(p.exposure ?? 1)));
        const ldr = toneMap(rgba, width, height, tone, exposure);
        // UPNG.encode(imgs, w, h, ps, dels, forbidPlte):
        //  - ps = max palette size for quantization; 0 = no quantization.
        //  - forbidPlte=true forces truecolor+alpha (ctype 6). Without it, UPNG
        //    silently downgrades images with <=256 distinct colors (flat HDR
        //    renders, logos) to an INDEXED palette PNG, which loses per-pixel
        //    fidelity and breaks alpha. Always forbid for HDR->LDR output.
        const png = upng_js_1.default.encode([ldr], width, height, 0, undefined, true);
        const blob = new Blob([png], { type: "image/png" });
        return {
            data: blob,
            filename: options.inputFile.name.replace(/\.(exr|sxr|mxr)$/i, ".png"),
            size: png.byteLength,
            mimeType: "image/png",
        };
    }
}
exports.ExrToPngConverter = ExrToPngConverter;
function toneMap(rgba, width, height, tone, exposure) {
    const out = new Uint8Array(width * height * 4);
    const toSrgb = (c) => {
        const x = Math.max(0, Math.min(1, c));
        return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    };
    for (let i = 0; i < width * height; i++) {
        let r = rgba[i * 4] * exposure;
        let g = rgba[i * 4 + 1] * exposure;
        let b = rgba[i * 4 + 2] * exposure;
        if (tone === "aces") {
            r = aces(r);
            g = aces(g);
            b = aces(b);
        }
        else {
            r = r / (1 + r);
            g = g / (1 + g);
            b = b / (1 + b);
        }
        out[i * 4] = Math.round(toSrgb(r) * 255);
        out[i * 4 + 1] = Math.round(toSrgb(g) * 255);
        out[i * 4 + 2] = Math.round(toSrgb(b) * 255);
        let a = rgba[i * 4 + 3];
        if (!isFinite(a))
            a = 1;
        out[i * 4 + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
    return out;
}
// ACES Filmic (Narkowicz 近似)
function aces(x) {
    const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    const v = (x * (a * x + b)) / (x * (c * x + d) + e);
    return Math.max(0, Math.min(1, v));
}
