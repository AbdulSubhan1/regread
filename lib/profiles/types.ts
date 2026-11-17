import type { ChassisKind } from "@/lib/rules/chassis";
import type { Calendar } from "@/lib/rules/dates";

export const FIELDS = ["make", "model", "year", "chassisNumber", "plate", "registrationDate", "engineNumber"] as const;
export type FieldName = (typeof FIELDS)[number];

export const COUNTRY_CODES = ["AE", "PK", "SA", "QA"] as const;
export type CountryCode = (typeof COUNTRY_CODES)[number];

/**
 * How a country writes its plates. Applied in order: `letters` maps single characters (e.g. Arabic plate letters
 * to their Latin pair), the text is normalised (upper case, Western digits, single spaces), `aliases` rewrite whole
 * words (e.g. DXB → DUBAI), then the first matching pattern's `format` gives the canonical plate.
 */
export type PlateRule = {
  letters?: Record<string, string>;
  aliases?: Record<string, string>;
  patterns: { pattern: RegExp; format: string }[];
  example: string;
};

/** Everything that differs between countries. Data only: lib/profiles/check.ts applies any profile. */
export type RegionProfile = {
  code: CountryCode;
  name: string;
  cardName: string;
  languages: string[];
  promptHints: string[];
  plate: PlateRule;
  chassis: ChassisKind[];
  calendars: Calendar[];
};

export type ReadField = { value: string | null; confidence: number };

/** What the model returns: one fixed shape for every country. */
export type RawRead = {
  country: CountryCode | "unknown";
  fields: Record<FieldName, ReadField>;
  registrationDateCalendar: Calendar | "unknown";
};

/** ok: passed a format rule. filled: no format rule exists (model, engine). check: please look. flagged: failed a rule. */
export type FieldStatus = "ok" | "filled" | "check" | "flagged" | "empty";
export type CheckedField = { value: string | null; confidence: number; status: FieldStatus; reason?: string };

export type ScanResult = {
  country: CountryCode | null;
  source: "ai" | "ocr";
  fields: Record<FieldName, CheckedField>;
  raw: { fields: Record<FieldName, string | null>; registrationDateCalendar: Calendar | "unknown" };
};
