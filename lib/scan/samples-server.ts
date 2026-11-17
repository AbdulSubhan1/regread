import { readFile } from "node:fs/promises";
import path from "node:path";
import { SAMPLES } from "@/samples/cards";
import type { CardFile } from "./read-card";

/** A sample is sent by id, never uploaded: the server reads the made-up card from public/samples. */
export async function readSampleFile(id: string): Promise<CardFile | null> {
  if (!SAMPLES.some((s) => s.id === id)) return null;
  const data = await readFile(path.join(process.cwd(), "public", "samples", `${id}.jpg`));
  return { data: new Uint8Array(data), mediaType: "image/jpeg" };
}
