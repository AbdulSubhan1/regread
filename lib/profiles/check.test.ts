import { describe, expect, test } from "vitest";
import { checkField, checkRead } from "./check";
import { FIELDS, type FieldName, type RawRead } from "./types";
import { PROFILES } from "./index";

const now = new Date("2026-11-17T00:00:00Z");

function read(values: Partial<Record<FieldName, string>>, opts: Partial<RawRead> = {}, confidence = 0.95): RawRead {
  const fields = Object.fromEntries(
    FIELDS.map((f) => [f, { value: values[f] ?? null, confidence: values[f] ? confidence : 0 }]),
  ) as RawRead["fields"];
  return { country: "PK", fields, registrationDateCalendar: "gregorian", ...opts };
}

describe("chassis numbers", () => {
  test("a Pakistani card may carry a Japanese frame number", () => {
    const r = checkRead(read({ chassisNumber: "NZE141-1234567" }), "PK", "ai", now);
    expect(r.fields.chassisNumber).toMatchObject({ value: "NZE141-1234567", status: "ok" });
  });

  test("a UAE card may not: the field is emptied and flagged", () => {
    const r = checkRead(read({ chassisNumber: "NZE141-1234567" }), "AE", "ai", now);
    expect(r.fields.chassisNumber).toMatchObject({ value: null, status: "flagged" });
    expect(r.fields.chassisNumber.reason).toContain("VIN");
  });
});

describe("registration dates", () => {
  test("a Saudi Hijri date is converted to Gregorian", () => {
    const r = checkRead(
      read({ registrationDate: "01/09/1445" }, { registrationDateCalendar: "hijri" }),
      "SA",
      "ai",
      now,
    );
    expect(r.fields.registrationDate).toMatchObject({ value: "2024-03-11", status: "ok" });
  });

  test("a Saudi date with an unknown calendar and a Hijri-looking year is read as Hijri", () => {
    const r = checkRead(
      read({ registrationDate: "01/09/1445" }, { registrationDateCalendar: "unknown" }),
      "SA",
      "ai",
      now,
    );
    expect(r.fields.registrationDate.value).toBe("2024-03-11");
  });

  test("a Saudi date the model called Gregorian but with year 1445 is still read as Hijri", () => {
    const r = checkRead(read({ registrationDate: "01/09/1445" }), "SA", "ai", now);
    expect(r.fields.registrationDate.value).toBe("2024-03-11");
  });

  test("a Qatari card has no Hijri dates, so 1445 is flagged", () => {
    const r = checkRead(read({ registrationDate: "01/09/1445" }), "QA", "ai", now);
    expect(r.fields.registrationDate.status).toBe("flagged");
  });

  test("a Gregorian DD/MM/YYYY date becomes ISO", () => {
    const r = checkRead(read({ registrationDate: "05/03/2021" }), "AE", "ai", now);
    expect(r.fields.registrationDate).toMatchObject({ value: "2021-03-05", status: "ok" });
  });

  test("a date in the future is flagged", () => {
    const r = checkRead(read({ registrationDate: "05/03/2027" }), "AE", "ai", now);
    expect(r.fields.registrationDate.status).toBe("flagged");
  });

  test("31 February is flagged", () => {
    const r = checkRead(read({ registrationDate: "31/02/2021" }), "AE", "ai", now);
    expect(r.fields.registrationDate.status).toBe("flagged");
  });
});

describe("statuses", () => {
  test("a valid value the model was unsure about is filled but marked check", () => {
    const r = checkRead(read({ chassisNumber: "JTMHV05J604123456" }, {}, 0.5), "AE", "ai", now);
    expect(r.fields.chassisNumber).toMatchObject({ value: "JTMHV05J604123456", status: "check" });
  });

  test("model and engine number never show ok, because they have no format rule", () => {
    const r = checkRead(read({ model: "Corolla", engineNumber: "2ZR1234567" }), "PK", "ai", now);
    expect(r.fields.model).toMatchObject({ value: "Corolla", status: "filled" });
    expect(r.fields.engineNumber.status).toBe("filled");
  });

  test("a known make gets its usual spelling and ok", () => {
    const r = checkRead(read({ make: "toyota" }), "PK", "ai", now);
    expect(r.fields.make).toMatchObject({ value: "Toyota", status: "ok" });
    expect(checkRead(read({ make: "mercedes" }), "PK", "ai", now).fields.make.value).toBe("Mercedes-Benz");
  });

  test("an unknown make is kept but marked check", () => {
    const r = checkRead(read({ make: "zastava" }), "PK", "ai", now);
    expect(r.fields.make).toMatchObject({ value: "Zastava", status: "check" });
  });

  test("a field the model couldn't read is empty", () => {
    expect(checkRead(read({}), "PK", "ai", now).fields.plate).toMatchObject({ value: null, status: "empty" });
  });

  test("a year out of range is flagged", () => {
    expect(checkRead(read({ year: "1949" }), "PK", "ai", now).fields.year.status).toBe("flagged");
  });

  test("with no country, values are kept and every one asks for the country", () => {
    const r = checkRead(read({ plate: "LEA-1234", make: "Toyota" }), null, "ai", now);
    expect(r.country).toBeNull();
    expect(r.fields.plate).toMatchObject({ value: "LEA-1234", status: "check" });
    expect(r.fields.plate.reason).toMatch(/country/);
    expect(r.fields.model.status).toBe("empty");
  });

  test("raw values are passed through untouched for re-checking", () => {
    const r = checkRead(
      read({ chassisNumber: "NZE141-1234567" }, { registrationDateCalendar: "hijri" }),
      "AE",
      "ai",
      now,
    );
    expect(r.raw.fields.chassisNumber).toBe("NZE141-1234567");
    expect(r.raw.registrationDateCalendar).toBe("hijri");
    expect(r.source).toBe("ai");
  });
});

test("checkField applies one rule on its own (used by the confirm step)", () => {
  expect(checkField("plate", "LEA-1234", PROFILES.PK, "unknown", now)).toEqual({ value: "LEA-1234" });
  expect(checkField("plate", "LEA-1234", PROFILES.AE, "unknown", now)).toHaveProperty("reason");
  expect(checkField("model", "x".repeat(41), PROFILES.AE, "unknown", now)).toHaveProperty("reason");
});
