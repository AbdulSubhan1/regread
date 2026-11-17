import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { checkField } from "@/lib/profiles/check";
import { PROFILES } from "@/lib/profiles";
import { FIELDS } from "@/lib/profiles/types";
import { SAMPLES } from "./cards";

const now = new Date("2026-11-17T00:00:00Z");

test("16 samples: 4 per country, one of each variant", () => {
  expect(SAMPLES).toHaveLength(16);
  for (const code of ["AE", "PK", "SA", "QA"]) {
    const variants = SAMPLES.filter((s) => s.country === code).map((s) => s.variant);
    expect(variants.sort()).toEqual(["blurry", "clean", "screen", "tilted"]);
  }
});

test("Pakistan has frame-number cars and Saudi Arabia prints Hijri dates and Arabic-Indic years", () => {
  expect(SAMPLES.filter((s) => s.country === "PK" && s.truth.chassisNumber?.includes("-"))).toHaveLength(2);
  expect(
    SAMPLES.filter((s) => s.country === "SA").every(
      (s) => Number(s.card.date.slice(-4)) > 1400 && /[٠-٩]/.test(s.card.year),
    ),
  ).toBe(true);
});

test.each(SAMPLES.map((s) => [s.id, s] as const))("%s: what the card prints checks out to its ground truth", (_, s) => {
  const raw: Record<string, string> = {
    make: s.card.make,
    model: s.card.model,
    year: s.card.year,
    chassisNumber: s.card.chassis,
    plate: s.card.plate,
    registrationDate: s.card.date,
    engineNumber: s.card.engine,
  };
  for (const f of FIELDS) {
    if (s.truth[f] === null) {
      expect(raw[f], `${f} should be blank on the card`).toBe("");
      continue;
    }
    expect(checkField(f, raw[f], PROFILES[s.country], "unknown", now), f).toEqual({ value: s.truth[f] });
  }
});

test.each(SAMPLES.map((s) => s.id))("%s.jpg is rendered and under 300 KB", (id) => {
  const file = path.join(process.cwd(), "public", "samples", `${id}.jpg`);
  expect(existsSync(file)).toBe(true);
  expect(statSync(file).size).toBeLessThan(300 * 1024);
});
