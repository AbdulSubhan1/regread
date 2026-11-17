import { ACCEPTED_TYPES, MAX_PDF_BYTES, MAX_PDF_PAGES, MAX_UPLOAD_BYTES } from "@/constants/config";
import { getCachedSample, setCachedSample } from "@/lib/cache/sample-cache";
import { corsHeaders, isAllowedOrigin } from "@/lib/http/cors";
import { pdfPageCount, sniffType } from "@/lib/http/file-check";
import { takeBurst } from "@/lib/limits/burst";
import { refundRun, takeGlobalRun, takeRun } from "@/lib/limits/daily";
import { visitorId } from "@/lib/limits/visitor";
import { readSampleFile } from "@/lib/scan/samples-server";
import { scanCard } from "@/lib/scan/scan-card";

export const maxDuration = 60;

const reply = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

// Never log the image or the model's answer; a provider error's message can carry the request.
const logFailure = () => console.error("AI provider error");

const isAccepted = (type: string) => (ACCEPTED_TYPES as readonly string[]).includes(type);

// Room for the form's own boundaries and field names around the file
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

/** Why an upload's own bytes are refused, or null when they are a real photo or a short enough PDF. */
function checkBytes(data: Uint8Array, declared: string): string | null {
  if (sniffType(data) !== declared) return "type";
  if (declared !== "application/pdf") return null;
  if (data.length > MAX_PDF_BYTES) return "pdfSize";
  return pdfPageCount(data) > MAX_PDF_PAGES ? "pages" : null;
}

// Order matters: who is asking, validate, then limits, then the model. The image stays in memory and is never stored.
export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const cors = corsHeaders(req.headers.get("origin"));
  const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
    reply(body, status, { ...cors, ...headers });
  if (!isAllowedOrigin(req.headers.get("origin"), req.url)) return json({ error: "origin" }, 403);
  // Refuse a big body before reading it into memory; the platform's own body cap backs this up
  if (Number(req.headers.get("content-length")) > MAX_REQUEST_BYTES) return json({ error: "size" }, 413);
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const sampleId = form?.get("sampleId");

  if (typeof sampleId === "string" && sampleId) return scanSample(sampleId, req.signal, cors);
  if (!(file instanceof File) || file.size === 0) return json({ error: "missing" }, 400);
  if (!isAccepted(file.type)) return json({ error: "type" }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "size" }, 400);

  const data = new Uint8Array(await file.arrayBuffer());
  const bad = checkBytes(data, file.type);
  if (bad) return json({ error: bad }, 400);

  const visitor = visitorId(req.headers);
  const burst = await takeBurst(visitor);
  if (!burst.ok) return json({ error: "limit", reason: "burst", resetAt: burst.resetAt }, 429);
  const run = await takeRun(visitor);
  if (!run.ok) return json({ error: "limit", reason: run.reason, resetAt: run.resetAt }, 429);

  try {
    const result = await scanCard({ data, mediaType: file.type }, { signal: req.signal });
    return json(result, 200, { "X-Runs-Remaining": String(run.remaining) });
  } catch {
    logFailure();
    // A visitor who drops the request on purpose doesn't get the run back
    if (!req.signal.aborted) await refundRun(visitor);
    return json({ error: "provider" }, 502);
  }
}

// Made-up cards: one AI call per model, then the cache. They never use a visitor's uploads.
async function scanSample(id: string, signal: AbortSignal, cors: Record<string, string>) {
  const json = (body: unknown, status: number) => reply(body, status, cors);
  const sample = await readSampleFile(id);
  if (!sample) return json({ error: "sample" }, 400);
  const cached = await getCachedSample(id);
  if (cached) return json(cached, 200);
  if (!(await takeGlobalRun())) return json({ error: "limit", reason: "global" }, 429);
  try {
    const result = await scanCard(sample, { signal });
    await setCachedSample(id, result);
    return json(result, 200);
  } catch {
    logFailure();
    return json({ error: "provider" }, 502);
  }
}
