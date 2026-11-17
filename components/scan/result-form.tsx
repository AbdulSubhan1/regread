"use client";

import { COPY, FIELD_LABELS } from "@/constants/copy";
import { Alert, Badge, Button, SelectField, TextField } from "@/components/ui";
import { PROFILES } from "@/lib/profiles";
import { COUNTRY_CODES, FIELDS, type CheckedField, type CountryCode, type FieldName } from "@/lib/profiles/types";
import type { ConfirmErrors } from "@/lib/scan/confirm";

type Props = {
  fields: Record<FieldName, CheckedField>;
  values: Record<FieldName, string>;
  edited: Partial<Record<FieldName, boolean>>;
  country: CountryCode | null;
  source: "ai" | "ocr";
  errors: ConfirmErrors;
  onChange: (name: FieldName, value: string) => void;
  onCountry: (country: CountryCode | null) => void;
  onConfirm: () => void;
  onRestart: () => void;
};

const MONO: FieldName[] = ["year", "chassisNumber", "plate", "engineNumber"];

function Hint({ field, edited }: { field: CheckedField; edited?: boolean }) {
  // Once the visitor has typed in a field, it's theirs: the badge about what we read no longer applies
  if (edited) return null;
  if (field.status === "ok") return <Badge tone="ok">{COPY.okBadge}</Badge>;
  if (field.status === "check") return <Badge tone="check">{field.reason ?? COPY.lowConfidence}</Badge>;
  if (field.status === "flagged") return <Badge tone="flag">{field.reason}</Badge>;
  if (field.status === "empty") return <span className="text-xs text-ink-soft">{COPY.notFound}</span>;
  return null;
}

const toneOf = (field: CheckedField, edited?: boolean) =>
  edited
    ? "none"
    : field.status === "ok"
      ? "ok"
      : field.status === "check"
        ? "check"
        : field.status === "flagged"
          ? "flag"
          : "none";

export function ResultForm(props: Props) {
  const { fields, values, edited, country, source, errors } = props;
  return (
    <form
      noValidate
      aria-labelledby="result-title"
      onSubmit={(e) => {
        e.preventDefault();
        props.onConfirm();
      }}
      className="min-w-0 animate-rise rounded-box border border-line bg-card p-4 md:p-6"
    >
      <h2 id="result-title" className="text-lg font-bold">
        {COPY.banner}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Every field can be edited. Nothing is sent anywhere until you confirm.
      </p>
      {source === "ocr" && (
        <div className="mt-4">
          <Alert tone="check">{COPY.ocrNote}</Alert>
        </div>
      )}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <SelectField
            id="field-country"
            label="Card from"
            value={country ?? ""}
            placeholder="Which country is this card from?"
            options={COUNTRY_CODES.map((c) => ({ value: c, label: `${PROFILES[c].name} — ${PROFILES[c].cardName}` }))}
            onChange={(v) => props.onCountry(v ? (v as CountryCode) : null)}
            error={errors.country}
          />
          <p className="mt-1.5 text-xs text-ink-soft">
            Changing the country checks what was read again with that country&apos;s rules.
          </p>
        </div>
        {FIELDS.map((name) => (
          <TextField
            key={name}
            id={`field-${name}`}
            label={FIELD_LABELS[name]}
            value={values[name]}
            type={name === "registrationDate" ? "date" : "text"}
            inputMode={name === "year" ? "numeric" : "text"}
            mono={MONO.includes(name)}
            tone={toneOf(fields[name], edited[name])}
            onChange={(v) => props.onChange(name, v)}
            error={errors[name]}
            hint={<Hint field={fields[name]} edited={edited[name]} />}
          />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <Button type="submit">Confirm details</Button>
        <Button variant="secondary" onClick={props.onRestart}>
          Scan another card
        </Button>
      </div>
    </form>
  );
}
