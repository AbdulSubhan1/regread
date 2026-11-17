import { expect, test } from "vitest";
import { extractFromText } from "./extract";

const pkText = `MOTOR VEHICLE REGISTRATION
Pakistan demo registration book page
Registration No. LEA 1234 رجسٹریشن نمبر
Owner's Name Sample Person Five مالک کا نام
Maker Toyota
Model Corolla
Year of Manufacture 2014
Chassis No. NZE141-9876543
Engine No. 1NZ-4455667
Date of Registration 14/02/2015`;

const aeText = `VEHICLE LICENCE رخصة مركبة
Traffic Plate No. Dubai A 12345 رقم اللوحة
Owner Sample Person One المالك
Make Toyota الصانع
Model Land Cruiser الطراز
Model Year 2021 سنة الصنع
Chassis No. SMPAE21LC70012345 رقم الشاصي
Engine No. 1VD-7712345 رقم المحرك
Reg. Date 05/03/2021 تاريخ التسجيل`;

test("reads a Pakistani card and works out the country from the frame number and plate", () => {
  const r = extractFromText(pkText, null);
  expect(r.country).toBe("PK");
  expect(r.source).toBe("ocr");
  expect(r.fields.plate.value).toBe("LEA-1234");
  expect(r.fields.chassisNumber.value).toBe("NZE141-9876543");
  expect(r.fields.engineNumber.value).toBe("1NZ-4455667");
  expect(r.fields.year.value).toBe("2014");
  expect(r.fields.registrationDate.value).toBe("2015-02-14");
  expect(r.fields.make.value).toBe("Toyota");
  expect(r.fields.model.value).toBe("Corolla");
});

test("reads a UAE card, dropping the Arabic labels from values", () => {
  const r = extractFromText(aeText, null);
  expect(r.country).toBe("AE");
  expect(r.fields.plate.value).toBe("DUBAI A 12345");
  expect(r.fields.model.value).toBe("Land Cruiser");
  expect(r.fields.chassisNumber.value).toBe("SMPAE21LC70012345");
  expect(r.fields.registrationDate.value).toBe("2021-03-05");
});

test("every OCR value asks to be checked", () => {
  const r = extractFromText(aeText, "AE");
  const filled = Object.values(r.fields).filter((f) => f.value !== null);
  expect(filled.length).toBe(7);
  expect(filled.every((f) => f.status === "check")).toBe(true);
});

test("the owner's name never appears in the result", () => {
  expect(JSON.stringify(extractFromText(pkText, null))).not.toContain("Sample Person");
});

test("a VIN without a label is still found", () => {
  const r = extractFromText("some text\nSMPAE21LC70012345\nmore", "AE");
  expect(r.fields.chassisNumber.value).toBe("SMPAE21LC70012345");
});

test("text that isn't a card gives empty fields and no country", () => {
  const r = extractFromText("Hello world\nShopping list: milk, eggs", null);
  expect(r.country).toBeNull();
  expect(Object.values(r.fields).every((f) => f.status === "empty")).toBe(true);
});

// What English-only Tesseract really produced on the UAE sample: Arabic labels come back as junk words
const aeOcrJunk = `Traffic Plate No. Dubai A 12345 sll 8)
Owner Sample Person One alll
Make Toyota EE
Model Land Cruiser Shall
Model Year 2021 gall ds
Chassis No. SMPAE21LC70012345 olall pd)
Engine No. 1VD-7712345 Ayonall By
Reg. Date 05/03/2021 Jaa`;

test("junk words after a value are dropped, field by field", () => {
  const r = extractFromText(aeOcrJunk, null);
  expect(r.country).toBe("AE");
  expect(r.fields.plate.value).toBe("DUBAI A 12345");
  expect(r.fields.make.value).toBe("Toyota");
  expect(r.fields.year.value).toBe("2021");
  expect(r.fields.chassisNumber.value).toBe("SMPAE21LC70012345");
  expect(r.fields.engineNumber.value).toBe("1VD-7712345");
  expect(r.fields.registrationDate.value).toBe("2021-03-05");
});

test("a model keeps at most three words", () => {
  expect(extractFromText(aeOcrJunk, "AE").fields.model.value).toBe("Land Cruiser Shall");
  expect(extractFromText("Model LX 570 abc def", "QA").fields.model.value).toBe("LX 570 abc");
});

test("a labelled line with nothing of the right shape stays empty", () => {
  expect(extractFromText("Model Year gall ds", "AE").fields.year.status).toBe("empty");
});
