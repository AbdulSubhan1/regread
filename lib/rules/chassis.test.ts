import { expect, test } from "vitest";
import { checkChassis } from "./chassis";

test("accepts a 17-character VIN", () => {
  expect(checkChassis("JTMHV05J604123456", ["vin"])).toEqual({ value: "JTMHV05J604123456" });
});

test("joins a VIN read with spaces and lower case", () => {
  expect(checkChassis("jtm hv05j6 04123456", ["vin"])).toEqual({ value: "JTMHV05J604123456" });
});

test("rejects a VIN containing O, I or Q", () => {
  expect(checkChassis("JTMHV05J6O4123456", ["vin"])).toEqual({ reason: expect.stringContaining("17-character VIN") });
});

test("rejects a 16-character VIN", () => {
  expect(checkChassis("JTMHV05J60412345", ["vin"])).toHaveProperty("reason");
});

test("accepts a Japanese frame number when the profile allows it", () => {
  expect(checkChassis("NZE141-1234567", ["vin", "jp-frame"])).toEqual({ value: "NZE141-1234567" });
  expect(checkChassis("nze141 1234567", ["vin", "jp-frame"])).toEqual({ value: "NZE141-1234567" });
});

test("rejects a frame number when only VINs are allowed", () => {
  expect(checkChassis("NZE141-1234567", ["vin"])).toEqual({ reason: expect.stringContaining("VIN") });
});

test("rejects a frame number with too few digits", () => {
  expect(checkChassis("NZE141-12", ["vin", "jp-frame"])).toHaveProperty("reason");
});

test("the reason mentions frame numbers when they are allowed", () => {
  expect(checkChassis("XYZ", ["vin", "jp-frame"])).toEqual({ reason: expect.stringContaining("frame number") });
});
