import { expect, test } from "vitest";
import { parseYear } from "./year";

const now = new Date("2026-11-17T00:00:00Z");

test.each([
  ["2019", 2019],
  ["٢٠١٩", 2019],
  ["2027", 2027],
  ["1949", null],
  ["2028", null],
  ["19", null],
  ["Model 2019", null],
])("parseYear(%s) → %s", (raw, expected) => {
  expect(parseYear(raw, now)).toBe(expected);
});
