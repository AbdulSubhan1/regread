import { checkRead } from "@/lib/profiles/check";
import type { ScanResult } from "@/lib/profiles/types";
import { readCard, type CardFile, type ReadOptions } from "./read-card";

export async function scanCard(file: CardFile, opts?: ReadOptions): Promise<ScanResult> {
  const read = await readCard(file, opts);
  return checkRead(read, read.country === "unknown" ? null : read.country, "ai");
}
