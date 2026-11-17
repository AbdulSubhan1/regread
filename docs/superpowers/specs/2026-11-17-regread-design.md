# RegRead — design

Date: 2026-11-17. Status: approved by Abdul (name, packages, Tesseract fallback, short design).

## 1. Why

Abdul is building portfolio products. RegRead shows two things employers care about: using an AI vision model safely in a real form flow, and keeping per-country rules as data instead of code. It is a standalone demo app first. Later, Brokwise (`~/brokwise`, his demo insurance broker) uses it to auto-fill its car form.

The idea came from work at a former employer. Nothing here may reuse, copy or name that employer's code. Everything is built from scratch.

## 2. What it does

1. The visitor uploads a photo or PDF of a vehicle registration card, or picks **"No card? Try a sample"**.
2. An AI vision model reads the card and returns one fixed shape for every country.
3. A **region profile** checks each field. A field that fails a check is left empty and flagged. A field the model was unsure about is filled but highlighted.
4. The visitor sees the filled form with "From your card, please check", edits anything, and presses **Confirm**. Nothing counts as submitted before that.

## 3. Goals, non-goals, anti-goals

Goals
- Live on Vercel. "Try a sample" works for UAE, Pakistan, Saudi Arabia and Qatar.
- Adding a country = adding one profile file (data), no change to the checker.
- Accuracy per field and per country, measured on the sample set and written down.
- Runs on free tiers only (Gemini free tier, Upstash free, Vercel Hobby).

Non-goals
- Reading owner name, address, ID number or any personal field.
- Storing images or results. User accounts. Arabic/Urdu UI (UI is English only; Arabic and Urdu appear on the sample cards).
- Brokwise integration in this phase (it is a separate, later PR, only after Abdul says yes).

Anti-goals (failure even if it "works")
- A field silently filled with a wrong value that looks checked.
- Sample cards that look like a real government card (real emblems, real layouts, real people).
- Burning the shared free Gemini quota through demo clicks.

## 4. Constraints

- Personal accounts only: GitHub `AbdulSubhan1`; Vercel, Upstash under subbidurrani@gmail.com. No Anthropic key.
- Free tiers only. Default model: Google Gemini Flash Lite (`AI_PROVIDER=google`, `AI_MODEL=gemini-3.5-flash-lite`), same as JobFit.
- npm packages approved: `next`, `react`, `react-dom`, `ai`, `@ai-sdk/google`, `zod`, `@upstash/redis`, `tesseract.js`; dev: `typescript`, `tailwindcss`, `@tailwindcss/turbopack`, `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss`, `vitest`, `@playwright/test`, `tsx`, `@types/*`. Anything else: ask first.
- Tailwind mobile-first (base, then `md:`/`lg:`), never `max-*`.
- Familiar form UX: inline errors, focus on the first bad field, no error-summary box.
- Git: feature branches + PRs, merge only on Abdul's yes. Never skip hooks. Never `next build` while that folder's dev server runs. E2E runs only when asked.
- Every engineering decision goes on an engineering-highlights KB page.

## 5. Approaches considered

| Approach | Trade-off | Verdict |
| --- | --- | --- |
| **AI vision model + rule profiles** (chosen) | Reads mixed Arabic/English/Urdu layouts it has never seen; rules catch its mistakes. Needs a network call and free quota. | Chosen |
| OCR (Tesseract) + regex per field | Free, offline, private. Breaks on Arabic-heavy cards, tilt, blur and any new layout; needs per-layout field positions. | Kept only as the fallback |
| Per-country hand-trained template matching | Most accurate on one known layout. Needs real cards (we have none) and new code per layout. | Rejected |

## 6. The design

### 6.1 Stack and layout
Next.js 16 App Router + Tailwind 4 + TypeScript strict, same versions as JobFit. One page (`/`) plus one API route (`POST /api/scan`). Folders follow JobFit: `app/`, `components/ui/`, `components/<feature>/`, `constants/`, `lib/<area>/`, `docs/`.

### 6.2 AI adapter
`lib/ai/model.ts` copies JobFit's one-file pattern: a provider map keyed by `AI_PROVIDER`, model from `AI_MODEL`. Only the Google provider is installed; adding another is one map line plus its package.

### 6.3 Reading the card
- Browser: images are shrunk to max 1600 px long side, JPEG ~0.85, with a canvas (no package). PDFs are sent as-is (max 4 MB). Accepted: JPEG, PNG, WebP, PDF. HEIC is not supported (the message says so).
- `POST /api/scan` (multipart): validate type/size (400) → take a daily run (429) → call the model with `generateObject` and a Zod schema → run the profile check → return JSON. Bytes stay in memory; request bodies, images and model output are never logged.
- The model gets the image plus a prompt that lists the four profiles' hints (labels, plate formats, calendars) and says: read only vehicle fields, ignore owner details, return `null` when a field is not visible, give each field a confidence 0–1, return dates exactly as printed plus which calendar they are in.
- The schema has **no owner fields**, so personal data cannot come back even if the model reads it.

AI output shape (Zod):
```ts
{
  country: "AE" | "PK" | "SA" | "QA" | "unknown",
  fields: {
    make, model, year, chassisNumber, plate, registrationDate, engineNumber:
      { value: string | null, confidence: number }
  },
  registrationDateCalendar: "gregorian" | "hijri" | "unknown"
}
```

Result shape returned to the page (and later to Brokwise):
```ts
{
  country: "AE" | "PK" | "SA" | "QA" | null,
  source: "ai" | "ocr",
  fields: Record<FieldName, { value: string | null; confidence: number; status: "ok" | "filled" | "check" | "flagged" | "empty"; reason?: string }>,
  raw: { fields: Record<FieldName, string | null>; registrationDateCalendar: "gregorian" | "hijri" | "unknown" }
}
```
`raw` holds what the model read, before checks. The page uses it only to re-run the checks when the visitor switches country; it is never put into a field, so a rejected value cannot reappear as filled. (Builder's call.)

### 6.4 Region profiles
One file per country in `lib/profiles/<code>.ts`, each a plain data object of type `RegionProfile`. One generic checker (`lib/profiles/check.ts`) applies any profile. Profile fields:
- `code`, `name`, `languages`, `promptHints` (what the card's labels look like).
- `plate`: list of `{ pattern, format }` — regexes on a normalised string (upper-case, Arabic-Indic digits to Western, spaces/dashes collapsed) and the canonical output format.
- `chassis`: allowed kinds, from a shared set: `vin` (17 chars, A–Z/0–9, no I/O/Q; the check digit is **not** enforced because most non-North-American VINs don't use it) and `jp-frame` (Japanese frame number, e.g. `NZE141-1234567`: 2–6 letters/digits model code, dash, 5–8 digits).
- `dates`: `order` (`DMY`) and `calendars` (`gregorian`, plus `hijri` for Saudi).

The four profiles:
- **UAE (Mulkiya)**: Arabic + English. Plate = emirate + code + number, e.g. `Dubai A 12345` / `Abu Dhabi 1 12345` (emirate from a list of 7, code 1–2 letters or digits, number 1–5 digits). Chassis: VIN. Dates DD/MM/YYYY.
- **Pakistan (registration book or smart card)**: English + Urdu. Plate = city letters + number, e.g. `LEA-1234`, `ICT-123`, `BKF-786`, with optional year suffix (`LEA-1234-19` → kept). Chassis: VIN **or** Japanese frame number. Dates DD/MM/YYYY.
- **Saudi Arabia (Istimara)**: mostly Arabic. Plate = 3 letters + 4 digits (Latin form of the plate letters, e.g. `ABJ 1234`; Arabic plate letters are mapped to their official Latin pair). Chassis: VIN. Dates often Hijri → converted to Gregorian.
- **Qatar (Istimara)**: Arabic + English. Plate = digits only, 1–6 digits. Chassis: VIN. Dates DD/MM/YYYY.

Shared field checks (all profiles):
- `year`: 4 digits, 1950 … next year.
- `registrationDate`: parse with the profile's order; if `hijri`, convert to Gregorian; must be a real date, not in the future, not before 1950. Output ISO `YYYY-MM-DD`.
- `make`: trimmed, title-cased; if it isn't in a list of ~60 common makes, status `check` (not flagged — rare makes exist).
- `model`, `engineNumber`: trimmed, length 1–40; no format rule.
- A field that fails its rule → `value: null`, `status: "flagged"`, `reason` in plain words ("This doesn't look like a 17-character VIN").

**Hijri conversion** uses the built-in `Intl.DateTimeFormat` with `islamic-umalqura` (the Saudi civil calendar): estimate the Gregorian date, then step day by day until the formatted Hijri parts match. No package.

**Country**: the model's guess picks the profile. The page shows "Card from: [country]" and the visitor can switch it; switching re-runs the checks in the browser on the raw values (profiles are shared code), no new AI call. If the model says `unknown`, the page asks the visitor to pick.

### 6.5 Confidence and confirmation
- `ok` (green ✓, "Matches the format") only for a field that **passed a format rule** (year, date, chassis, plate, make in the list) with confidence ≥ 0.7. `model` and `engineNumber` have no format rule, so they never show ✓: at best they are filled with no badge. (Builder's call, so a made-up value never looks checked.)
- `confidence < 0.7` → `status: "check"`: filled, amber highlight, "Please check this one".
- Failed rule → `flagged`: empty, red note with the reason.
- Every filled field sits under a "From your card, please check" banner. All fields are editable.
- **Confirm** validates required fields (make, model, year, chassis number, plate) with the same profile rules: inline error under each bad field, focus on the first one, no summary box. On success the page shows the confirmed JSON ("This is what a form like Brokwise's would receive").

### 6.6 Fallback: browser OCR
When `/api/scan` returns 429 (daily limit) or 502 (AI failed / free quota used), the page loads `tesseract.js` on demand (dynamic import, English traineddata only, to stay small) and reads the photo in the browser. `lib/ocr/extract.ts` pulls fields from the text with the profile rules (VIN/frame regex, plate patterns, date patterns, year, make list). Every OCR field is `status: "check"`, confidence 0.4, and the page says "Read on your device. Less accurate, please check every field." OCR works on photos only; for a PDF the page asks for a photo instead. Saudi cards (mostly Arabic) will read poorly in fallback; this is accepted and written down.

### 6.7 Free tier use and limits
- Per visitor: 10 uploads per UTC day (`AI_DAILY_LIMIT`). Visitor = HMAC-SHA-256 of the client IP (from `x-forwarded-for`) with a secret `VISITOR_SALT` env var, so the hash can't be reversed by trying every address; the raw IP is never stored. The builder generates the salt and sets it in Vercel without printing it. (Builder's call.) Same Upstash counter code as JobFit (`incr` + expiry, refund when the AI fails, memory counter in local dev, error in production without Redis).
- Whole app: 200 AI calls per UTC day (`AI_GLOBAL_DAILY_LIMIT`). RegRead uses **the same Gemini key as JobFit** (Abdul's choice), so they share one free daily quota; 200 leaves JobFit most of it, and one heavy visitor can't stop the demo for everyone.
- Samples: results cached in Redis per `sampleId + AI_MODEL` for 7 days. A cached sample costs no AI call and no visitor run. The sample is sent by id, not by upload; the server reads the image from `public/samples/`.
- Redis keys are prefixed `regread:` so the free Upstash database can be shared with other projects.

### 6.8 Privacy
- Only vehicle fields are requested and returned (6.3).
- The image is processed in memory and never written to disk, Redis or logs. Errors log only status codes.
- When the visitor uploads their own card (not a sample), the upload area shows, in plain words: "Your photo is sent to Google's Gemini AI to read it. On the free plan Google may use it to improve its products. We don't keep it. Not comfortable? Try a sample card instead." The visitor must tick "I understand" before the first upload.

### 6.9 Sample cards
- `samples/templates/<country>.html`: four **made-up** card designs, each with Arabic or Urdu labels where they fit, a fake person (name present on the card but never read), a fake car and a fake VIN/frame number in a valid format. A large diagonal **"SPECIMEN · DEMO"** watermark. No real emblems, logos, coats of arms or real layouts — plain geometric shapes and invented colours.
- `samples/cards.ts`: the list of 16 samples (4 countries × clean, blurry, tilted, photo-of-a-screen) with the ground truth for each field.
- `scripts/render-samples.ts`: Playwright opens each template, fills it from `cards.ts`, applies the variant (CSS blur; rotate + perspective on a table-like background; moiré lines + glare + slight skew for the screen look), and saves `public/samples/<id>.jpg` (committed, ~100–200 KB each).
- The "Try a sample" picker shows the 16 thumbnails grouped by country with a difficulty label.

### 6.10 Accuracy measurement
`scripts/measure.ts` runs the real scan pipeline (model + profile check, not HTTP) on all 16 samples with ~5 s between calls (free-tier rate limit), compares each field with the ground truth after normalisation, and writes `docs/accuracy.md`: per-field and per-country tables, plus the model id and date. Run by hand, not in CI. There is no accuracy gate before going live: measure once, do at most one prompt-tuning round if any field is under 70%, measure again, and publish the honest numbers. (Builder's call; each run costs 16 free calls.)

### 6.11 UI
One page, mobile-first:
```
[RegRead]  Read a car registration card in seconds
[ Drop a photo or PDF ]   or   [ No card? Try a sample ▾ ]
  (privacy note + "I understand" — own uploads only)

After a scan (phone: stacked; lg: two columns)
┌ card preview ┐  From your card, please check      Card from: [UAE ▾]
│              │  Make      [Toyota        ] ✓
│              │  Model     [Land Cruiser  ] ⚠ Please check this one
└──────────────┘  Chassis   [              ] ✕ Doesn't look like a 17-character VIN
                  ...
                  [ Confirm details ]
```
UI uses a small set of its own components in `components/ui/` (Button, Field, FileDrop, Badge, Select), like JobFit. No UI libraries, no icon packages.

### 6.12 Tests
- Vitest: each profile (valid/invalid plates per country), VIN rule, frame-number rule (Pakistan accepts, others reject), Hijri → Gregorian (known pairs, e.g. 1 Ramadan 1445 = 2024-03-11), DMY parsing, year bounds, the checker's flag/check statuses, the OCR extractor on sample OCR text, the daily limit, and the scan route with a mocked model (`ai/test` `MockLanguageModel`).
- Playwright: one spec for the sample flow and confirm-with-error flow. Written now; run only when Abdul asks.
- `npm run check` = typecheck + lint + format check. A pre-commit hook runs it.

### 6.13 Deliverables
- Repo `~/regread`, GitHub `AbdulSubhan1/regread` (public, like his other portfolio repos), feature branch + PR.
- Vercel project `regread` under the personal account → `regread.vercel.app`.
- `README.md`, `docs/kb/engineering-highlights.md` (AI vision over OCR+rules, region profiles, confidence threshold + confirmation, privacy, free-tier use, Hijri without a package, sample cards), `docs/accuracy.md`, `docs/case-study.md` (short portfolio note).
- Later, only after Abdul's yes: a small Brokwise PR adding "Scan your registration card" to its car form, and a portfolio entry.

## 7. Setup only Abdul can do
- Add `GOOGLE_GENERATIVE_AI_API_KEY` to the RegRead Vercel project (the same free key JobFit uses — Abdul's choice). The builder never reads or prints key values.
- Connect the existing Upstash database to the RegRead Vercel project (Vercel → Storage → connect), or create a new free one.

## 8. Left to the builder
- Exact visual style (colours, type), within the familiar-patterns rule.
- Exact make list, prompt wording, Playwright filter values for the hard variants.
- File-level structure inside the folders above.
