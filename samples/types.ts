import type { CountryCode, FieldName } from "@/lib/profiles/types";

export type Variant = "clean" | "blurry" | "tilted" | "screen";

/** A made-up specimen card: `card` is what's printed (incl. a fake owner), `truth` what the checker should return. */
export type Sample = {
  id: string;
  country: CountryCode;
  variant: Variant;
  label: string;
  card: Record<string, string>;
  truth: Record<FieldName, string | null>;
};
