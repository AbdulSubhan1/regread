import { normaliseToken } from "./normalise";

export type ChassisKind = "vin" | "jp-frame";

// ISO 3779: 17 characters, never I, O or Q. The check digit is only mandatory in North America, so it isn't enforced.
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
// Japanese-market cars (common in Pakistan) carry a frame number instead: model code, dash, serial, e.g. NZE141-1234567.
const JP_FRAME = /^([A-Z0-9]{2,6}) (\d{5,8})$/;

export function checkChassis(raw: string, kinds: ChassisKind[]): { value: string } | { reason: string } {
  const token = normaliseToken(raw);
  const joined = token.replace(/ /g, "");
  if (kinds.includes("vin") && VIN.test(joined)) return { value: joined };
  if (kinds.includes("jp-frame")) {
    const m = token.match(JP_FRAME);
    if (m && /[A-Z]/.test(m[1])) return { value: `${m[1]}-${m[2]}` };
  }
  return {
    reason: kinds.includes("jp-frame")
      ? "This doesn't look like a 17-character VIN or a frame number like NZE141-1234567"
      : "This doesn't look like a 17-character VIN",
  };
}
