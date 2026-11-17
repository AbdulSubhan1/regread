import { CONFIDENCE_THRESHOLD, MAX_TEXT_FIELD } from "@/constants/config";
import { checkChassis } from "@/lib/rules/chassis";
import { gregorianDate, parseDmy, toIsoDate } from "@/lib/rules/dates";
import { hijriToGregorian } from "@/lib/rules/hijri";
import { MIN_YEAR, parseYear } from "@/lib/rules/year";
import { PROFILES } from "./index";
import { canonicalMake } from "./makes";
import { checkPlate } from "./plate";
import {
  FIELDS,
  type CheckedField,
  type CountryCode,
  type FieldName,
  type RawRead,
  type RegionProfile,
  type ScanResult,
} from "./types";

type Rule = { value: string } | { reason: string };

// A printed year in this range can only be Hijri (Gregorian cars before 1950 are rejected anyway)
const HIJRI_YEARS = { min: 1300, max: 1500 };
const EARLIEST = Date.UTC(MIN_YEAR, 0, 1);

function checkDate(raw: string, profile: RegionProfile, now: Date): Rule {
  const dmy = parseDmy(raw);
  if (!dmy) return { reason: "Use the date as DD/MM/YYYY" };
  // The printed year decides, not the model's label: 1300–1500 can only be Hijri, 1950+ only Gregorian
  const hijri = profile.calendars.includes("hijri") && dmy.y >= HIJRI_YEARS.min && dmy.y <= HIJRI_YEARS.max;
  const date = hijri ? hijriToGregorian(dmy.y, dmy.m, dmy.d) : gregorianDate(dmy);
  if (!date) return { reason: "This date doesn't exist" };
  if (date.getTime() < EARLIEST || date.getTime() > now.getTime()) {
    return { reason: `The date should be between ${MIN_YEAR} and today` };
  }
  return { value: toIsoDate(date) };
}

function checkText(raw: string): Rule {
  const value = raw.trim().replace(/\s+/g, " ");
  return value.length <= MAX_TEXT_FIELD ? { value } : { reason: "This looks too long, please check it" };
}

/** One field against one profile's rule. Used for the scan and again when the visitor confirms. */
export function checkField(name: FieldName, raw: string, profile: RegionProfile, now: Date): Rule {
  switch (name) {
    case "make":
      return { value: canonicalMake(raw).value };
    case "model":
    case "engineNumber":
      return checkText(raw);
    case "year": {
      const year = parseYear(raw, now);
      return year ? { value: String(year) } : { reason: `The year should be between ${MIN_YEAR} and next year` };
    }
    case "chassisNumber":
      return checkChassis(raw, profile.chassis);
    case "plate":
      return checkPlate(raw, profile.plate);
    case "registrationDate":
      return checkDate(raw, profile, now);
  }
}

function statusFor(name: FieldName, raw: string, value: string, confidence: number): CheckedField {
  if (confidence < CONFIDENCE_THRESHOLD) return { value, confidence, status: "check", reason: "Please check this one" };
  if (name === "make" && !canonicalMake(raw).known) {
    return { value, confidence, status: "check", reason: "Not a make we know, please check" };
  }
  // No format rule exists for these, so a confident answer is still never shown as checked
  if (name === "model" || name === "engineNumber") return { value, confidence, status: "filled" };
  return { value, confidence, status: "ok" };
}

/** Applies a country's profile to what was read. `country` null = we don't know yet: keep values, ask. */
export function checkRead(
  read: RawRead,
  country: CountryCode | null,
  source: "ai" | "ocr",
  now: Date = new Date(),
): ScanResult {
  const profile = country ? PROFILES[country] : null;
  const fields = {} as Record<FieldName, CheckedField>;
  for (const name of FIELDS) {
    const { value, confidence } = read.fields[name];
    const raw = value?.trim() ?? "";
    if (!raw) {
      fields[name] = { value: null, confidence, status: "empty" };
    } else if (!profile) {
      fields[name] = { value: raw, confidence, status: "check", reason: "Pick the card's country to check this" };
    } else {
      const rule = checkField(name, raw, profile, now);
      fields[name] =
        "reason" in rule
          ? { value: null, confidence, status: "flagged", reason: rule.reason }
          : statusFor(name, raw, rule.value, confidence);
    }
  }
  return {
    country,
    source,
    fields,
    raw: {
      fields: Object.fromEntries(FIELDS.map((f) => [f, read.fields[f].value])) as Record<FieldName, string | null>,
      registrationDateCalendar: read.registrationDateCalendar,
    },
  };
}
