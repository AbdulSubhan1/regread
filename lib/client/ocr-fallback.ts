import { extractFromText } from "@/lib/ocr/extract";
import type { CountryCode, ScanResult } from "@/lib/profiles/types";

/**
 * Used only when the AI is unavailable (daily limit or free quota used up). Tesseract runs in the browser,
 * so it is loaded on demand: the normal page never downloads it. English only, to keep the download small.
 */
export async function ocrFallback(image: Blob, country: CountryCode | null): Promise<ScanResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(image);
    return extractFromText(data.text, country);
  } finally {
    await worker.terminate();
  }
}
