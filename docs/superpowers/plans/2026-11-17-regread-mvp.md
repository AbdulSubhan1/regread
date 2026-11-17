# RegRead MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A live Next.js app that reads a vehicle registration card (photo/PDF) with Gemini, checks the fields with data-only region profiles (AE, PK, SA, QA), and lets the visitor edit and confirm.

**Architecture:** One page + one route (`POST /api/scan`). The route calls Gemini through a one-file adapter for a fixed Zod shape, then a generic checker applies the country's profile. Profiles, checks and OCR extraction are pure shared code, so the browser can re-check on country switch and run the Tesseract fallback.

**Tech Stack:** Next.js 16.4.6, React 19.3, Tailwind 4.3.3, TypeScript strict, `ai` v7 + `@ai-sdk/google`, Zod 4, `@upstash/redis`, `tesseract.js`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-regread-design.md`

## Global Constraints

- Work in `/home/abdul-subhan/regread-worktrees/mvp` on branch `feature/mvp`. Never write in `~/regread` (main).
- Only these packages: `next@16.4.6`, `react@19.3.0`, `react-dom@19.3.0`, `ai`, `@ai-sdk/google`, `zod`, `@upstash/redis`, `tesseract.js`; dev: `typescript`, `tailwindcss@4.3.3`, `@tailwindcss/turbopack@4.3.3`, `eslint@9`, `eslint-config-next@16.4.6`, `prettier`, `prettier-plugin-tailwindcss`, `vitest`, `@playwright/test`, `tsx`, `@types/node`, `@types/react`, `@types/react-dom`. Versions match `~/jobfit/package.json`.
- Env: `AI_PROVIDER=google`, `AI_MODEL=gemini-3.5-flash-lite`, `GOOGLE_GENERATIVE_AI_API_KEY`, `AI_DAILY_LIMIT=10`, `AI_GLOBAL_DAILY_LIMIT=200`, `VISITOR_SALT`, Upstash `UPSTASH_REDIS_REST_URL/TOKEN` or `KV_REST_API_URL/TOKEN`. Never print or commit a secret value.
- Redis keys start with `regread:`.
- Confidence threshold `0.7`. Year range `1950 … currentYear+1`. Images shrunk to 1600 px long side, JPEG 0.85. Upload max 4 MB. Accepted: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
- Tailwind mobile-first, never `max-*`. RTL-safe classes (`ms-/me-/ps-/pe-/text-start`). No inline `style`, no UI/icon libraries.
- Forms: inline error under the field, focus the first bad field, no error summary.
- Never log request bodies, images or model output; log status codes only.
- UI copy (verbatim): banner "From your card, please check"; low-confidence "Please check this one"; OCR note "Read on your device. Less accurate, please check every field."; privacy note "Your photo is sent to Google's Gemini AI to read it. On the free plan Google may use it to improve its products. We don't keep it. Not comfortable? Try a sample card instead."; sample button "No card? Try a sample"; watermark "SPECIMEN · DEMO".
- Commits: conventional messages ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never `--no-verify`. Never `next build` while this folder's dev server runs.
- Next 16 differs from training data: read `node_modules/next/dist/docs/` before writing route/page code. AI SDK v7: check `node_modules/ai` for the structured-output API (`generateObject` or `generateText` + `Output.object`).

## Review Focus

1. A photo that isn't a registration card (selfie, receipt): the model returns nulls / `unknown`. Expect 200 with all fields empty, `country: null`, and the page asking "Which country is this card from?" (Task 4 test, Task 9 state).
2. Arabic-Indic digits (`١٢٣٤`) and Persian digits in plate, year and date: normalised before checks (Task 2 test).
3. Model labels a Hijri date as `gregorian` or `unknown` (e.g. `15/03/1440`): for a profile that allows Hijri, a year 1300–1500 is read as Hijri; elsewhere it is flagged (Task 3 test).
4. The model call throws or returns a shape that fails Zod: 502 `provider`, visitor run refunded, page falls back to OCR (Task 6 test).
5. HEIC, a 6 MB file, or an empty form: 400 with a plain message shown inline at the upload area (Task 6 test, Task 9).

---

### Task 1: Scaffold, tooling and AI adapter

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.gitignore`, `vitest.config.mts`, `playwright.config.ts`, `.env.example`, `.githooks/pre-commit`, `AGENTS.md`, `CLAUDE.md`, `app/layout.tsx`, `app/page.tsx` (placeholder), `app/globals.css`, `lib/ai/model.ts`
- Test: `lib/ai/model.test.ts`

**Interfaces:**
- Produces: `getModel(env?: Record<string, string | undefined>): LanguageModel`; scripts `dev` (`next dev -p 3621`), `build`, `test`, `test:e2e`, `typecheck`, `lint`, `format`, `format:check`, `check` (= typecheck + lint + format:check), `prepare` (`git config core.hooksPath .githooks`), `samples` (`tsx scripts/render-samples.ts`), `measure` (`tsx scripts/measure.ts`).

- [ ] **Step 1:** Copy config shapes from `~/jobfit` (`tsconfig.json`, `vitest.config.mts`, `.prettierrc`, `eslint.config.mjs` minus next-intl and opengraph exception, `playwright.config.ts` with port 3621). `next.config.ts` = JobFit's without the next-intl wrapper. Write `package.json` with the Global Constraints packages and `npm install`.
- [ ] **Step 2:** `.githooks/pre-commit` runs `npm run check && npm test`; `chmod +x`; `npm run prepare`.
- [ ] **Step 3:** `AGENTS.md`: a short coding standard adapted from JobFit's (folders, single source of truth, privacy, UI library rules, mobile-first, RTL-safe classes; no i18n section). `CLAUDE.md` = `@AGENTS.md` + "read the design spec first".
- [ ] **Step 4:** Write `lib/ai/model.test.ts`: defaults to google; unknown provider throws `Unknown AI_PROVIDER`; missing `AI_MODEL` throws. Run `npx vitest run lib/ai` → FAIL.
- [ ] **Step 5:** `lib/ai/model.ts`: JobFit's file with only the `google` entry. Run → PASS.
- [ ] **Step 6:** `npm run check` → no errors. Commit `chore: scaffold RegRead (Next 16, Tailwind 4, AI adapter)`.

### Task 2: Normalising and shared field rules

**Files:**
- Create: `lib/rules/normalise.ts`, `lib/rules/chassis.ts`, `lib/rules/dates.ts`, `lib/rules/hijri.ts`, `lib/rules/year.ts`
- Test: `lib/rules/*.test.ts`

**Interfaces:**
- Produces:
  - `toWesternDigits(s: string): string` (Arabic-Indic U+0660–0669 and Persian U+06F0–06F9 → 0–9)
  - `normaliseToken(s: string): string` (westernise, upper-case, trim, collapse whitespace/dashes/dots to single space)
  - `type ChassisKind = "vin" | "jp-frame"`; `checkChassis(raw: string, kinds: ChassisKind[]): { value: string } | { reason: string }` (VIN output without spaces; frame output `CODE-DIGITS`)
  - `parseYear(raw: string, now: Date): number | null`
  - `type Calendar = "gregorian" | "hijri"`; `parseDmy(raw: string): { d: number; m: number; y: number } | null` (separators `/ - .` and spaces)
  - `hijriToGregorian(y: number, m: number, d: number): Date | null` (Umm al-Qura via `Intl.DateTimeFormat("en-u-ca-islamic-umalqura")`; estimate `Date.UTC(622,6,16) + ((y-1)*354.367 + (m-1)*29.53 + d-1) days`, then step ±1 day up to 40 times until parts match; null if the Hijri day doesn't exist)
  - `toIsoDate(date: Date): string`

- [ ] **Step 1:** Tests:
  - `toWesternDigits("١٢٣٤ ۵۶")` → `"1234 56"`
  - VIN: `"JTMHV05J604123456"` ok; `"JTMHV05J6O4123456"` (has O) → reason contains `17-character VIN`; 16 chars → reason; `"jtm hv05j6 04123456"` → `JTMHV05J604123456`
  - Frame: `checkChassis("NZE141-1234567", ["vin","jp-frame"])` → `NZE141-1234567`; `"nze141 1234567"` → `NZE141-1234567`; same with `["vin"]` → reason; `"NZE141-12"` → reason
  - Year with now=2026-11-17: `"2019"`→2019, `"1949"`→null, `"2027"`→2027, `"2028"`→null, `"٢٠١٩"`→2019
  - `parseDmy("05/03/2021")` → `{d:5,m:3,y:2021}`; `"5-3-2021"` same; `"31/02/2021"` → still parses (validity is checked later); `"2021/03/05"` → null
  - Hijri: `(1445,9,1)` → `2024-03-11`; `(1440,1,1)` → `2018-09-11`; `(1446,1,1)` → `2024-07-07`; `(1445,13,1)` → null
- [ ] **Step 2:** Run `npx vitest run lib/rules` → FAIL.
- [ ] **Step 3:** Implement the five files with the signatures above.
- [ ] **Step 4:** Run → PASS. Commit `feat(rules): shared normalising, VIN/frame, year, date and Hijri rules`.

### Task 3: Region profiles and the checker

**Files:**
- Create: `lib/profiles/types.ts`, `lib/profiles/ae.ts`, `lib/profiles/pk.ts`, `lib/profiles/sa.ts`, `lib/profiles/qa.ts`, `lib/profiles/index.ts`, `lib/profiles/makes.ts`, `lib/profiles/check.ts`
- Test: `lib/profiles/check.test.ts`, `lib/profiles/plates.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `FIELDS = ["make","model","year","chassisNumber","plate","registrationDate","engineNumber"] as const`; `type FieldName`
  - `type CountryCode = "AE" | "PK" | "SA" | "QA"`
  - `type RegionProfile = { code: CountryCode; name: string; cardName: string; languages: string[]; promptHints: string[]; plate: { pattern: RegExp; format: (m: RegExpMatchArray) => string; example: string }[]; plateHelp: string; chassis: ChassisKind[]; calendars: Calendar[] }` (patterns run on `normaliseToken` output)
  - `PROFILES: Record<CountryCode, RegionProfile>`, `COUNTRY_CODES`
  - `type RawRead = { country: CountryCode | "unknown"; fields: Record<FieldName, { value: string | null; confidence: number }>; registrationDateCalendar: Calendar | "unknown" }`
  - `type FieldStatus = "ok" | "filled" | "check" | "flagged" | "empty"`; `type CheckedField = { value: string | null; confidence: number; status: FieldStatus; reason?: string }`
  - `type ScanResult = { country: CountryCode | null; source: "ai" | "ocr"; fields: Record<FieldName, CheckedField>; raw: { fields: Record<FieldName, string | null>; registrationDateCalendar: Calendar | "unknown" } }`
  - `checkRead(read: RawRead, country: CountryCode | null, source: "ai" | "ocr", now?: Date): ScanResult`
  - `checkField(name: FieldName, raw: string, profile: RegionProfile, calendar: Calendar | "unknown", now: Date): { value: string } | { reason: string }` (also used by confirm validation)
  - `CONFIDENCE_THRESHOLD = 0.7` in `constants/config.ts`

Status rules (spec 6.4/6.5), first match wins:
1. raw null/blank → `empty`
2. rule failed → `flagged`, value null, reason
3. confidence < 0.7 → `check`
4. make not in `MAKES` → `check` (reason "Not a make we know, please check")
5. `model` or `engineNumber` → `filled` (no badge: no format rule, so never ✓)
6. otherwise (year, registrationDate, chassisNumber, plate, known make) → `ok`

`country === null` → every field keeps its raw value as `check` with reason `Pick the card's country to check this`.
Date rule: if calendar is `hijri`, or calendar is not `gregorian` and the profile allows Hijri and 1300 ≤ y ≤ 1500 → Hijri; else Gregorian. Must be a real date, ≥ 1950-01-01, ≤ now. Output ISO.

Plates (canonical output):
- AE: emirates `DUBAI|ABU DHABI|SHARJAH|AJMAN|UMM AL QUWAIN|RAS AL KHAIMAH|FUJAIRAH` (+ short forms `AD|AUH|DXB|SHJ|AJM|UAQ|RAK|FUJ`), code `[A-Z0-9]{1,2}`, number `\d{1,5}` → `Dubai A 12345`
- PK: `^([A-Z]{2,4}) ?(\d{1,4})(?: ?(\d{2}))?$` → `LEA-1234` / `LEA-1234-19`
- SA: `^([A-Z]) ?([A-Z]) ?([A-Z]) ?(\d{1,4})$` → `ABJ 1234`; Arabic plate letters mapped first via a table in `sa.ts` (ا→A, ب→B, ح→J, د→D, ر→R, س→S, ص→X, ط→T, ع→E, ق→G, ك→K, ل→L, م→Z, ن→N, هـ/ه→H, و→U, ى/ي→V)
- QA: `^\d{1,6}$` → digits

- [ ] **Step 1:** `plates.test.ts`: per country 3 valid (incl. one with odd spacing/lower case) and 2 invalid; SA Arabic `"ا ب ح ١٢٣٤"` → `ABJ 1234`; AE `"dxb a 12345"` → `Dubai A 12345`.
- [ ] **Step 2:** `check.test.ts`:
  - PK frame number `NZE141-1234567` → `ok`; same raw under AE → `flagged`, value null, reason mentions VIN
  - SA `registrationDate "01/09/1445"`, calendar `hijri` → `2024-03-11`, `ok`; calendar `unknown` → same; QA with `"01/09/1445"` → `flagged`
  - confidence 0.5 on a valid VIN → `check`; `model` at 0.95 → `filled`; make `"toyota"` → `Toyota`, `ok`; make `"Zastava"` → `check`
  - future date → `flagged`; null raw → `empty`
  - `country: null` → all non-null fields `check` with the pick-country reason
  - `raw` block carries the model's strings untouched
- [ ] **Step 3:** Run `npx vitest run lib/profiles` → FAIL. Implement. Run → PASS.
- [ ] **Step 4:** Commit `feat(profiles): AE, PK, SA, QA region profiles and generic checker`.

### Task 4: Reading a card with the model

**Files:**
- Create: `lib/ai/schema.ts`, `lib/ai/prompt.ts`, `lib/scan/read-card.ts`, `lib/scan/scan-card.ts`
- Test: `lib/scan/scan-card.test.ts`

**Interfaces:**
- Consumes: `getModel`, `PROFILES`, `checkRead`, `RawRead`.
- Produces:
  - `ReadSchema` (Zod, matches `RawRead`; confidence `z.number().min(0).max(1)`, each value `z.string().nullable()`)
  - `buildSystemPrompt(): string` (from every profile's `promptHints`, plate examples, calendars; "only vehicle fields, ignore owner name/address/ID; null when unreadable; dates exactly as printed")
  - `type CardFile = { data: Uint8Array; mediaType: string }`
  - `readCard(file: CardFile, opts?: { model?: LanguageModel; signal?: AbortSignal }): Promise<RawRead>` (image → image part, PDF → file part; `maxRetries: 1`)
  - `scanCard(file: CardFile, opts?): Promise<ScanResult>` = readCard → `checkRead(read, read.country === "unknown" ? null : read.country, "ai")`

- [ ] **Step 1:** Test with `MockLanguageModel` from `ai/test` returning fixed JSON: UAE read → `country "AE"`, plate formatted; all-null `unknown` read (Review Focus 1) → `country: null`, all `empty`; mock that throws → `scanCard` rejects; mock returning invalid JSON → rejects. Assert the prompt sent to the mock contains no word "name" request for owner (assert it contains `ignore` and `owner`).
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit `feat(scan): read cards with a vision model into a fixed shape`.

### Task 5: Limits, visitor id and sample cache

**Files:**
- Create: `lib/limits/daily.ts`, `lib/limits/visitor.ts`, `lib/cache/sample-cache.ts`, `lib/store/redis.ts`, `constants/config.ts` (extend)
- Test: `lib/limits/daily.test.ts`, `lib/limits/visitor.test.ts`, `lib/cache/sample-cache.test.ts`

**Interfaces:**
- Produces:
  - `getStore(): Store` in `lib/store/redis.ts` — JobFit's counter pattern extended with `getJson<T>(k)`, `setJson(k, v, ttlSeconds)`; memory store in dev/test, throws in production without Redis env
  - `takeRun(visitor: string): Promise<{ ok: boolean; reason?: "visitor" | "global"; remaining: number; resetAt: number }>` — increments the global key `regread:global:<date>` and visitor key `regread:runs:<visitor>:<date>`; over either limit → not ok (and undo both increments)
  - `takeGlobalRun(): Promise<boolean>`; `refundRun(visitor?: string): Promise<void>`
  - `visitorId(headers: Headers, salt?: string): string` — HMAC-SHA-256(salt, first `x-forwarded-for` IP or `"local"`), hex, first 32 chars; throws in production without `VISITOR_SALT`
  - `getCachedSample(id: string): Promise<ScanResult | null>`, `setCachedSample(id: string, r: ScanResult): Promise<void>` — key `regread:sample:<id>:<AI_MODEL>`, TTL 604800
- [ ] **Step 1:** Tests: 10 runs ok, 11th `reason "visitor"`; global limit 3 (env) across 3 visitors → 4th `reason "global"`; refund restores one; same IP+salt → same id, different salt → different id, id doesn't contain the IP; cache round-trip and miss.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit `feat(limits): per-visitor and global daily AI limits, sample cache`.

### Task 6: `POST /api/scan`

**Files:**
- Create: `app/api/scan/route.ts`, `lib/scan/samples-server.ts`
- Test: `app/api/scan/route.test.ts`

**Interfaces:**
- Consumes: Tasks 4, 5, 7 (`SAMPLES` ids; until Task 7 lands use the type only).
- Produces: request multipart with either `file` (File) or `sampleId` (string). Responses (all `Cache-Control: no-store`):
  - 200 `ScanResult` (+ header `X-Runs-Remaining` for uploads)
  - 400 `{ error: "missing" | "type" | "size" | "sample" }`
  - 429 `{ error: "limit", reason: "visitor" | "global", resetAt }`
  - 502 `{ error: "provider" }`
- `readSampleFile(id: string): Promise<CardFile | null>` reads `public/samples/<id>.jpg` from disk.

Order: parse form → validate (400) → sample: cache hit → 200; miss → `takeGlobalRun` (429 global) → scan → cache → 200 / failure 502 (no visitor run used). Upload: `takeRun(visitorId)` (429) → `scanCard` → 200; on error `refundRun` + 502. `maxDuration = 60`. Log only `AI provider error <status>`.

- [ ] **Step 1:** Tests (mock `scanCard` with `vi.mock`): missing → 400 `missing`; HEIC → 400 `type`; 6 MB → 400 `size`; unknown sampleId → 400 `sample`; upload ok → 200 and `X-Runs-Remaining`; 11th upload → 429 visitor; scan throws → 502 and the run was refunded (next 10 uploads still allowed); sample twice → model called once.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit `feat(api): scan route with limits, refunds and sample cache`.

### Task 7: Made-up sample cards

**Files:**
- Create: `samples/cards.ts`, `samples/templates/ae.html`, `samples/templates/pk.html`, `samples/templates/sa.html`, `samples/templates/qa.html`, `samples/variants.css`, `scripts/render-samples.ts`, `public/samples/*.jpg` (16)
- Test: `samples/cards.test.ts`

**Interfaces:**
- Produces: `type Variant = "clean" | "blurry" | "tilted" | "screen"`; `type Sample = { id: string; country: CountryCode; variant: Variant; label: string; card: Record<string, string>; truth: Record<FieldName, string | null> }` (`card` holds the printed text incl. fake owner name and the printed date — Hijri for SA; `truth` holds canonical checker output); `SAMPLES: Sample[]` (ids `ae-clean`, `ae-blurry`, …).
- Card content: each country uses 4 different fake cars (so variants aren't identical); fake names like "Sample Person"; VINs in valid format from made-up WMIs; PK has 2 frame-number cars; SA dates printed in Hijri. Templates use `{{key}}` placeholders, invented colours and plain shapes, bilingual labels (Arabic for AE/SA/QA, Urdu for PK), and a diagonal "SPECIMEN · DEMO" watermark. No emblems or real layouts.
- Variants: `blurry` = CSS `filter: blur(1.6px)`; `tilted` = card rotated ~8° with perspective on a wood-like gradient background; `screen` = moiré repeating-linear-gradient overlay + glare radial gradient + slight skew + lower contrast. (Inline styles are allowed in `samples/` HTML; it isn't app UI — add `samples/**` to ESLint ignores.)
- [ ] **Step 1:** Test: 16 samples, 4 per country, 4 variants each; every sample's `truth` passes `checkField` under its own profile (fake VINs/plates valid); every `public/samples/<id>.jpg` exists and is < 300 KB.
- [ ] **Step 2:** Run → FAIL. Write templates, cards and the render script (Playwright chromium, viewport 1400×1000, `page.setContent`, screenshot JPEG quality 80). Run `npm run samples`. Run test → PASS.
- [ ] **Step 3:** Look at 4 renders (one per country) with the Read tool to check they read well and carry the watermark. Commit `feat(samples): 16 made-up specimen cards rendered with Playwright`.

### Task 8: OCR text extraction (fallback logic)

**Files:**
- Create: `lib/ocr/extract.ts`
- Test: `lib/ocr/extract.test.ts`

**Interfaces:**
- Consumes: `PROFILES`, `checkRead`, `MAKES`, Task 2 rules.
- Produces: `extractFromText(text: string, country: CountryCode | null): ScanResult` — finds VIN (`[A-HJ-NPR-Z0-9]{17}`), frame number, plate via every candidate profile's patterns on each line, dates (`\d{1,2}[/.-]\d{1,2}[/.-]\d{4}`), 4-digit year near "model"/"year", make from `MAKES`, model = the token(s) after make on the same line, engine near "engine". Country null → pick the profile whose plate pattern matches; else null. Builds a `RawRead` with confidence 0.4 and runs `checkRead(..., "ocr")`, then forces every non-empty status to `check`.
- [ ] **Step 1:** Tests with hand-written OCR-like text for PK (frame number, `LEA 1234`), AE (VIN, `Dubai A 12345`), noise lines with an owner name (not returned anywhere): expected fields, `source: "ocr"`, all `check`.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit `feat(ocr): extract card fields from OCR text with the profile rules`.

### Task 9: UI kit and the scan page

**Files:**
- Create: `components/ui/{button,field,select,checkbox,file-drop,badge,alert,index}.tsx|ts`, `components/ui/styles.ts`, `components/scan/{scan-app,upload-panel,sample-picker,result-form,confirmed-view}.tsx`, `lib/client/shrink-image.ts`, `lib/client/ocr-fallback.ts`, `lib/scan/confirm.ts`, `app/page.tsx`, `app/globals.css`, `e2e/scan.spec.ts`
- Test: `lib/scan/confirm.test.ts`

**Interfaces:**
- Consumes: `/api/scan`, `checkRead`, `checkField`, `extractFromText`, `SAMPLES`, `PROFILES`.
- Produces:
  - `REQUIRED_FIELDS = ["make","model","year","chassisNumber","plate"]`
  - `validateConfirm(values: Record<FieldName, string>, country: CountryCode | null): Partial<Record<FieldName | "country", string>>` (required + `checkField` rules; error text in plain words)
  - `shrinkImage(file: File): Promise<Blob>` (canvas, 1600 px, JPEG 0.85; PDFs returned as-is)
  - `ocrFallback(file: Blob, country: CountryCode | null): Promise<ScanResult>` (dynamic `import("tesseract.js")`, `eng` only)
- Page states: idle → scanning (progress text) → result (editable form, country select re-runs `checkRead` on `raw`) → confirmed (JSON). Upload of own file needs the "I understand" tick first (privacy note verbatim). Badges: `ok` ✓ "Matches the format", `check` amber "Please check this one", `flagged` red with reason, `filled`/`empty` no badge. 429/502 → OCR fallback with the OCR note; PDF + fallback → inline "The AI is busy. Please upload a photo of the card instead." 400 → inline message at the upload area.
- Layout: phone stacked; `lg:` two columns (preview | form). Sample picker groups 16 thumbnails by country with variant label.
- [ ] **Step 1:** `confirm.test.ts`: empty make → error; PK plate `LEA-1234` ok; AE plate `LEA-1234` → error; frame number under SA → error; no country → `country` error. Run → FAIL; implement `confirm.ts`; → PASS.
- [ ] **Step 2:** Build UI components (each root `data-ui="<Name>"`), then `components/scan/*` and `app/page.tsx`.
- [ ] **Step 3:** Write `e2e/scan.spec.ts` (pick `pk-clean` sample → fields filled → clear plate → Confirm → inline error and focus on plate → fix → confirmed JSON). Do **not** run it unless Abdul asks.
- [ ] **Step 4:** Start the preview (`preview_start` with a `.claude/launch.json` entry on port 3621), pick one sample per country, check the form, the country switch, confirm errors and focus, phone width (375) and desktop. Screenshot.
- [ ] **Step 5:** `npm run check && npm test` → pass. Commit `feat(ui): scan page with samples, review form, confirm and OCR fallback`.

### Task 10: Accuracy measurement

**Files:**
- Create: `scripts/measure.ts`, `docs/accuracy.md`
- Interfaces: Consumes `SAMPLES`, `readSampleFile`, `scanCard`. Compares `result.fields[f].value` with `truth[f]` (case/space-insensitive), counts empty-vs-null as correct.
- [ ] **Step 1:** Local `.env.local` gets `GOOGLE_GENERATIVE_AI_API_KEY` copied from `~/jobfit/.env.local` with a shell pipe that never prints it (`grep '^GOOGLE_GENERATIVE_AI_API_KEY=' ~/jobfit/.env.local >> .env.local`), plus `AI_PROVIDER`/`AI_MODEL`.
- [ ] **Step 2:** `npm run measure` (5 s gap). It writes per-field and per-country tables, overall %, model id and date to `docs/accuracy.md`.
- [ ] **Step 3:** If a field is under 70%, one prompt-tuning round, re-measure. Commit `docs(accuracy): measured field accuracy on the 16 sample cards`.

### Task 11: README, KB and case study

**Files:**
- Create: `README.md`, `docs/kb/README.md`, `docs/kb/engineering-highlights.md`, `docs/case-study.md`
- [ ] **Step 1:** README: what it is, live link, how it works (diagram in text), run locally, env table, scripts, accuracy summary linking `docs/accuracy.md`, privacy, limits.
- [ ] **Step 2:** Engineering highlights in the format of `~/monitor/docs/kb/engineering-highlights.md`: each item = what, why it matters in a real business, where it lives, how it's tested (with test counts). Items: AI vision over OCR+rules; region profiles as data; confidence threshold + "ok only for rule fields"; user confirmation; raw values for re-check; Hijri via Intl (no package); privacy (no owner fields in schema, in-memory only, consent note, salted visitor hash); free tier (shared key, per-visitor + global caps, refunds, sample cache); OCR fallback; made-up specimen cards + accuracy measurement.
- [ ] **Step 3:** `docs/case-study.md`: problem, approach, results (accuracy numbers), what I'd do next. ~300 words.
- [ ] **Step 4:** Commit `docs: README, engineering highlights and case study`.

### Task 12: Publish and deploy

- [ ] **Step 1:** `gh repo create AbdulSubhan1/regread --public --source ~/regread`; push `main` and `feature/mvp`; open PR `feature/mvp → main` (body ends with the Claude Code line).
- [ ] **Step 2:** Create the Vercel project `regread` under the personal account linked to the repo. Generate `VISITOR_SALT` with `openssl rand -hex 32 | vercel env add VISITOR_SALT production preview` (never echoed); add `AI_PROVIDER`, `AI_MODEL`, `AI_DAILY_LIMIT`, `AI_GLOBAL_DAILY_LIMIT`.
- [ ] **Step 3:** Ask Abdul to add `GOOGLE_GENERATIVE_AI_API_KEY` and connect Upstash in the Vercel dashboard.
- [ ] **Step 4:** Verify the preview deployment: each country's sample works, one confirm flow. Merge to `main` (→ production) only after Abdul says yes; then verify `regread.vercel.app` the same way.
