import type { RegionProfile } from "./types";

const EMIRATES = "DUBAI|ABU DHABI|SHARJAH|AJMAN|UMM AL QUWAIN|RAS AL KHAIMAH|FUJAIRAH";

export const AE: RegionProfile = {
  code: "AE",
  name: "United Arab Emirates",
  cardName: "Mulkiya (vehicle licence)",
  languages: ["Arabic", "English"],
  promptHints: [
    "Labels are in Arabic and English, e.g. 'Chassis No.', 'Model', 'Reg. Date', 'Traffic Plate No.'.",
    "Plate = emirate name + a short code (letters or digits) + up to 5 digits, e.g. 'Dubai A 12345'.",
    "Chassis number is a 17-character VIN. Dates are DD/MM/YYYY (Gregorian).",
  ],
  plate: {
    aliases: {
      DXB: "DUBAI",
      دبي: "DUBAI",
      AD: "ABU DHABI",
      AUH: "ABU DHABI",
      ABUDHABI: "ABU DHABI",
      أبوظبي: "ABU DHABI",
      ابوظبي: "ABU DHABI",
      SHJ: "SHARJAH",
      الشارقة: "SHARJAH",
      AJM: "AJMAN",
      عجمان: "AJMAN",
      UAQ: "UMM AL QUWAIN",
      "UMM AL QAIWAIN": "UMM AL QUWAIN",
      "ام القيوين": "UMM AL QUWAIN",
      RAK: "RAS AL KHAIMAH",
      "رأس الخيمة": "RAS AL KHAIMAH",
      FUJ: "FUJAIRAH",
      الفجيرة: "FUJAIRAH",
    },
    patterns: [
      { pattern: new RegExp(`^(${EMIRATES}) ([A-Z0-9]{1,2}) (\\d{1,5})$`), format: "$1 $2 $3" },
      { pattern: new RegExp(`^([A-Z0-9]{1,2}) (\\d{1,5}) (${EMIRATES})$`), format: "$3 $1 $2" },
    ],
    example: "DUBAI A 12345",
  },
  chassis: ["vin"],
  calendars: ["gregorian"],
};
