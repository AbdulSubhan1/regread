import type { RegionProfile } from "./types";

// Saudi plates use 17 Arabic letters, each with an official Latin pair
const L = "[ABJDRSXTEGKLZNHUV]";

export const SA: RegionProfile = {
  code: "SA",
  name: "Saudi Arabia",
  cardName: "Istimara (vehicle registration)",
  languages: ["Arabic"],
  promptHints: [
    "Mostly Arabic. Labels like 'رقم الهيكل' (chassis), 'سنة الصنع' (year), 'رقم اللوحة' (plate), 'تاريخ التسجيل' (date).",
    "Plate = 3 letters + up to 4 digits; give the Latin letters, e.g. 'ABJ 1234'.",
    "Chassis number is a 17-character VIN. Dates are often Hijri (e.g. 01/09/1445): say so in registrationDateCalendar.",
  ],
  plate: {
    letters: {
      ا: "A",
      أ: "A",
      إ: "A",
      ب: "B",
      ح: "J",
      د: "D",
      ر: "R",
      س: "S",
      ص: "X",
      ط: "T",
      ع: "E",
      ق: "G",
      ك: "K",
      ل: "L",
      م: "Z",
      ن: "N",
      ه: "H",
      ة: "H",
      و: "U",
      ى: "V",
      ي: "V",
    },
    patterns: [
      { pattern: new RegExp(`^(${L}) ?(${L}) ?(${L}) ?(\\d{1,4})$`), format: "$1$2$3 $4" },
      { pattern: new RegExp(`^(\\d{1,4}) ?(${L}) ?(${L}) ?(${L})$`), format: "$2$3$4 $1" },
    ],
    example: "ABJ 1234",
  },
  chassis: ["vin"],
  calendars: ["gregorian", "hijri"],
};
