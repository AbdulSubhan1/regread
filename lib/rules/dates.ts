import { toWesternDigits } from "./normalise";

export type Calendar = "gregorian" | "hijri";
export type DayMonthYear = { d: number; m: number; y: number };

/** Reads DD/MM/YYYY with / - . or spaces between parts. Whether the day exists is checked later, per calendar. */
export function parseDmy(raw: string): DayMonthYear | null {
  const m = toWesternDigits(raw)
    .trim()
    .match(/^(\d{1,2})\s*[/\-.\s]\s*(\d{1,2})\s*[/\-.\s]\s*(\d{4})$/);
  return m ? { d: Number(m[1]), m: Number(m[2]), y: Number(m[3]) } : null;
}

/** A real Gregorian date, or null for things like 31/02. */
export function gregorianDate({ d, m, y }: DayMonthYear): Date | null {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
