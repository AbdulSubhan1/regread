import type { ACCEPTED_TYPES } from "@/constants/config";

type AcceptedType = (typeof ACCEPTED_TYPES)[number];

const startsWith = (data: Uint8Array, sig: readonly number[], at = 0) =>
  data.length >= at + sig.length && sig.every((b, i) => data[at + i] === b);

const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

/**
 * The file's real type from its first bytes. The browser's declared type is just a label anyone can set, so the
 * route only trusts an upload whose bytes agree with it.
 */
export function sniffType(data: Uint8Array): AcceptedType | null {
  if (startsWith(data, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(data, [0x89, ...ascii("PNG"), 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith(data, ascii("RIFF")) && startsWith(data, ascii("WEBP"), 8)) return "image/webp";
  if (startsWith(data, ascii("%PDF-"))) return "application/pdf";
  return null;
}

/**
 * Pages in a PDF, read from its markers without a PDF library: the larger of the page objects found and the biggest
 * /Count in a page tree. A PDF that hides both in compressed object streams reads as 0; the PDF size cap bounds it.
 */
export function pdfPageCount(data: Uint8Array): number {
  const text = new TextDecoder("latin1").decode(data);
  const pageObjects = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
  const counts = [...text.matchAll(/\/Count\s+(\d+)/g)].map((m) => Number(m[1]));
  return Math.max(pageObjects, ...counts);
}
