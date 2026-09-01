/**
 * Client-side wrapper that routes heavy conversions into the dedicated
 * worker (convert.worker.ts). SEO spec appendix B #15 / site spec §3.8:
 * WASM/pure-JS conversion kernels must not block the main thread (INP
 * ≤200ms).
 *
 * Routing:
 *  - The seven DOM-free pure-JS converters (decode loops over up to 200 MB
 *    inputs) run in the worker — these are the ones that used to freeze the
 *    tab mid-conversion.
 *  - opf-to-epub stays on the main-thread orchestrator: its convert() relies
 *    on DOMParser to parse the OPF XML, and DOMParser is a main-thread DOM
 *    API unavailable inside a Worker — routing it there throws
 *    "DOMParser is not defined".
 *  - gsm-to-wav / mts-to-mp4 stay on the main-thread orchestrator: their
 *    FFmpeg WASM core already executes inside @ffmpeg/ffmpeg's own worker,
 *    and nesting it one level deeper would risk its class-worker URL
 *    resolution.
 *  - kfx/prt/blend converters only throw DesktopRequiredError on the
 *    desktop-landing pages (no converter UI rendered), so routing is
 *    irrelevant for them.
 *
 * If the worker itself cannot start (old browser, worker blocked), the
 * client degrades to the main-thread converter instead of failing the
 * conversion — availability beats the INP guarantee on legacy browsers.
 */
import type {
  ConversionOptions,
  ConversionResult,
  IConverter,
} from "./interfaces";
import { DesktopRequiredError } from "./interfaces";

const WORKER_SLUGS = new Set([
  "pvr-to-png",
  "raw-to-wav",
  "glb-to-gltf",
  "eot-to-ttf",
  "sav-to-csv",
  "pfm-to-ttf",
  "exr-to-png",
]);

/** True when this slug's convert() should execute inside the worker. */
export function runsInWorker(slug: string): boolean {
  return WORKER_SLUGS.has(slug);
}

/** Raised only when the worker infrastructure is unusable (not for
 *  conversion errors, which surface as regular Errors). */
class WorkerUnavailableError extends Error {
  constructor(public override cause: unknown) {
    super("Conversion worker unavailable.");
    this.name = "WorkerUnavailableError";
  }
}

type WorkerResponse =
  | { id: number; ok: true; result: ConversionResult }
  | { id: number; ok: false; name?: string; error: string };

let seq = 0;
const pending = new Map<
  number,
  { resolve: (r: ConversionResult) => void; reject: (e: Error) => void }
>();

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = new Promise<Worker>((resolve, reject) => {
      let w: Worker;
      try {
        w = new Worker(new URL("./convert.worker.ts", import.meta.url), {
          type: "module",
        });
      } catch (e) {
        reject(new WorkerUnavailableError(e));
        return;
      }
      w.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        if (msg.ok) {
          p.resolve(msg.result);
        } else if (msg.name === "DesktopRequiredError") {
          p.reject(new DesktopRequiredError(msg.error));
        } else {
          p.reject(Object.assign(new Error(msg.error), { name: msg.name ?? "Error" }));
        }
      };
      w.onerror = (e) => {
        // Kill every queued conversion; caller falls back to the main thread.
        const err = new WorkerUnavailableError(e);
        for (const [, p] of pending) p.reject(err);
        pending.clear();
        workerPromise = null;
      };
      resolve(w);
    });
  }
  return workerPromise;
}

async function convertInWorker(
  slug: string,
  options: ConversionOptions,
): Promise<ConversionResult> {
  const w = await getWorker();
  const id = ++seq;
  return new Promise<ConversionResult>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, slug, kind: "convert", options });
  });
}

/** Route a conversion: worker for heavy DOM-free slugs, main thread
 *  otherwise, with main-thread fallback if the worker cannot start. */
export async function runConversion(
  slug: string,
  converter: IConverter,
  options: ConversionOptions,
): Promise<ConversionResult> {
  if (!runsInWorker(slug)) return converter.convert(options);
  try {
    return await convertInWorker(slug, options);
  } catch (e) {
    if (e instanceof WorkerUnavailableError) {
      // Worker infrastructure failed before/without a conversion error —
      // degrade to the main thread rather than failing the job.
      return converter.convert(options);
    }
    throw e;
  }
}
