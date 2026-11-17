import { expect, test } from "vitest";
import { isAllowedOrigin } from "./cors";

const SELF = "https://regread.vercel.app/api/scan";

test("RegRead's own page may post, from any host it is served on", () => {
  expect(isAllowedOrigin("https://regread.vercel.app", SELF, "")).toBe(true);
  expect(isAllowedOrigin("http://localhost:3000", "http://localhost:3000/api/scan", "")).toBe(true);
});

test("a site on the allow list may post", () => {
  expect(isAllowedOrigin("https://brokwise.vercel.app", SELF, "https://brokwise.vercel.app")).toBe(true);
});

test("any other site, or a call with no Origin at all (curl, scripts), may not", () => {
  expect(isAllowedOrigin("https://evil.example", SELF, "https://brokwise.vercel.app")).toBe(false);
  expect(isAllowedOrigin(null, SELF, "https://brokwise.vercel.app")).toBe(false);
  expect(isAllowedOrigin("null", SELF, "")).toBe(false);
});
