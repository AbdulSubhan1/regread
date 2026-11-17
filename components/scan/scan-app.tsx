"use client";

import { useEffect, useState } from "react";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from "@/constants/config";
import { COPY, UPLOAD_ERRORS } from "@/constants/copy";
import { Picture } from "@/components/ui";
import { ocrFallback } from "@/lib/client/ocr-fallback";
import { shrinkImage } from "@/lib/client/shrink-image";
import { checkRead } from "@/lib/profiles/check";
import { FIELDS, type CountryCode, type FieldName, type RawRead, type ScanResult } from "@/lib/profiles/types";
import { keepEdits, nextStep, type ApiAnswer } from "@/lib/scan/client-flow";
import { validateConfirm, type ConfirmErrors } from "@/lib/scan/confirm";
import { ConfirmedView } from "./confirmed-view";
import { ResultForm } from "./result-form";
import { SamplePicker } from "./sample-picker";
import { UploadPanel } from "./upload-panel";

type Phase =
  | { kind: "idle" }
  | { kind: "scanning"; preview: string; message: string }
  | { kind: "result"; preview: string; result: ScanResult }
  | { kind: "confirmed"; preview: string; data: Record<string, string | null> };

const emptyValues = () => Object.fromEntries(FIELDS.map((f) => [f, ""])) as Record<FieldName, string>;
const valuesOf = (r: ScanResult) =>
  Object.fromEntries(FIELDS.map((f) => [f, r.fields[f].value ?? ""])) as Record<FieldName, string>;

/** Rebuilds what the model read, so a country switch re-checks it without another AI call. */
function rawReadOf(r: ScanResult): RawRead {
  return {
    country: r.country ?? "unknown",
    fields: Object.fromEntries(
      FIELDS.map((f) => [f, { value: r.raw.fields[f], confidence: r.fields[f].confidence }]),
    ) as RawRead["fields"],
    registrationDateCalendar: r.raw.registrationDateCalendar,
  };
}

async function callScan(body: FormData): Promise<ApiAnswer> {
  try {
    const res = await fetch("/api/scan", { method: "POST", body });
    if (res.ok) return { ok: true, result: (await res.json()) as ScanResult };
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    return { ok: false, status: res.status, error: json.error };
  } catch {
    return { ok: false, status: 0 };
  }
}

export function ScanApp() {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [values, setValues] = useState(emptyValues);
  const [edited, setEdited] = useState<Partial<Record<FieldName, boolean>>>({});
  const [errors, setErrors] = useState<ConfirmErrors>({});

  // The visitor's own photo only ever lives in this tab as a blob URL
  const preview = phase.kind === "idle" ? null : phase.preview;
  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function showResult(previewUrl: string, result: ScanResult) {
    setValues(valuesOf(result));
    setEdited({});
    setErrors({});
    setPhase({ kind: "result", preview: previewUrl, result });
  }

  // getImage runs inside the try: fetching a sample image can fail too when the network is down
  async function fallback(previewUrl: string, getImage: () => Promise<Blob>) {
    setPhase({ kind: "scanning", preview: previewUrl, message: "The AI is busy, reading the card on your device…" });
    try {
      showResult(previewUrl, await ocrFallback(await getImage(), null));
    } catch {
      setPhase({ kind: "idle" });
      setUploadError(COPY.network);
    }
  }

  function handle(answer: ApiAnswer, previewUrl: string, isPdf: boolean, getImage: () => Promise<Blob>) {
    const step = nextStep(answer, isPdf);
    if (step.kind === "result") return showResult(previewUrl, step.result);
    if (step.kind === "ocr") return fallback(previewUrl, getImage);
    setPhase({ kind: "idle" });
    setUploadError(step.message);
  }

  async function onFile(file: File) {
    setUploadError(null);
    if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return setUploadError(UPLOAD_ERRORS.heic);
    if (!(ACCEPTED_TYPES as readonly string[]).includes(file.type)) return setUploadError(UPLOAD_ERRORS.type);
    const isPdf = file.type === "application/pdf";
    const body = isPdf ? file : await shrinkImage(file);
    if (body.size > MAX_UPLOAD_BYTES) return setUploadError(UPLOAD_ERRORS.size);

    const previewUrl = isPdf ? "" : URL.createObjectURL(body);
    setPhase({ kind: "scanning", preview: previewUrl, message: "Reading your card…" });
    const form = new FormData();
    form.append("file", body, isPdf ? file.name : "card.jpg");
    handle(await callScan(form), previewUrl, isPdf, async () => body);
  }

  async function onSample(id: string) {
    setUploadError(null);
    const previewUrl = `/samples/${id}.jpg`;
    setPhase({ kind: "scanning", preview: previewUrl, message: "Reading the sample card…" });
    const form = new FormData();
    form.append("sampleId", id);
    handle(await callScan(form), previewUrl, false, () => fetch(previewUrl).then((r) => r.blob()));
  }

  // Re-checks what was read with the new country's rules; fields the visitor typed in keep their value
  function onCountry(country: CountryCode | null) {
    if (phase.kind !== "result") return;
    const result = checkRead(rawReadOf(phase.result), country, phase.result.source);
    setValues(keepEdits(valuesOf(result), values, edited));
    setErrors({});
    setPhase({ kind: "result", preview: phase.preview, result });
  }

  function onConfirm() {
    if (phase.kind !== "result") return;
    const country = phase.result.country;
    const check = validateConfirm(values, country);
    setErrors(check.errors);
    const first = Object.keys(check.errors)[0];
    if (first) {
      document.getElementById(`field-${first}`)?.focus();
      return;
    }
    setPhase({
      kind: "confirmed",
      preview: phase.preview,
      data: { country, ...check.values, readBy: phase.result.source === "ai" ? "ai" : "device-ocr" },
    });
  }

  function restart() {
    setPhase({ kind: "idle" });
    setUploadError(null);
  }

  if (phase.kind === "idle") {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <UploadPanel onFile={onFile} error={uploadError} onError={setUploadError} />
        <SamplePicker onPick={onSample} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <div className="min-w-0 lg:sticky lg:top-6 lg:self-start">
        <div className="relative overflow-hidden rounded-box border border-line bg-card">
          {phase.preview ? (
            <Picture src={phase.preview} alt="The card being read" width={1056} height={686} priority />
          ) : (
            <p className="p-6 text-sm text-ink-soft">PDF card</p>
          )}
          {phase.kind === "scanning" && (
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 animate-scan bg-brand shadow-lg" />
          )}
        </div>
      </div>
      <div className="min-w-0">
        {phase.kind === "scanning" && (
          <div role="status" className="rounded-box border border-line bg-card p-6 text-sm font-semibold">
            {phase.message}
          </div>
        )}
        {phase.kind === "result" && (
          <ResultForm
            fields={phase.result.fields}
            values={values}
            edited={edited}
            country={phase.result.country}
            source={phase.result.source}
            errors={errors}
            onChange={(name, value) => {
              setValues((v) => ({ ...v, [name]: value }));
              setEdited((e) => ({ ...e, [name]: true }));
            }}
            onCountry={onCountry}
            onConfirm={onConfirm}
            onRestart={restart}
          />
        )}
        {phase.kind === "confirmed" && <ConfirmedView data={phase.data} onRestart={restart} />}
      </div>
    </div>
  );
}
