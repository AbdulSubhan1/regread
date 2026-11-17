import { SAMPLE_CACHE_SECONDS } from "@/constants/config";
import type { ScanResult } from "@/lib/profiles/types";
import { getStore } from "@/lib/store/redis";

// Demo clicks on the made-up cards reuse one answer per model, so they cost no free-tier calls.
const key = (id: string) => `regread:sample:${id}:${process.env.AI_MODEL ?? "default"}`;

export const getCachedSample = (id: string) => getStore().getJson<ScanResult>(key(id));

export async function setCachedSample(id: string, result: ScanResult): Promise<void> {
  await getStore().setJson(key(id), result, SAMPLE_CACHE_SECONDS);
}
