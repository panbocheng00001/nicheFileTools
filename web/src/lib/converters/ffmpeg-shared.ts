//Shared FFmpeg (WASM) singleton loader: MTS→MP4 and GSM→WAV share the same engine to avoid repeated loading of the 31MB core.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

const CORE_BASE = "/ffmpeg";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export async function getFfmpeg(): Promise<FFmpeg> {
  if (instance && instance.loaded) return instance;
  if (!loading) {
    const ffmpeg = new FFmpeg();
    loading = (async () => {
      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${CORE_BASE}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${CORE_BASE}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });
      return ffmpeg;
    })();
  }
  instance = await loading;
  return instance;
}
