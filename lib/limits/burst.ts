import { BURST_PER_MINUTE } from "@/constants/config";
import { getStore } from "@/lib/store/redis";

export type Burst = { ok: true } | { ok: false; resetAt: number };

/**
 * Uploads this visitor may start in the current minute. The daily limit alone lets a script spend a visitor's whole
 * day in one second; this spreads it out. A refused upload doesn't count.
 */
export async function takeBurst(visitor: string, now = new Date()): Promise<Burst> {
  const minute = Math.floor(now.getTime() / 60_000);
  const key = `regread:burst:${visitor}:${minute}`;
  const store = getStore();
  const used = await store.incr(key);
  if (used === 1) await store.expire(key, 120);
  if (used <= BURST_PER_MINUTE) return { ok: true };
  await store.decr(key);
  return { ok: false, resetAt: (minute + 1) * 60_000 };
}
