import { expect, test } from "vitest";
import { toIsoDate } from "./dates";
import { hijriToGregorian } from "./hijri";

test.each([
  [1445, 9, 1, "2024-03-11"],
  [1440, 1, 1, "2018-09-11"],
  [1446, 1, 1, "2024-07-07"],
])("Hijri %i-%i-%i is %s", (y, m, d, iso) => {
  const date = hijriToGregorian(y, m, d);
  expect(date && toIsoDate(date)).toBe(iso);
});

test("returns null for a month that doesn't exist", () => {
  expect(hijriToGregorian(1445, 13, 1)).toBeNull();
});

test("returns null for day 31", () => {
  expect(hijriToGregorian(1445, 9, 31)).toBeNull();
});
