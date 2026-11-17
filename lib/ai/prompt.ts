import { PROFILES } from "@/lib/profiles";

export function buildSystemPrompt(): string {
  const countries = Object.values(PROFILES)
    .map((p) => `- ${p.code} (${p.name}, ${p.cardName}, ${p.languages.join(" + ")}):\n  ${p.promptHints.join("\n  ")}`)
    .join("\n");
  return [
    "You read vehicle registration cards and return the car's details.",
    "Read ONLY these vehicle fields: make, model, year (model/manufacture year), chassisNumber (VIN or frame number), plate, registrationDate, engineNumber.",
    "Ignore the owner's name, address, nationality, ID number, phone and any other personal details. Never return them.",
    "Give each value exactly as printed (keep the original digits and separators). Use null when a field is missing or unreadable; never guess.",
    "Give each field a confidence from 0 to 1. Use a low confidence when the text is blurry, cut off or ambiguous.",
    "Pick the country from the cards below; use unknown if it is not a vehicle registration card from one of them.",
    "Set registrationDateCalendar to hijri when the date is in the Hijri calendar (years around 1400–1450).",
    "",
    "Countries:",
    countries,
  ].join("\n");
}
