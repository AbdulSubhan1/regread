"use client";

import { useState } from "react";
import { COPY, UPLOAD_ERRORS } from "@/constants/copy";
import { Alert, Checkbox, FileDrop } from "@/components/ui";
import { track } from "@/lib/client/pulse";

type Props = { onFile: (file: File) => void; error: string | null; onError: (message: string) => void };

export function UploadPanel({ onFile, error, onError }: Props) {
  const [consent, setConsent] = useState(false);
  return (
    <section aria-labelledby="upload-title" className="min-w-0 rounded-box border border-line bg-card p-4 md:p-6">
      <h2 id="upload-title" className="text-lg font-bold">
        Upload your card
      </h2>
      <p className="mt-1 text-sm text-ink-soft">A photo or PDF of a UAE, Pakistan, Saudi or Qatar registration card.</p>
      <div className="mt-4 space-y-4">
        <Alert tone="info">{COPY.privacy}</Alert>
        <Checkbox
          id="consent"
          checked={consent}
          onChange={(on) => {
            setConsent(on);
            if (on) track("consent_ticked");
          }}
        >
          {COPY.consent}
        </Checkbox>
        <div
          onClickCapture={(e) => {
            if (!consent) {
              e.preventDefault();
              track("upload_refused", "consent");
              onError(UPLOAD_ERRORS.consent);
              document.getElementById("consent")?.focus();
            }
          }}
        >
          <FileDrop
            id="card-file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            disabled={!consent}
            onFile={onFile}
            title="Drop a photo or PDF here"
            hint="or tap to choose · photo up to 4 MB, PDF up to 1 MB"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-flag">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
