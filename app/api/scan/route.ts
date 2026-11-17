import { ACCEPTED_TYPES, MAX_PDF_BYTES, MAX_PDF_PAGES, MAX_UPLOAD_BYTES } from "@/constants/config";
import { getCachedSample, setCachedSample } from "@/lib/cache/sample-cache";
import { corsHeaders, isAllowedOrigin } from "@/lib/http/cors";
import { pdfPageCount, sniffType } from "@/lib/http/file-check";
import { takeBurst } from "@/lib/limits/burst";
import { refundRun, takeGlobalRun, takeRun } from "@/lib/limits/daily";
import { visitorId } from "@/lib/limits/visitor";
import { type BlockReason, reportApiCall, reportBlocked, reportGlobalCap } from "@/lib/pulse/server";
import type { CardFile } from "@/lib/scan/read-card";
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

const BYTE_REASONS: Record<string, BlockReason> = {
  type: "bad_file_type",
  pdfSize: "pdf_too_big",
  pages: "pdf_too_many_pages",
};

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
  const visitor = visitorId(req.headers);
  // Refused on purpose: Pulse hears about it, so a script hammering the demo shows up as an alert
  const refuse = (reason: BlockReason, body: unknown, status: number) => {
    reportBlocked(visitor, reason);
    return json(body, status);
  };
  if (!isAllowedOrigin(req.headers.get("origin"), req.url)) return refuse("bad_origin", { error: "origin" }, 403);
  // Refuse a big body before reading it into memory; the platform's own body cap backs this up
  if (Number(req.headers.get("content-length")) > MAX_REQUEST_BYTES) {
    return refuse("too_large", { error: "size" }, 413);
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const sampleId = form?.get("sampleId");

  if (typeof sampleId === "string" && sampleId) return scanSample(sampleId, req.signal, cors);
  if (!(file instanceof File) || file.size === 0) return json({ error: "missing" }, 400);
  if (!isAccepted(file.type)) return json({ error: "type" }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return refuse("too_large", { error: "size" }, 400);

  const data = new Uint8Array(await file.arrayBuffer());
  const bad = checkBytes(data, file.type);
  if (bad) return refuse(BYTE_REASONS[bad], { error: bad }, 400);

  const burst = await takeBurst(visitor);
  if (!burst.ok) return refuse("burst_limit", { error: "limit", reason: "burst", resetAt: burst.resetAt }, 429);
  const run = await takeRun(visitor);
  if (!run.ok) {
    const body = { error: "limit", reason: run.reason, resetAt: run.resetAt };
    if (run.reason === "visitor") return refuse("daily_limit", body, 429);
    reportGlobalCap();
    return json(body, 429);
  }

  try {
    const result = await timedScan({ data, mediaType: file.type }, req.signal);
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
  if (!(await takeGlobalRun())) {
    reportGlobalCap();
    return json({ error: "limit", reason: "global" }, 429);
  }
  try {
    const result = await timedScan(sample, signal);
    await setCachedSample(id, result);
    return json(result, 200);
  } catch {
    logFailure();
    return json({ error: "provider" }, 502);
  }
}

/** One AI call, reported to Pulse with its status and time. Only the error's name leaves: its message can carry the card. */
async function timedScan(file: CardFile, signal: AbortSignal) {
  const started = Date.now();
  const call = {
    method: "POST",
    host: "generativelanguage.googleapis.com",
    path: `/v1beta/models/${process.env.AI_MODEL}:generateContent`,
  };
  try {
    const result = await scanCard(file, { signal });
    reportApiCall({ ...call, status: 200, ms: Date.now() - started });
    return result;
  } catch (error) {
    // After the SDK's retry the provider's answer is on the last attempt
    const attempt = (error as { lastError?: unknown }).lastError ?? error;
    const status = (attempt as { statusCode?: unknown } | null)?.statusCode;
    const name = error instanceof Error ? error.name : "Error";
    reportApiCall({
      ...call,
      status: typeof status === "number" ? status : null,
      ms: Date.now() - started,
      error: name,
    });
    throw error;
  }
}
