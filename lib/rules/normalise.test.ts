import { expect, test } from "vitest";
import { normaliseToken, toWesternDigits } from "./normalise";

test("turns Arabic-Indic and Persian digits into Western digits", () => {
  expect(toWesternDigits("١٢٣٤ ۵۶")).toBe("1234 56");
});

test("normalises a token: upper-case, single spaces for dashes, dots and runs of space", () => {
  expect(normaliseToken("  lea--١٢٣٤ . 19 ")).toBe("LEA 1234 19");
});
