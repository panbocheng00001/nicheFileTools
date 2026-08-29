// Minimal type declarations for dependencies that ship no .d.ts files.
// NOTE: fontkit@2 and opentype.js@1.3 are ESM with **named** exports only
// (no default export), so consumers must use `import * as ns from "pkg"`.
declare module "fontkit" {
  export function create(buffer: ArrayBuffer | Uint8Array): any;
  export function openSync(path: string): any;
  export function registerFormat(...args: any[]): any;
  export function setDefaultLanguage(lang: string): any;
  export function defaultLanguage(): any;
  export function logErrors(enable?: boolean): any;
}

declare module "opentype.js" {
  export class Path {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    qCurveTo(x1: number, y1: number, x: number, y: number): void;
    curveTo(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      x: number,
      y: number,
    ): void;
    close(): void;
    commands: Array<{
      type: string;
      x?: number;
      y?: number;
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
    }>;
  }
  export class Glyph {
    constructor(options: {
      name?: string;
      index?: number;
      advanceWidth?: number;
      unicode?: number;
      unicodes?: number[];
      path?: Path;
    });
    name: string;
    index: number;
    advanceWidth: number;
    unicodes: number[];
    path: Path;
  }
  export class Font {
    constructor(options: {
      familyName: string;
      styleName: string;
      unitsPerEm: number;
      ascender: number;
      descender: number;
      glyphs: Glyph[];
    });
    glyphs: Glyph[];
    unitsPerEm: number;
    ascender: number;
    descender: number;
    toArrayBuffer(): ArrayBuffer;
  }
  export function parse(buffer: ArrayBuffer, opt?: any): Font;
  export function load(url: string, opt?: any): Promise<Font>;
}

declare module "upng-js" {
  const UPNG: {
    // encode(imgs, w, h, ps, dels, forbidPlte)
    //  ps         : max palette size for quantization (0 = no quantize)
    //  forbidPlte : force truecolor+alpha (ctype 6) instead of palette PNG
    encode(
      imgs: Uint8Array | Uint8Array[],
      w: number,
      h: number,
      ps?: number,
      dels?: number[] | null,
      forbidPlte?: boolean,
    ): Uint8Array;
    decode(bytes: ArrayBuffer): any;
    [key: string]: any;
  };
  export default UPNG;
}
