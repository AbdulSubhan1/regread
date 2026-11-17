import { afterEach, expect, test, vi } from "vitest";
import { visitorId } from "./visitor";

afterEach(() => vi.unstubAllEnvs());

const headers = (ip: string) => new Headers({ "x-forwarded-for": `${ip}, 10.0.0.1` });

test("the same IP and salt give the same id", () => {
  expect(visitorId(headers("203.0.113.7"), "salt-a")).toBe(visitorId(headers("203.0.113.7"), "salt-a"));
});

test("a different salt gives a different id, so the hash can't be looked up", () => {
  expect(visitorId(headers("203.0.113.7"), "salt-a")).not.toBe(visitorId(headers("203.0.113.7"), "salt-b"));
});

test("only the first forwarded IP counts, and the id never contains it", () => {
  const id = visitorId(headers("203.0.113.7"), "salt-a");
  expect(id).toMatch(/^[0-9a-f]{32}$/);
  expect(id).not.toContain("203");
  expect(id).toBe(visitorId(new Headers({ "x-forwarded-for": "203.0.113.7" }), "salt-a"));
});

test("production refuses to run without a salt", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("VISITOR_SALT", "");
  expect(() => visitorId(headers("203.0.113.7"))).toThrow(/VISITOR_SALT/);
});
