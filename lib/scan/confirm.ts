import { PROFILES } from "@/lib/profiles";
import { checkField } from "@/lib/profiles/check";
import { FIELDS, type CountryCode, type FieldName } from "@/lib/profiles/types";

export const REQUIRED_FIELDS: readonly FieldName[] = ["make", "model", "year", "chassisNumber", "plate"];

const REQUIRED_MESSAGE: Partial<Record<FieldName, string>> = {
  make: "Enter the make",
  model: "Enter the model",
  year: "Enter the model year",
  chassisNumber: "Enter the chassis number",
  plate: "Enter the plate number",
};

export type ConfirmErrors = Partial<Record<FieldName | "country", string>>;

// The form edits dates with a native date input (YYYY-MM-DD); the rules read DD/MM/YYYY.
const isoToDmy = (iso: string) => iso.split("-").reverse().join("/");

/**
 * The same rules as the scan, run again on what the visitor typed. Errors are in form order (country first),
 * so the page can focus the first one.
 */
export function validateConfirm(
  input: Record<FieldName, string>,
  country: CountryCode | null,
  now: Date = new Date(),
): { errors: ConfirmErrors; values: Record<FieldName, string | null> } {
  const errors: ConfirmErrors = {};
  const values = {} as Record<FieldName, string | null>;
  if (!country) errors.country = "Pick the country the card is from";
  for (const name of FIELDS) {
    const raw = input[name].trim();
    values[name] = raw || null;
    if (!raw) {
      if (REQUIRED_MESSAGE[name]) errors[name] = REQUIRED_MESSAGE[name];
      continue;
    }
    if (!country) continue;
    const text = name === "registrationDate" ? isoToDmy(raw) : raw;
    const rule = checkField(name, text, PROFILES[country], now);
    if ("reason" in rule) errors[name] = rule.reason;
    else values[name] = rule.value;
  }
  return { errors, values };
}
