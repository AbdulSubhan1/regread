import { expect, test } from "vitest";
import { COPY, UPLOAD_ERRORS } from "@/constants/copy";
import type { FieldName, ScanResult } from "@/lib/profiles/types";
import { keepEdits, nextStep } from "./client-flow";

const result = { country: "PK" } as ScanResult;

test("a good answer shows the result", () => {
  expect(nextStep({ ok: true, result }, false)).toEqual({ kind: "result", result });
});

test.each([429, 500, 502, 504, 0])("status %i on a photo falls back to reading on the device", (status) => {
  expect(nextStep({ ok: false, status }, false)).toEqual({ kind: "ocr" });
});

test("a busy AI on a PDF asks for a photo", () => {
  expect(nextStep({ ok: false, status: 502 }, true)).toEqual({ kind: "error", message: COPY.pdfBusy });
});

test("a 400 shows the server's reason", () => {
  expect(nextStep({ ok: false, status: 400, error: "size" }, false)).toEqual({
    kind: "error",
    message: UPLOAD_ERRORS.size,
  });
});

test("a 413 from the platform is a size error, not a file-type error", () => {
  expect(nextStep({ ok: false, status: 413 }, false)).toEqual({ kind: "error", message: UPLOAD_ERRORS.size });
});

test("any other status gets a plain 'try again', never 'file type not supported'", () => {
  expect(nextStep({ ok: false, status: 404 }, false)).toEqual({ kind: "error", message: COPY.generic });
});

test("a re-check keeps what the visitor typed and refreshes the rest", () => {
  const blank = { make: "", model: "", year: "", chassisNumber: "", plate: "", registrationDate: "", engineNumber: "" };
  const next: Record<FieldName, string> = { ...blank, plate: "LEA-1234", year: "2014" };
  const current: Record<FieldName, string> = { ...blank, plate: "LEB-9999", year: "1999" };
  expect(keepEdits(next, current, { plate: true })).toEqual({ ...blank, plate: "LEB-9999", year: "2014" });
});

test("a PDF that is too big or too long says so", () => {
  expect(nextStep({ ok: false, status: 400, error: "pdfSize" }, true)).toEqual({
    kind: "error",
    message: UPLOAD_ERRORS.pdfSize,
  });
  expect(nextStep({ ok: false, status: 400, error: "pages" }, true)).toEqual({
    kind: "error",
    message: UPLOAD_ERRORS.pages,
  });
  expect(UPLOAD_ERRORS.pdfSize).toMatch(/1 MB/);
  expect(UPLOAD_ERRORS.pages).toMatch(/2 pages/);
});
