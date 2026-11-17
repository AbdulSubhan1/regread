import { normaliseToken } from "@/lib/rules/normalise";
import type { PlateRule } from "./types";

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function checkPlate(raw: string, rule: PlateRule): { value: string } | { reason: string } {
  const mapped = rule.letters ? [...raw].map((ch) => rule.letters![ch] ?? ch).join("") : raw;
  let s = normaliseToken(mapped);
  // Longest alias first, so "ABU DHABI" wins over a shorter word inside it
  for (const [from, to] of Object.entries(rule.aliases ?? {}).sort((a, b) => b[0].length - a[0].length)) {
    s = s.replace(new RegExp(`(^| )${escape(normaliseToken(from))}(?= |$)`, "g"), `$1${to}`);
  }
  for (const { pattern, format } of rule.patterns) {
    if (pattern.test(s)) return { value: s.replace(pattern, format) };
  }
  return { reason: `This doesn't look like a plate number from this country, like ${rule.example}` };
}
