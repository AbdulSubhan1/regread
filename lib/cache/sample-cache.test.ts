import { beforeEach, expect, test, vi } from "vitest";
import { getCachedSample, setCachedSample } from "./sample-cache";
import { resetMemoryStore } from "@/lib/store/redis";
import type { ScanResult } from "@/lib/profiles/types";

beforeEach(() => resetMemoryStore());

const result = { country: "PK", source: "ai" } as ScanResult;

test("a cached sample comes back", async () => {
  vi.stubEnv("AI_MODEL", "m1");
  await setCachedSample("pk-clean", result);
  expect(await getCachedSample("pk-clean")).toEqual(result);
});

test("a miss returns null", async () => {
  expect(await getCachedSample("qa-screen")).toBeNull();
});

test("a new model doesn't reuse the old model's answers", async () => {
  vi.stubEnv("AI_MODEL", "m1");
  await setCachedSample("pk-clean", result);
  vi.stubEnv("AI_MODEL", "m2");
  expect(await getCachedSample("pk-clean")).toBeNull();
});
