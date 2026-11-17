import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { PULSE_URL } from "@/constants/config";
import { resetMemoryStore } from "@/lib/store/redis";

// `after` runs the task at once here; the test waits for it before checking what was sent
const pending: Promise<unknown>[] = [];
vi.mock("next/server", () => ({ after: (task: () => Promise<unknown>) => void pending.push(task()) }));

const { reportApiCall, reportBlocked, reportGlobalCap, sendToPulse, BLOCKS_PER_WINDOW } = await import("./server");

const fetchMock = vi.fn<typeof fetch>();
const settle = async () => void (await Promise.all(pending.splice(0)));
const sent = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url),
    auth: new Headers(init?.headers).get("authorization"),
    body: JSON.parse(String(init?.body)),
  }));

beforeEach(() => {
  resetMemoryStore();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("MONITOR_LOG_TOKEN", "regread.sig");
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

test("nothing is sent until the token is set", async () => {
  vi.stubEnv("MONITOR_LOG_TOKEN", "");
  await sendToPulse({ level: "error", message: "boom" });
  reportApiCall({ method: "POST", host: "h", path: "/p", status: 200, ms: 5 });
  reportBlocked("v1", "burst_limit");
  await settle();
  expect(fetchMock).not.toHaveBeenCalled();
});

test("a log goes to /api/logs with RegRead's token", async () => {
  await sendToPulse({ level: "error", message: "boom", path: "/api/scan" });
  expect(sent()).toEqual([
    {
      url: `${PULSE_URL}/api/logs`,
      auth: "Bearer regread.sig",
      body: { level: "error", message: "boom", path: "/api/scan" },
    },
  ]);
});

test("an AI call goes to /api/calls after the response", async () => {
  reportApiCall({
    method: "POST",
    host: "generativelanguage.googleapis.com",
    path: "/v1beta/models/m",
    status: 429,
    ms: 812,
  });
  await settle();
  expect(sent()[0]).toMatchObject({ url: `${PULSE_URL}/api/calls`, body: { status: 429, ms: 812 } });
});

test("a refused upload is a security event with the hashed visitor, never the IP", async () => {
  reportBlocked("a1b2c3", "pdf_too_many_pages");
  await settle();
  expect(sent()[0]).toEqual({
    url: `${PULSE_URL}/api/security`,
    auth: "Bearer regread.sig",
    body: { type: "action_blocked", ip: "a1b2c3", path: "/api/scan", reason: "pdf_too_many_pages" },
  });
});

test("one visitor's refusals are sent only up to the cap per 15 minutes, so a flood can't flood Pulse", async () => {
  for (let i = 0; i < BLOCKS_PER_WINDOW + 5; i++) reportBlocked("flooder", "burst_limit");
  reportBlocked("someone-else", "burst_limit");
  await settle();
  expect(sent().filter((s) => s.body.ip === "flooder")).toHaveLength(BLOCKS_PER_WINDOW);
  expect(sent().filter((s) => s.body.ip === "someone-else")).toHaveLength(1);
});

test("the app's daily AI cap is logged once a day, however often it is hit", async () => {
  reportGlobalCap();
  reportGlobalCap();
  await settle();
  expect(sent()).toHaveLength(1);
  expect(sent()[0]).toMatchObject({ url: `${PULSE_URL}/api/logs`, body: { level: "warn" } });
});

test("Pulse being down never throws", async () => {
  fetchMock.mockRejectedValue(new Error("offline"));
  await expect(sendToPulse({ level: "error", message: "boom" })).resolves.toBeUndefined();
  reportBlocked("v1", "burst_limit");
  await expect(settle()).resolves.toBeUndefined();
});
