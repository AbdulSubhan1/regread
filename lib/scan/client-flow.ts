import { COPY, UPLOAD_ERRORS } from "@/constants/copy";
import { FIELDS, type FieldName, type ScanResult } from "@/lib/profiles/types";

/** What the page got back from POST /api/scan. Status 0 = the request never reached the server. */
export type ApiAnswer = { ok: true; result: ScanResult } | { ok: false; status: number; error?: string };

export type NextStep = { kind: "result"; result: ScanResult } | { kind: "ocr" } | { kind: "error"; message: string };

/**
 * 429 (daily limit), 5xx (AI failed, timeout, storage down) and no connection all mean "the AI can't read it now":
 * read on the device instead. OCR can't read a PDF, so a PDF asks for a photo.
 */
export function nextStep(answer: ApiAnswer, isPdf: boolean): NextStep {
  if (answer.ok) return { kind: "result", result: answer.result };
  const { status, error } = answer;
  if (status === 0 || status === 429 || status >= 500) {
    return isPdf ? { kind: "error", message: COPY.pdfBusy } : { kind: "ocr" };
  }
  if (status === 413) return { kind: "error", message: UPLOAD_ERRORS.size };
  if (status === 400 && error && UPLOAD_ERRORS[error]) return { kind: "error", message: UPLOAD_ERRORS[error] };
  return { kind: "error", message: COPY.generic };
}

/** After a country switch re-checks the card, fields the visitor already typed in keep their value. */
export function keepEdits(
  next: Record<FieldName, string>,
  current: Record<FieldName, string>,
  edited: Partial<Record<FieldName, boolean>>,
): Record<FieldName, string> {
  return Object.fromEntries(FIELDS.map((f) => [f, edited[f] ? current[f] : next[f]])) as Record<FieldName, string>;
}
