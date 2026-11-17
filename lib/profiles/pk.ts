import type { RegionProfile } from "./types";

export const PK: RegionProfile = {
  code: "PK",
  name: "Pakistan",
  cardName: "Registration book or smart card",
  languages: ["English", "Urdu"],
  promptHints: [
    "Labels are in English and Urdu, e.g. 'Registration No.', 'Chassis No.', 'Engine No.', 'Maker', 'Model'.",
    "Plate = 2–4 city letters + up to 4 digits, sometimes a 2-digit year after it, e.g. 'LEA-1234' or 'LEA-1234-19'.",
    "Chassis is a 17-character VIN or a Japanese frame number like 'NZE141-1234567'. Dates are DD/MM/YYYY.",
  ],
  plate: {
    patterns: [
      { pattern: /^([A-Z]{2,4}) ?(\d{1,4}) (\d{2})$/, format: "$1-$2-$3" },
      { pattern: /^([A-Z]{2,4}) ?(\d{1,4})$/, format: "$1-$2" },
    ],
    example: "LEA-1234",
  },
  chassis: ["vin", "jp-frame"],
  calendars: ["gregorian"],
};
