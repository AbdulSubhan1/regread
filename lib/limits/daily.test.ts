import { beforeEach, expect, test, vi } from "vitest";
import { refundRun, takeGlobalRun, takeRun } from "./daily";
import { resetMemoryStore } from "@/lib/store/redis";

beforeEach(() => {
  resetMemoryStore();
  vi.unstubAllEnvs();
});

test("each visitor gets 10 uploads a day; the 11th is refused for the visitor", async () => {
  for (let i = 0; i < 10; i++) expect((await takeRun("v1")).ok).toBe(true);
  expect(await takeRun("v1")).toMatchObject({ ok: false, reason: "visitor", remaining: 0 });
  expect((await takeRun("v2")).ok).toBe(true);
});

test("the whole app stops at the global limit, whoever asks", async () => {
  vi.stubEnv("AI_GLOBAL_DAILY_LIMIT", "3");
  for (const v of ["a", "b", "c"]) expect((await takeRun(v)).ok).toBe(true);
  expect(await takeRun("d")).toMatchObject({ ok: false, reason: "global" });
  expect(await takeGlobalRun()).toBe(false);
});

test("a refused run doesn't use up the visitor's or the app's count", async () => {
  vi.stubEnv("AI_GLOBAL_DAILY_LIMIT", "1");
  expect((await takeRun("a")).ok).toBe(true);
  expect((await takeRun("b")).ok).toBe(false);
  vi.stubEnv("AI_GLOBAL_DAILY_LIMIT", "2");
  expect((await takeRun("b")).ok).toBe(true);
});

test("a refund gives the visitor's run back but not the app's: the AI call was still made", async () => {
  vi.stubEnv("AI_GLOBAL_DAILY_LIMIT", "1");
  expect((await takeRun("a")).ok).toBe(true);
  await refundRun("a");
  expect(await takeRun("b")).toMatchObject({ ok: false, reason: "global" });
});

test("a refund gives one run back", async () => {
  for (let i = 0; i < 10; i++) await takeRun("v1");
  await refundRun("v1");
  expect((await takeRun("v1")).ok).toBe(true);
});

test("remaining counts down", async () => {
  expect((await takeRun("v1")).remaining).toBe(9);
});
