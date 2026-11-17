import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { resetMemoryStore } from "@/lib/store/redis";
import type { ScanResult } from "@/lib/profiles/types";

const scanCard = vi.fn();
vi.mock("@/lib/scan/scan-card", () => ({ scanCard: (...args: unknown[]) => scanCard(...args) }));
vi.mock("@/lib/scan/samples-server", () => ({
  readSampleFile: async (id: string) =>
    id === "pk-clean" ? { data: new Uint8Array([1]), mediaType: "image/jpeg" } : null,
}));

const { OPTIONS, POST } = await import("./route");

const result = { country: "PK", source: "ai" } as ScanResult;

afterEach(() => vi.unstubAllEnvs());

beforeEach(() => {
  resetMemoryStore();
  scanCard.mockReset();
  scanCard.mockResolvedValue(result);
});

function post(fields: Record<string, string | File>, ip = "203.0.113.7", signal?: AbortSignal, origin?: string) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  const req = new Request("http://localhost/api/scan", {
    method: "POST",
    body: form,
    headers: { "x-forwarded-for": ip, ...(origin ? { origin } : {}) },
  });
  // On the server req.signal aborts when the client drops; here we hand the route a signal we control
  if (signal) Object.defineProperty(req, "signal", { value: signal });
  return POST(req);
}

const photo = (type = "image/jpeg", size = 1000) => new File([new Uint8Array(size)], "card.jpg", { type });

test("an empty form is a 400 missing", async () => {
  const res = await post({});
  expect(res.status).toBe(400);
  expect(await res.json()).toEqual({ error: "missing" });
});

test("a HEIC photo is a 400 type", async () => {
  const res = await post({ file: photo("image/heic") });
  expect(await res.json()).toEqual({ error: "type" });
});

test("a 6 MB file is a 400 size", async () => {
  const res = await post({ file: photo("image/jpeg", 6 * 1024 * 1024) });
  expect(await res.json()).toEqual({ error: "size" });
});

test("an unknown sample is a 400 sample", async () => {
  const res = await post({ sampleId: "xx-nope" });
  expect(await res.json()).toEqual({ error: "sample" });
});

test("an upload is read and returns the result with runs left", async () => {
  const res = await post({ file: photo() });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual(result);
  expect(res.headers.get("X-Runs-Remaining")).toBe("9");
  expect(res.headers.get("Cache-Control")).toBe("no-store");
});

test("the 11th upload from one visitor is a 429", async () => {
  for (let i = 0; i < 10; i++) await post({ file: photo() });
  const res = await post({ file: photo() });
  expect(res.status).toBe(429);
  expect(await res.json()).toMatchObject({ error: "limit", reason: "visitor" });
});

test("when the AI fails the visitor gets a 502 and the run back", async () => {
  scanCard.mockRejectedValue(new Error("quota"));
  const res = await post({ file: photo() });
  expect(res.status).toBe(502);
  expect(await res.json()).toEqual({ error: "provider" });
  scanCard.mockResolvedValue(result);
  for (let i = 0; i < 10; i++) expect((await post({ file: photo() })).status).toBe(200);
});

test("a sample is read once and then served from the cache", async () => {
  expect((await post({ sampleId: "pk-clean" })).status).toBe(200);
  const second = await post({ sampleId: "pk-clean" });
  expect(await second.json()).toEqual(result);
  expect(scanCard).toHaveBeenCalledTimes(1);
});

test("samples don't use the visitor's uploads", async () => {
  await post({ sampleId: "pk-clean" });
  const res = await post({ file: photo() });
  expect(res.headers.get("X-Runs-Remaining")).toBe("9");
});

test("a failed sample read is a 502 and isn't cached", async () => {
  scanCard.mockRejectedValueOnce(new Error("quota"));
  expect((await post({ sampleId: "pk-clean" })).status).toBe(502);
  expect((await post({ sampleId: "pk-clean" })).status).toBe(200);
  expect(scanCard).toHaveBeenCalledTimes(2);
});

test("a failed upload still counts against the app's daily cap", async () => {
  vi.stubEnv("AI_GLOBAL_DAILY_LIMIT", "1");
  scanCard.mockRejectedValueOnce(new Error("quota"));
  expect((await post({ file: photo() })).status).toBe(502);
  expect(await (await post({ file: photo() }, "198.51.100.9")).json()).toMatchObject({ reason: "global" });
});

test("a failed sample read still counts against the app's daily cap", async () => {
  vi.stubEnv("AI_GLOBAL_DAILY_LIMIT", "1");
  scanCard.mockRejectedValueOnce(new Error("quota"));
  expect((await post({ sampleId: "pk-clean" })).status).toBe(502);
  expect((await post({ sampleId: "pk-clean" })).status).toBe(429);
});

test("a visitor who drops the request gets no refund", async () => {
  vi.stubEnv("AI_DAILY_LIMIT", "1");
  const abort = new AbortController();
  scanCard.mockImplementationOnce(async () => {
    abort.abort();
    throw new Error("aborted");
  });
  await post({ file: photo() }, "203.0.113.7", abort.signal);
  expect((await post({ file: photo() })).status).toBe(429);
});

const BROKWISE = "https://brokwise.vercel.app";

test("a site on the allow list may call the scan from the browser", async () => {
  vi.stubEnv("ALLOWED_ORIGINS", `${BROKWISE}, http://localhost:3000`);
  const pre = await OPTIONS(
    new Request("http://localhost/api/scan", { method: "OPTIONS", headers: { origin: BROKWISE } }),
  );
  expect(pre.status).toBe(204);
  expect(pre.headers.get("Access-Control-Allow-Origin")).toBe(BROKWISE);
  expect(pre.headers.get("Access-Control-Allow-Methods")).toContain("POST");

  const res = await post({ file: photo() }, "203.0.113.7", undefined, BROKWISE);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(BROKWISE);
  expect(res.headers.get("Access-Control-Expose-Headers")).toContain("X-Runs-Remaining");
  expect(res.headers.get("Vary")).toContain("Origin");
});

test("errors carry the CORS header too, so the calling site can read why", async () => {
  vi.stubEnv("ALLOWED_ORIGINS", BROKWISE);
  const res = await post({}, "203.0.113.7", undefined, BROKWISE);
  expect(res.status).toBe(400);
  expect(res.headers.get("Access-Control-Allow-Origin")).toBe(BROKWISE);
});

test("any other site gets no CORS header, so browsers block it", async () => {
  vi.stubEnv("ALLOWED_ORIGINS", BROKWISE);
  const res = await post({ file: photo() }, "203.0.113.7", undefined, "https://evil.example");
  expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  const pre = await OPTIONS(
    new Request("http://localhost/api/scan", { method: "OPTIONS", headers: { origin: "https://evil.example" } }),
  );
  expect(pre.headers.get("Access-Control-Allow-Origin")).toBeNull();
});
