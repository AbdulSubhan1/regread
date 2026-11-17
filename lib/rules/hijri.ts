// Saudi cards print Umm al-Qura (Hijri) dates. The built-in Intl calendar converts Gregorian → Hijri,
// so we search for the Gregorian day whose Hijri form matches. No date package needed.
const FORMAT = new Intl.DateTimeFormat("en-u-ca-islamic-umalqura-nu-latn", {
  timeZone: "UTC",
  day: "numeric",
  month: "numeric",
  year: "numeric",
});

const DAY_MS = 86_400_000;
// 1 Muharram 1 AH ≈ 16 July 622 (Julian), proleptic Gregorian 19 July 622
const EPOCH = Date.UTC(622, 6, 19);
const YEAR_DAYS = 354.367;
const MONTH_DAYS = 29.5306;

function hijriParts(date: Date): { y: number; m: number; d: number } {
  const parts = Object.fromEntries(FORMAT.formatToParts(date).map((p) => [p.type, p.value]));
  return { y: parseInt(parts.year, 10), m: Number(parts.month), d: Number(parts.day) };
}

export function hijriToGregorian(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 30) return null;
  const target = y * 400 + m * 31 + d;
  let t = EPOCH + Math.round((y - 1) * YEAR_DAYS + (m - 1) * MONTH_DAYS + (d - 1)) * DAY_MS;
  // The estimate is within a few days; walk toward the target, at most 40 steps.
  for (let i = 0; i < 40; i++) {
    const p = hijriParts(new Date(t));
    const here = p.y * 400 + p.m * 31 + p.d;
    if (here === target) return new Date(t);
    const next = t + (here < target ? DAY_MS : -DAY_MS);
    const pn = hijriParts(new Date(next));
    const there = pn.y * 400 + pn.m * 31 + pn.d;
    // Stepped over the target without hitting it: that Hijri day doesn't exist (e.g. 30th of a 29-day month)
    if ((here < target && there > target) || (here > target && there < target)) return null;
    t = next;
  }
  return null;
}
