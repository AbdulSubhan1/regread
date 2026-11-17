import type { RegionProfile } from "./types";

export const QA: RegionProfile = {
  code: "QA",
  name: "Qatar",
  cardName: "Istimara (vehicle registration)",
  languages: ["Arabic", "English"],
  promptHints: [
    "Labels are in Arabic and English, e.g. 'Plate No.', 'Chassis No.', 'Make', 'Model', 'Year'.",
    "Plate = digits only, 1 to 6 of them, e.g. '123456'.",
    "Chassis number is a 17-character VIN. Dates are DD/MM/YYYY (Gregorian).",
  ],
  plate: {
    patterns: [
      { pattern: /^(\d{1,3}) (\d{3})$/, format: "$1$2" },
      { pattern: /^(\d{1,6})$/, format: "$1" },
    ],
    example: "123456",
  },
  chassis: ["vin"],
  calendars: ["gregorian"],
};
