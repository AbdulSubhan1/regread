import { expect, test } from "vitest";
import { parseDmy, toIsoDate } from "./dates";

test.each([
  ["05/03/2021", { d: 5, m: 3, y: 2021 }],
  ["5-3-2021", { d: 5, m: 3, y: 2021 }],
  ["05.03.2021", { d: 5, m: 3, y: 2021 }],
  ["٠٥/٠٣/٢٠٢١", { d: 5, m: 3, y: 2021 }],
  ["31/02/2021", { d: 31, m: 2, y: 2021 }],
  ["2021/03/05", null],
  ["March 2021", null],
])("parseDmy(%s)", (raw, expected) => {
  expect(parseDmy(raw)).toEqual(expected);
});

test("toIsoDate formats a UTC date", () => {
  expect(toIsoDate(new Date(Date.UTC(2024, 2, 11)))).toBe("2024-03-11");
});

test.each([
  ["01/09/1445 هـ", { d: 1, m: 9, y: 1445 }],
  ["01/09/1445هـ", { d: 1, m: 9, y: 1445 }],
  ["01/09/1445 AH", { d: 1, m: 9, y: 1445 }],
  ["05/03/2021 م", { d: 5, m: 3, y: 2021 }],
])("parseDmy ignores a calendar mark after the date: %s", (raw, expected) => {
  expect(parseDmy(raw)).toEqual(expected);
});
