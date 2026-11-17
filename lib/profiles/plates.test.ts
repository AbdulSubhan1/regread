import { expect, test } from "vitest";
import { checkPlate } from "./plate";
import { PROFILES } from "./index";

const ok = (code: keyof typeof PROFILES, raw: string) => checkPlate(raw, PROFILES[code].plate);

test.each([
  ["AE", "Dubai A 12345", "DUBAI A 12345"],
  ["AE", "dxb a 12345", "DUBAI A 12345"],
  ["AE", "Abu Dhabi 1 12345", "ABU DHABI 1 12345"],
  ["AE", "دبي AA 777", "DUBAI AA 777"],
  ["AE", "A 12345 Sharjah", "SHARJAH A 12345"],
  ["PK", "LEA-1234", "LEA-1234"],
  ["PK", "lea 1234", "LEA-1234"],
  ["PK", "ICT-123", "ICT-123"],
  ["PK", "LEA-1234-19", "LEA-1234-19"],
  ["SA", "ABJ 1234", "ABJ 1234"],
  ["SA", "a b j ١٢٣٤", "ABJ 1234"],
  ["SA", "ا ب ح ١٢٣٤", "ABJ 1234"],
  ["SA", "1234 ABJ", "ABJ 1234"],
  ["QA", "123456", "123456"],
  ["QA", "٤٥٦٧", "4567"],
  ["QA", "12 345", "12345"],
])("%s plate %s → %s", (code, raw, expected) => {
  expect(ok(code as keyof typeof PROFILES, raw)).toEqual({ value: expected });
});

test.each([
  ["AE", "LEA-1234"],
  ["AE", "Paris A 12345"],
  ["PK", "1234"],
  ["PK", "LEAKS-1234"],
  ["SA", "ABC 1234"],
  ["SA", "AB 1234"],
  ["QA", "1234567"],
  ["QA", "ABC 123"],
])("%s rejects plate %s", (code, raw) => {
  expect(ok(code as keyof typeof PROFILES, raw)).toEqual({ reason: expect.stringContaining("plate") });
});
