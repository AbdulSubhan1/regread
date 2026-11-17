import { beforeEach, expect, test, vi } from "vitest";
import { resetMemoryStore } from "@/lib/store/redis";
import type { ScanResult } from "@/lib/profiles/types";

const scanCard = vi.fn();
vi.mock("@/lib/scan/scan-card", () => ({ scanCard: (...args: unknown[]) => scanCard(...args) }));
vi.mock("@/lib/scan/samples-server", () => ({
  readSampleFile: async (id: string) =>
    id === "pk-clean" ? { data: new Uint8Array([1]), mediaType: "image/jpeg" } : null,
}));

const { POST } = await import("./route");

const result = { country: "PK", source: "ai" } as ScanResult;

beforeEach(() => {
  resetMemoryStore();
  scanCard.mockReset();
  scanCard.mockResolvedValue(result);
});

function post(fields: Record<string, string | File>, ip = "203.0.113.7") {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  return POST(
    new Request("http://localhost/api/scan", { method: "POST", body: form, headers: { "x-forwarded-for": ip } }),
  );
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
