import { Redis } from "@upstash/redis";

/** The only server-side state: daily counters and the made-up sample cards' cached results. */
export type Store = {
  incr(key: string): Promise<number>;
  decr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  getJson<T>(key: string): Promise<T | null>;
  setJson(key: string, value: unknown, ttlSeconds: number): Promise<unknown>;
};

function memoryStore(): Store {
  const data = new Map<string, unknown>();
  const num = (k: string) => Number(data.get(k) ?? 0);
  return {
    incr: async (k) => (data.set(k, num(k) + 1), num(k)),
    decr: async (k) => (data.set(k, num(k) - 1), num(k)),
    expire: async () => undefined,
    getJson: async <T>(k: string) => (data.get(k) as T | undefined) ?? null,
    setJson: async (k, v) => data.set(k, v),
  };
}

let store: Store | undefined;

export function getStore(): Store {
  if (store) return store;
  // Redis.fromEnv reads either name set: Upstash's own, or the one the Vercel integration creates
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (url && token) {
    const redis = Redis.fromEnv();
    store = {
      incr: (k) => redis.incr(k),
      decr: (k) => redis.decr(k),
      expire: (k, s) => redis.expire(k, s),
      getJson: <T>(k: string) => redis.get<T>(k),
      setJson: (k, v, ttl) => redis.set(k, v, { ex: ttl }),
    };
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Set UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_URL/TOKEN): the daily limits need shared storage",
    );
  } else {
    // Local dev and tests only: resets when the process restarts
    store = memoryStore();
  }
  return store;
}

/** Tests only: start from an empty memory store. */
export function resetMemoryStore(): void {
  store = memoryStore();
}
