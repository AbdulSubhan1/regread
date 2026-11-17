import { PROFILES } from "@/lib/profiles";
import { checkField, checkRead } from "@/lib/profiles/check";
import {
  COUNTRY_CODES,
  FIELDS,
  type CountryCode,
  type FieldName,
  type RawRead,
  type ScanResult,
} from "@/lib/profiles/types";

// OCR on the device is far less reliable than the AI: every value it finds is shown as "please check".
const OCR_CONFIDENCE = 0.4;

// English labels, tried in this order on each line (so "Model Year" is a year, not a model). The owner is never read.
const LABELS: [FieldName, RegExp][] = [
  ["registrationDate", /\b(reg\.? ?date|date of registration|first reg\.?|registration date)/i],
  ["year", /\b(model year|year of manufacture|year)\b/i],
  ["chassisNumber", /\b(chassis no\.?|chassis|vin|frame no\.?)/i],
  ["engineNumber", /\b(engine no\.?|engine)/i],
  ["plate", /\b(traffic plate no\.?|plate no\.?|registration no\.?|plate)/i],
  ["model", /\bmodel\b/i],
  ["make", /\b(maker|make)\b/i],
];
const OWNER = /\b(owner|name)\b/i;
const VIN_TOKEN = /\b[A-HJ-NPR-Z0-9]{17}\b/;
const DATE = /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{4}\b/;

/** What follows the label, without Arabic/Urdu text or separators. */
function valueAfter(line: string, label: RegExp): string {
  return line
    .replace(label, "")
    .replace(/[^\x20-\x7E]+/g, " ")
    .replace(/^[\s:.\-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findValues(text: string): Partial<Record<FieldName, string>> {
  const found: Partial<Record<FieldName, string>> = {};
  for (const line of text.split(/\r?\n/)) {
    if (OWNER.test(line)) continue;
    const hit = LABELS.find(([name, label]) => !found[name] && label.test(line));
    if (hit) {
      const value = valueAfter(line, hit[1]);
      if (value) found[hit[0]] = value;
    }
  }
  found.chassisNumber ??= text.toUpperCase().match(VIN_TOKEN)?.[0];
  found.registrationDate ??= text.match(DATE)?.[0];
  return found;
}

/** The country whose rules accept the most of what was found; ties go to the first. None accepted → null. */
function guessCountry(values: Partial<Record<FieldName, string>>): CountryCode | null {
  const now = new Date();
  let best: { code: CountryCode | null; score: number } = { code: null, score: 0 };
  for (const code of COUNTRY_CODES) {
    const score = (["plate", "chassisNumber", "registrationDate"] as const).filter(
      (f) => values[f] && "value" in checkField(f, values[f], PROFILES[code], "unknown", now),
    ).length;
    if (score > best.score) best = { code, score };
  }
  return best.code;
}

/** The fallback: turns text read on the device into the same result shape as the AI path. */
export function extractFromText(text: string, country: CountryCode | null): ScanResult {
  const values = findValues(text);
  const read: RawRead = {
    country: "unknown",
    fields: Object.fromEntries(
      FIELDS.map((f) => [f, { value: values[f] ?? null, confidence: values[f] ? OCR_CONFIDENCE : 0 }]),
    ) as RawRead["fields"],
    registrationDateCalendar: "unknown",
  };
  return checkRead(read, country ?? guessCountry(values), "ocr");
}
