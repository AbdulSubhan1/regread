import { afterEach, expect, test, vi } from "vitest";
import { track } from "./pulse";

afterEach(() => vi.unstubAllGlobals());

test("before the beacon loads, events wait in its queue", () => {
  const w: Record<string, unknown> = {};
  vi.stubGlobal("window", w);
  track("card_uploaded", "pdf");
  track("consent_ticked");
  expect(w.pulse).toEqual({ q: [["card_uploaded", "pdf"], "consent_ticked"] });
});

test("once the beacon is there, events go straight to it", () => {
  const send = vi.fn();
  vi.stubGlobal("window", { pulse: { track: send } });
  track("card_read", "ai · AE");
  expect(send).toHaveBeenCalledWith("card_read", "ai · AE");
});

test("on the server it does nothing", () => {
  expect(() => track("card_read")).not.toThrow();
});
