import { expect, test } from "vitest";
import { SECURITY_HEADERS } from "./security-headers";

const header = (key: string) => SECURITY_HEADERS.find((h) => h.key === key)?.value;

test("no other site may show RegRead in a frame", () => {
  expect(header("Content-Security-Policy")).toContain("frame-ancestors 'none'");
  expect(header("X-Frame-Options")).toBe("DENY");
});

test("browsers don't guess file types, and other sites only learn our origin", () => {
  expect(header("X-Content-Type-Options")).toBe("nosniff");
  expect(header("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
});

test("the page gets no camera, microphone or location access", () => {
  expect(header("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
});
