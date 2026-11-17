import { expect, test, vi } from "vitest";

const sendToPulse = vi.fn();
vi.mock("@/lib/pulse/server", () => ({ sendToPulse }));

const { onRequestError } = await import("./instrumentation");

test("every server error goes to Pulse with its route, cut short so it can't carry a whole request", async () => {
  const error = Object.assign(new TypeError(`bad ${"x".repeat(500)}`), { digest: "123" });
  await onRequestError(error, { path: "/api/scan", method: "POST", headers: {} }, {
    routerKind: "App Router",
    routePath: "/api/scan",
    routeType: "route",
    renderSource: undefined,
    revalidateReason: undefined,
    renderType: undefined,
  } as Parameters<typeof onRequestError>[2]);
  const [log] = sendToPulse.mock.calls[0];
  expect(log).toMatchObject({
    level: "error",
    path: "/api/scan",
    context: { method: "POST", route: "/api/scan", type: "route", digest: "123" },
  });
  expect(log.message.startsWith("TypeError: bad x")).toBe(true);
  expect(log.message.length).toBeLessThanOrEqual(300);
});
