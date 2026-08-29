// 共享的 FFmpeg (WASM) 单例加载器：MTS→MP4 与 GSM→WAV 共用同一引擎，避免重复加载 31MB core。
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
