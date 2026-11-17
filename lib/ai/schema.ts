import { z } from "zod";
import { COUNTRY_CODES, FIELDS, type FieldName } from "@/lib/profiles/types";

const Field = z.object({
  value: z.string().nullable().describe("Exactly as printed on the card, or null if not visible"),
  confidence: z.number().min(0).max(1).describe("How sure you are this value is read correctly, 0 to 1"),
});

// No owner fields on purpose: the model can't return a name, address or ID even if it reads one.
export const ReadSchema = z.object({
  country: z.enum([...COUNTRY_CODES, "unknown"]),
  fields: z.object(Object.fromEntries(FIELDS.map((f) => [f, Field])) as Record<FieldName, typeof Field>),
  registrationDateCalendar: z.enum(["gregorian", "hijri", "unknown"]),
});
