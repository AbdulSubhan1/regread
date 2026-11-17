"use client";

import { useState } from "react";
import { COPY } from "@/constants/copy";
import { Button, Tile } from "@/components/ui";
import { PROFILES } from "@/lib/profiles";
import { COUNTRY_CODES, type CountryCode } from "@/lib/profiles/types";
import { SAMPLES } from "@/samples/cards";

export function SamplePicker({ onPick, disabled }: { onPick: (id: string) => void; disabled?: boolean }) {
  const [country, setCountry] = useState<CountryCode>("AE");
  return (
    <section aria-labelledby="samples-title" className="min-w-0 rounded-box border border-line bg-card p-4 md:p-6">
      <h2 id="samples-title" className="text-lg font-bold">
        {COPY.sampleButton}
      </h2>
      <p className="mt-1 text-sm text-ink-soft">
        Made-up specimen cards with fake people and cars. Some are blurry, tilted or photographed off a screen.
      </p>
      <div role="group" aria-label="Country" className="mt-4 flex flex-wrap gap-2">
        {COUNTRY_CODES.map((code) => (
          <Button
            key={code}
            variant={code === country ? "primary" : "secondary"}
            aria-pressed={code === country}
            onClick={() => setCountry(code)}
          >
            {PROFILES[code].name}
          </Button>
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-3">
        {SAMPLES.filter((s) => s.country === country).map((s) => (
          <li key={s.id} className="min-w-0">
            <Tile
              image={`/samples/${s.id}.jpg`}
              alt={`${PROFILES[s.country].name} sample card, ${s.label}`}
              label={s.label}
              disabled={disabled}
              onClick={() => onPick(s.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
