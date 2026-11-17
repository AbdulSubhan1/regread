import { toWesternDigits } from "./normalise";

export const MIN_YEAR = 1950;

/** A model year: four digits, from 1950 up to next year (new models are sold a year early). */
export function parseYear(raw: string, now: Date): number | null {
  const s = toWesternDigits(raw).trim();
  if (!/^\d{4}$/.test(s)) return null;
  const year = Number(s);
  return year >= MIN_YEAR && year <= now.getUTCFullYear() + 1 ? year : null;
}
