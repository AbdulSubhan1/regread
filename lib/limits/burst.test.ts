import { beforeEach, expect, test } from "vitest";
import { resetMemoryStore } from "@/lib/store/redis";
import { takeBurst } from "./burst";

beforeEach(() => resetMemoryStore());

const at = (iso: string) => new Date(iso);

test("a visitor gets 3 uploads a minute; the 4th waits for the next minute", async () => {
  const now = at("2026-11-17T10:00:10Z");
  for (let i = 0; i < 3; i++) expect((await takeBurst("v1", now)).ok).toBe(true);
  expect(await takeBurst("v1", now)).toEqual({ ok: false, resetAt: Date.parse("2026-11-17T10:01:00Z") });
  expect((await takeBurst("v1", at("2026-11-17T10:01:00Z"))).ok).toBe(true);
});

test("each visitor has their own minute", async () => {
  const now = at("2026-11-17T10:00:10Z");
  for (let i = 0; i < 3; i++) await takeBurst("v1", now);
  expect((await takeBurst("v2", now)).ok).toBe(true);
});
