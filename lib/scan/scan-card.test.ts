import { MockLanguageModelV4 } from "ai/test";
import { expect, test } from "vitest";
import { scanCard } from "./scan-card";

const usage = {
  inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 1, text: 1, reasoning: undefined },
};

function mockModel(text: string, seen: { prompt?: unknown } = {}) {
  return new MockLanguageModelV4({
    doGenerate: async (options) => {
      seen.prompt = options.prompt;
      return {
        content: [{ type: "text", text }],
        finishReason: { unified: "stop", raw: undefined },
        usage,
        warnings: [],
      };
    },
  });
}

const field = (value: string | null, confidence = 0.95) => ({ value, confidence });
const uaeRead = {
  country: "AE",
  fields: {
    make: field("Toyota"),
    model: field("Land Cruiser"),
    year: field("2021"),
    chassisNumber: field("JTMHV05J604123456"),
    plate: field("dxb a 12345"),
    registrationDate: field("05/03/2021"),
    engineNumber: field(null, 0),
  },
  registrationDateCalendar: "gregorian",
};
const file = { data: new Uint8Array([1, 2, 3]), mediaType: "image/jpeg" };

test("reads a UAE card and checks it with the UAE profile", async () => {
  const result = await scanCard(file, { model: mockModel(JSON.stringify(uaeRead)) });
  expect(result.country).toBe("AE");
  expect(result.source).toBe("ai");
  expect(result.fields.plate).toMatchObject({ value: "DUBAI A 12345", status: "ok" });
  expect(result.fields.engineNumber.status).toBe("empty");
});

test("a photo that isn't a card gives no country and empty fields", async () => {
  const nothing = {
    country: "unknown",
    fields: Object.fromEntries(Object.keys(uaeRead.fields).map((k) => [k, field(null, 0)])),
    registrationDateCalendar: "unknown",
  };
  const result = await scanCard(file, { model: mockModel(JSON.stringify(nothing)) });
  expect(result.country).toBeNull();
  expect(Object.values(result.fields).every((f) => f.status === "empty")).toBe(true);
});

test("sends the image and a prompt that tells the model to ignore owner details", async () => {
  const seen: { prompt?: unknown } = {};
  await scanCard(file, { model: mockModel(JSON.stringify(uaeRead), seen) });
  const text = JSON.stringify(seen.prompt);
  expect(text).toMatch(/ignore/i);
  expect(text).toMatch(/owner/i);
  expect(text).toContain("image/jpeg");
});

test("rejects when the model's answer doesn't fit the shape", async () => {
  await expect(scanCard(file, { model: mockModel('{"country":"FR"}') })).rejects.toThrow();
});

test("rejects when the model fails", async () => {
  const failing = new MockLanguageModelV4({
    doGenerate: async () => {
      throw new Error("quota");
    },
  });
  await expect(scanCard(file, { model: failing })).rejects.toThrow();
});
