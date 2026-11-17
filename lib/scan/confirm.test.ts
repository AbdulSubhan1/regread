import { expect, test } from "vitest";
import type { FieldName } from "@/lib/profiles/types";
import { validateConfirm } from "./confirm";

const now = new Date("2026-11-17T00:00:00Z");
const pk: Record<FieldName, string> = {
  make: "toyota",
  model: "Corolla",
  year: "2014",
  chassisNumber: "NZE141-9876543",
  plate: "lea 1234",
  registrationDate: "2015-02-14",
  engineNumber: "",
};

test("a good Pakistani card confirms with clean values", () => {
  const { errors, values } = validateConfirm(pk, "PK", now);
  expect(errors).toEqual({});
  expect(values).toEqual({ ...pk, make: "Toyota", plate: "LEA-1234", engineNumber: null });
});

test("an empty make is an error", () => {
  expect(validateConfirm({ ...pk, make: " " }, "PK", now).errors).toEqual({ make: "Enter the make" });
});

test("a Pakistani plate is wrong for a UAE card", () => {
  const { errors } = validateConfirm({ ...pk, chassisNumber: "SMPAE21LC70012345" }, "AE", now);
  expect(Object.keys(errors)).toEqual(["plate"]);
});

test("a frame number is wrong for a Saudi card", () => {
  const { errors } = validateConfirm({ ...pk, plate: "ABJ 1234" }, "SA", now);
  expect(Object.keys(errors)).toEqual(["chassisNumber"]);
});

test("no country is an error before anything else", () => {
  const { errors } = validateConfirm({ ...pk, make: "" }, null, now);
  expect(Object.keys(errors)).toEqual(["country", "make"]);
});

test("a date in the future is an error; an empty date is allowed", () => {
  expect(validateConfirm({ ...pk, registrationDate: "2027-01-01" }, "PK", now).errors).toHaveProperty(
    "registrationDate",
  );
  expect(validateConfirm({ ...pk, registrationDate: "" }, "PK", now).errors).toEqual({});
});

test("errors come in form order so the first one can take focus", () => {
  const { errors } = validateConfirm({ ...pk, make: "", year: "", plate: "" }, "PK", now);
  expect(Object.keys(errors)).toEqual(["make", "year", "plate"]);
});
