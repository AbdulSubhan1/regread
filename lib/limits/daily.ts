import { DEFAULT_GLOBAL_DAILY_LIMIT, DEFAULT_VISITOR_DAILY_LIMIT } from "@/constants/config";
import { getStore } from "@/lib/store/redis";

export type Run = { ok: boolean; reason?: "visitor" | "global"; remaining: number; resetAt: number };

const TWO_DAYS = 172_800;

function limitFrom(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

const today = (now = new Date()) => now.toISOString().slice(0, 10);
const globalKey = () => `regread:global:${today()}`;
const visitorKey = (visitor: string) => `regread:runs:${visitor}:${today()}`;

function nextUtcMidnight(now = new Date()) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
}

async function bump(key: string): Promise<number> {
  const store = getStore();
  const used = await store.incr(key);
  if (used === 1) await store.expire(key, TWO_DAYS);
  return used;
}

/** One AI call for the whole app (samples not in the cache). False when today's free share is used up. */
export async function takeGlobalRun(): Promise<boolean> {
  if ((await bump(globalKey())) <= limitFrom("AI_GLOBAL_DAILY_LIMIT", DEFAULT_GLOBAL_DAILY_LIMIT)) return true;
  await getStore().decr(globalKey());
  return false;
}

/** One upload for this visitor. Counts against the visitor and the app; a refused run counts against neither. */
export async function takeRun(visitor: string): Promise<Run> {
  const resetAt = nextUtcMidnight();
  if (!(await takeGlobalRun())) return { ok: false, reason: "global", remaining: 0, resetAt };
  const limit = limitFrom("AI_DAILY_LIMIT", DEFAULT_VISITOR_DAILY_LIMIT);
  const used = await bump(visitorKey(visitor));
  if (used > limit) {
    await refundRun(visitor);
    return { ok: false, reason: "visitor", remaining: 0, resetAt };
  }
  return { ok: true, remaining: limit - used, resetAt };
}

/** Gives the run back when the AI failed before producing anything. No visitor = a sample run. */
export async function refundRun(visitor?: string): Promise<void> {
  const store = getStore();
  await store.decr(globalKey());
  if (visitor) await store.decr(visitorKey(visitor));
}
