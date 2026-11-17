import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from "@/constants/config";
import { getCachedSample, setCachedSample } from "@/lib/cache/sample-cache";
import { refundRun, takeGlobalRun, takeRun } from "@/lib/limits/daily";
import { visitorId } from "@/lib/limits/visitor";
import { readSampleFile } from "@/lib/scan/samples-server";
import { scanCard } from "@/lib/scan/scan-card";

export const maxDuration = 60;

const json = (body: unknown, status: number, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

// Never log the image or the model's answer; a provider error's message can carry the request.
const logFailure = () => console.error("AI provider error");

const isAccepted = (type: string) => (ACCEPTED_TYPES as readonly string[]).includes(type);

// Order matters: validate, then limits, then the model. The image stays in memory and is never stored.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const sampleId = form?.get("sampleId");

  if (typeof sampleId === "string" && sampleId) return scanSample(sampleId, req.signal);
  if (!(file instanceof File) || file.size === 0) return json({ error: "missing" }, 400);
  if (!isAccepted(file.type)) return json({ error: "type" }, 400);
  if (file.size > MAX_UPLOAD_BYTES) return json({ error: "size" }, 400);

  const visitor = visitorId(req.headers);
  const run = await takeRun(visitor);
  if (!run.ok) return json({ error: "limit", reason: run.reason, resetAt: run.resetAt }, 429);

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const result = await scanCard({ data, mediaType: file.type }, { signal: req.signal });
    return json(result, 200, { "X-Runs-Remaining": String(run.remaining) });
  } catch {
    logFailure();
    await refundRun(visitor);
    return json({ error: "provider" }, 502);
  }
}

// Made-up cards: one AI call per model, then the cache. They never use a visitor's uploads.
async function scanSample(id: string, signal: AbortSignal) {
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
    await refundRun();
    return json({ error: "provider" }, 502);
  }
}
