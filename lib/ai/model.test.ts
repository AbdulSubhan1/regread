import { expect, test } from "vitest";
import { getModel } from "./model";

test("defaults to a Google model with the AI_MODEL id", () => {
  const model = getModel({ AI_MODEL: "gemini-x", NODE_ENV: "test" }) as unknown as {
    provider: string;
    modelId: string;
  };
  expect(model.provider).toContain("google");
  expect(model.modelId).toBe("gemini-x");
});

test("throws on an unknown provider", () => {
  expect(() => getModel({ AI_PROVIDER: "skynet", AI_MODEL: "x", NODE_ENV: "test" })).toThrow(/Unknown AI_PROVIDER/);
});

test("throws when AI_MODEL is missing", () => {
  expect(() => getModel({ AI_PROVIDER: "google", NODE_ENV: "test" })).toThrow(/AI_MODEL/);
});
