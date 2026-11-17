import { after } from "next/server";
import { PULSE_URL } from "@/constants/config";
import { getStore } from "@/lib/store/redis";

// The server reports to Pulse with RegRead's own token: errors, AI calls and refused uploads. Off until
// MONITOR_LOG_TOKEN is set, and it can never break a scan: a 2-second timeout, every failure ignored, and reports
// sent after the response. Only status codes, timings, reasons and the hashed visitor id leave; never the card.

const TIMEOUT_MS = 2_000;

/** One more than Pulse's "pushing on demo limits" rule (5 in 15 minutes), so that alert can still fire. */
export const BLOCKS_PER_WINDOW = 6;
const WINDOW_SECONDS = 900;

export type PulseLog = {
  level: "info" | "warn" | "error";
  message: string;
  path?: string;
  context?: Record<string, unknown>;
};

export type PulseApiCall = {
  method: string;
  host: string;
  path: string;
  status: number | null;
  ms: number;
  error?: string;
};

/** Why an upload was refused, as Pulse's security feed takes it (`snake_case`). */
export type BlockReason =
  "bad_origin" | "too_large" | "bad_file_type" | "pdf_too_big" | "pdf_too_many_pages" | "burst_limit" | "daily_limit";

const token = () => process.env.MONITOR_LOG_TOKEN?.trim();

async function post(endpoint: "logs" | "calls" | "security", body: unknown): Promise<void> {
  const auth = token();
  if (!auth) return;
  try {
    await fetch(`${PULSE_URL}/api/${endpoint}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Monitoring is best effort; the visitor's scan matters more
  }
}

// After the response when inside a request; at once (still not awaited) in a script or test
function later(task: () => Promise<unknown>): void {
  if (!token()) return;
  const safe = () => task().catch(() => undefined);
  try {
    after(safe);
  } catch {
    void safe();
  }
}

/** Awaitable, for `onRequestError`, which has no response to wait for. */
export function sendToPulse(log: PulseLog): Promise<void> {
  return post("logs", log);
}

export function reportApiCall(call: PulseApiCall): void {
  later(() => post("calls", call));
}

/**
 * A refused upload, for Pulse's brute-force and demo-limit alerts. Counted per visitor in Redis so a flood of refusals
 * sends at most BLOCKS_PER_WINDOW events per 15 minutes and can't fill Pulse's free database.
 */
export function reportBlocked(visitor: string, reason: BlockReason): void {
  later(async () => {
    const key = `regread:pulse:blocked:${visitor}:${Math.floor(Date.now() / (WINDOW_SECONDS * 1000))}`;
    const store = getStore();
    const sentBefore = await store.incr(key);
    if (sentBefore === 1) await store.expire(key, WINDOW_SECONDS * 2);
    if (sentBefore > BLOCKS_PER_WINDOW) return;
    await post("security", { type: "action_blocked", ip: visitor, path: "/api/scan", reason });
  });
}

/** The whole app hit its daily AI cap: one warning a day, not one per refused visitor. */
export function reportGlobalCap(): void {
  later(async () => {
    const key = `regread:pulse:global-cap:${new Date().toISOString().slice(0, 10)}`;
    const store = getStore();
    if ((await store.incr(key)) !== 1) return;
    await store.expire(key, 172_800);
    await post("logs", { level: "warn", message: "RegRead reached its daily AI cap", path: "/api/scan" });
  });
}
