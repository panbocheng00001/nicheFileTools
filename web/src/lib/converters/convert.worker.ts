/**
 * Dedicated conversion worker (SEO spec appendix B #15 / site spec §3.8:
 * heavy conversion kernels must run off the main thread so INP stays
 * ≤200ms). The worker hosts the same converter registry as the main thread;
 * the client (worker-client.ts) decides which slugs are routed here.
 *
 * Protocol (single request/response per conversion):
 *   main → worker: { id, slug, kind: "convert", options: ConversionOptions }
 *   worker → main: { id, ok: true, result: ConversionResult }
 *             |  { id, ok: false, name?, error }   // conversion failure
 *
 * File/Blob payloads and results cross the boundary via structured clone.
 * DesktopRequiredError is re-created on the client by error name, so the
 * degraded-tool UX keeps working.
 */
import { getConverter } from "./registry";
import type { ConversionOptions } from "./interfaces";

type RequestMsg = {
  id: number;
  slug: string;
  kind: "convert";
  options: ConversionOptions;
};

type ResponseMsg =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; name?: string; error: string };

// Typed without the webworker lib (tsconfig uses lib.dom): only the two
// APIs this file needs are declared on the ambient `self`.
const ctx = self as unknown as {
  addEventListener(
    type: "message",
    cb: (e: MessageEvent<RequestMsg>) => void,
  ): void;
  postMessage(msg: ResponseMsg): void;
};

ctx.addEventListener("message", async (e) => {
  const req = e.data;
  const converter = getConverter(req.slug);
  if (!converter) {
    ctx.postMessage({
      id: req.id,
      ok: false,
      error: "This tool is desktop-only.",
    });
    return;
  }
  try {
    const result = await converter.convert(req.options);
    ctx.postMessage({ id: req.id, ok: true, result });
  } catch (err) {
    ctx.postMessage({
      id: req.id,
      ok: false,
      name: err instanceof Error ? err.name : undefined,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});
