# Engineering highlights

What RegRead does beyond "it works", and why. RegRead reads a vehicle registration card (photo or PDF) and returns clean,
checked car details for an insurance quote form. Each item says the decision, why it matters in a real business, and where
it lives and is tested. 175 unit tests in 17 files (`npm test`); one Playwright spec for the main flow (`npm run test:e2e`).

## Architecture decisions

| Decision                                       | Why                                                                                                                                                                                                                                                                                                                                                                          | Where                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **AI vision model + rules, not OCR + rules.**  | Cards mix Arabic, English and Urdu, are photographed tilted, blurred or off a screen, and every country lays them out differently. OCR with per-field regexes needs a layout map per card design and breaks on Arabic. A vision model reads layouts it has never seen; the rules then catch its mistakes. On the 16 sample cards it got 112/112 fields (`docs/accuracy.md`). | `lib/scan/read-card.ts`                                                        |
| **One fixed shape for every country.**         | The model returns `{ country, make, model, year, chassisNumber, plate, registrationDate, engineNumber }` with a confidence per field, validated with Zod. A form like Brokwise's consumes one shape, whatever the country.                                                                                                                                                   | `lib/ai/schema.ts`, `lib/profiles/types.ts`                                    |
| **Region profiles are data, not code.**        | A country is one file: plate patterns with `$1` format strings, a letter map (Arabic plate letters → Latin), word aliases (`DXB` → `DUBAI`), allowed chassis kinds, calendars and prompt hints. One generic checker applies any profile, and the prompt is built from the same profiles. Adding a country = one file + one line.                                             | `lib/profiles/*.ts`, `lib/profiles/check.ts`, `lib/ai/prompt.ts`               |
| **The same rules run in three places.**        | The profile checker is plain TypeScript with no server imports, so the server checks the AI answer, the browser re-checks when the visitor switches country (no second AI call), and the confirm step checks what the visitor typed. One rule set, no drift.                                                                                                                 | `lib/profiles/check.ts`, `lib/scan/confirm.ts`, `components/scan/scan-app.tsx` |
| **One-file AI adapter.**                       | Copied from JobFit: `AI_PROVIDER` + `AI_MODEL` pick the model; adding a provider is one map line and its package. Only Google is installed, because only Google is used.                                                                                                                                                                                                     | `lib/ai/model.ts` (3 tests)                                                    |
| **Same stack as my other apps, few packages.** | Next.js 16, Tailwind 4, Zod, AI SDK, Upstash. The only new package is `tesseract.js`, loaded only when the AI is down. Own UI components and SVG icons; ESLint blocks UI libraries and raw controls outside `components/ui`.                                                                                                                                                 | `package.json`, `eslint.config.mjs`                                            |

## Field rules (and the bugs they catch)

| Rule                                      | Detail                                                                                                                                                                                                                                                                                               | Tested by                              |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **VIN**                                   | 17 characters, never I, O or Q. The check digit is _not_ enforced: it is only mandatory in North America, so most Gulf and Japanese-market VINs would fail it. The test for the sample cards caught my own made-up Qatar VINs containing a "Q".                                                      | `chassis.test.ts` (8), `cards.test.ts` |
| **Japanese frame numbers**                | Japanese-market imports in Pakistan carry a frame number like `NZE141-1234567` instead of a VIN. Only the Pakistan profile allows it; on a UAE card the same value is flagged.                                                                                                                       | `chassis.test.ts`, `check.test.ts`     |
| **Plates per country**                    | UAE: emirate + code + number, also number-first and Arabic emirate names. Pakistan: city letters + number, optional year. Saudi: 3 of the 17 plate letters + up to 4 digits, Arabic letters mapped to their Latin pair, either order. Qatar: 1–6 digits. Output is one canonical form per country.   | `plates.test.ts` (24 cases)            |
| **Hijri dates without a package**         | Saudi cards print Umm al-Qura dates (`01/09/1445 هـ`). The built-in `Intl` calendar formats Gregorian → Hijri, so the converter estimates the day and walks to the match; a day that doesn't exist (30th of a 29-day month) returns null. Checked against known dates (1 Ramadan 1445 = 2024-03-11). | `lib/rules/hijri.ts`, `hijri.test.ts`  |
| **The printed year decides the calendar** | On a profile that allows Hijri, a printed year of 1300–1500 can only be Hijri and 1950+ only Gregorian, so the model's calendar label is ignored (the final review caught a Gregorian date labelled Hijri being flagged). On Qatar a Hijri date is flagged.                                          | `check.test.ts`                        |
| **Digits in any script**                  | Arabic-Indic (`٢٠٢٢`) and Persian digits become 0–9 before any rule; calendar marks after a date (`هـ`, `AH`, `م`) are ignored.                                                                                                                                                                      | `normalise.test.ts`, `dates.test.ts`   |
| **Dates must be real**                    | 31/02 is flagged; dates before 1950 or in the future are flagged. Year must be 1950 to next year.                                                                                                                                                                                                    | `check.test.ts`, `year.test.ts`        |

## Confidence threshold and confirmation

- **A rejected value never looks filled.** A value that fails its rule is emptied and flagged with a plain reason ("This
  doesn't look like a 17-character VIN"). The raw model value is kept apart, only to re-check on a country switch, and is
  never put back into a field.
- **"Matches the format" only where a format exists.** Year, date, chassis, plate and known makes can show the green tick.
  Model and engine number have no rule, so even a confident answer gets no tick: a made-up value can't look checked.
- **Below 0.7 confidence = "Please check this one"** (amber), even when the format is right. `CONFIDENCE_THRESHOLD` in
  `constants/config.ts`.
- **Nothing is used until the visitor confirms.** Every field is editable; confirm runs the same rules again, shows inline
  errors and focuses the first bad field (no error-summary box). Once a visitor edits a field, its "from the card" badge
  goes away: the value is theirs now.
- **Unknown country → ask.** If the model can't tell the country, values are kept, marked "Pick the card's country", and
  confirm requires a country.

Tested by `check.test.ts` (18), `confirm.test.ts` (7), and checked in the browser.

## Privacy

| What                              | Detail                                                                                                                                                                                                      | Where                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **No owner fields in the schema** | The prompt says to ignore the owner, and the Zod schema has no field for a name, address or ID, so they can't come back even if the model reads them. The OCR fallback skips owner lines too.               | `lib/ai/schema.ts`, `extract.test.ts` |
| **Image in memory only**          | The upload is read into memory, sent to the model and dropped. Not written to disk, Redis or logs. Errors log only "AI provider error" (a provider error can carry the request).                            | `app/api/scan/route.ts`               |
| **Plain-words consent**           | For the visitor's own card the page says the photo goes to Google's Gemini and that the free plan lets Google use it. The visitor must tick "I understand" first; samples need no consent.                  | `components/scan/upload-panel.tsx`    |
| **Photos shrunk before upload**   | Max 1600 px, JPEG 0.85, in a canvas: faster, and fewer pixels leave the device.                                                                                                                             | `lib/client/shrink-image.ts`          |
| **Visitor ids can't be reversed** | A visitor is HMAC-SHA-256 of the IP with a secret `VISITOR_SALT`. A plain hash of an IPv4 address can be reversed by trying all 4 billion; a keyed one can't. Production refuses to start without the salt. | `lib/limits/visitor.ts` (4 tests)     |
| **Fake people on the samples**    | The 16 sample cards are invented designs with "SPECIMEN · DEMO" across them, fake names and invented VINs; no real emblem or layout.                                                                        | `samples/`                            |

## Free tier use

| What                          | Detail                                                                                                                                                                                                                                                                                              | Where                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Shared key, capped share**  | RegRead uses the same free Gemini key as JobFit, so the app stops at 200 AI calls a day (`AI_GLOBAL_DAILY_LIMIT`) and leaves JobFit most of the quota.                                                                                                                                              | `lib/limits/daily.ts`                          |
| **Per-visitor limit**         | 10 uploads per visitor per UTC day. A refused run counts against neither the visitor nor the app.                                                                                                                                                                                                   | `daily.test.ts` (5)                            |
| **Refund on failure**         | If the AI fails, the visitor's upload is given back, but the app's count is not: the provider usually counted the call, and refunding it would let failing requests get past the cap on the shared key. A visitor who drops the request mid-scan gets no refund either (found in the final review). | `route.test.ts`                                |
| **Sample results cached**     | A sample is read once per model and cached for a week in Redis (`regread:sample:<id>:<model>`), so demo clicks cost no AI calls and no visitor uploads. A failed read is not cached and still counts against the app's cap. A new `AI_MODEL` starts fresh.                                          | `lib/cache/sample-cache.ts`, `route.test.ts`   |
| **Samples by id, not upload** | The browser sends `sampleId`; the server reads the image from disk (`outputFileTracingIncludes` ships `public/samples` with the function). Nobody can pass off an upload as a cached sample.                                                                                                        | `lib/scan/samples-server.ts`, `next.config.ts` |
| **One Redis, prefixed keys**  | All keys start with `regread:`, so the free Upstash database can be shared with other projects. Local dev uses an in-memory store; production refuses to run without Redis.                                                                                                                         | `lib/store/redis.ts`                           |

## Upload security

A public demo on a shared free key: nobody should burn the quota, slip in junk files or frame the page. Every check runs
before the AI call, and a refused request spends no run. Design: `docs/superpowers/specs/2026-11-17-upload-security-design.md`.

| What                            | Detail                                                                                                                                                                                                                                                                    | Where                                               |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **Bytes must match the label**  | The browser's declared type is a label anyone can set. The route reads the first bytes (JPEG, PNG, WebP, PDF signatures) and refuses a file whose bytes disagree with its label, e.g. HTML or a PDF named `.jpg`.                                                         | `lib/http/file-check.ts` (4 tests), `route.test.ts` |
| **Small, short PDFs only**      | PDFs go to the AI as-is and every page costs quota, so a PDF may be at most 1 MB (photos keep 4 MB; the browser shrinks them) and 2 pages. Pages are counted from the file's page markers without a PDF library: the larger of the page objects and the biggest `/Count`. | `lib/http/file-check.ts`, `constants/config.ts`     |
| **Size refused before reading** | A `Content-Length` over the cap is a 413 before the body is parsed into memory.                                                                                                                                                                                           | `app/api/scan/route.ts`                             |
| **IPv6 counts by /64**          | One home or phone gets a whole IPv6 /64 and can pick a new address in it at will, so a visitor is their /64 (and `::ffff:` IPv4 is plain IPv4). Otherwise each new address would get a fresh 10 a day.                                                                    | `lib/limits/visitor.ts` (2 tests)                   |
| **3 uploads a minute**          | On top of 10 a day, so a script can't spend a visitor's day in one second. Over it is a 429 `burst`; the page then reads on the device like any 429. A refused upload doesn't count.                                                                                      | `lib/limits/burst.ts` (2 tests)                     |
| **Origin check on POST**        | Browsers always send `Origin` on a POST. Only RegRead's own host and `ALLOWED_ORIGINS` may spend the quota; no Origin (curl, scripts) or another site is a 403. It can be faked, so it only stops casual scripts; the caps are the real limit.                            | `lib/http/cors.ts` (3 tests)                        |
| **Card text is data**           | Text printed on a card could try to instruct the model. The prompt says card text is data, never instructions; the answer is still bound to the car-field schema and checked by the rules.                                                                                | `lib/ai/prompt.ts`                                  |
| **Browser safety headers**      | `frame-ancestors 'none'` and `X-Frame-Options: DENY` (no click tricks in a frame), `nosniff`, a strict referrer policy and no camera/mic/location. No script rules yet: Next's inline scripts and the OCR's CDN worker need nonces.                                       | `lib/http/security-headers.ts`, `next.config.ts`    |

**Considered, not added:** Vercel BotID (strong against bots, but a new package) and Vercel Firewall rules (dashboard
config, not testable in the repo).

## Used by other sites

- **CORS allow list, not open.** `ALLOWED_ORIGINS` names the sites (Brokwise) that may call `/api/scan` from their pages.
  Any other origin gets no `Access-Control-Allow-Origin`, so browsers block it from reading answers. Errors carry the
  header too, so the calling site can show why. The per-visitor and global limits still apply to every call.
  Where: `lib/http/cors.ts`, `route.test.ts` (3 tests).

## Fallback when the AI is down

- **429, any 5xx or no connection → read on the device.** One tested function decides the next step for every status (a 413 from the platform is a size error, anything else a plain "try again", never "file type not supported"). A switch of country keeps what the visitor already typed.
- **The device reader:** Tesseract.js runs in the browser, loaded only then (dynamic import), English data
  only to keep the download small. Every field it finds is "please check", and the page says "Read on your device. Less
  accurate, please check every field."
- **Junk words trimmed per field.** Testing in the browser showed English-only OCR turning the Arabic labels into words
  stuck to the values ("2021 gall ds"). Each field now keeps only its own shape (a year, a VIN, a plate a profile accepts,
  a known make), with tests built from the real OCR output.
- **Country from the evidence.** With no country, the fallback picks the profile that accepts the most of plate, chassis
  and date (`LEA 1234` also fits Saudi letters; the frame number settles it).
- **Limits written down:** OCR works on photos, not PDFs (the page asks for a photo), and Saudi cards (mostly Arabic) read
  poorly.

Where: `lib/scan/client-flow.ts` (`client-flow.test.ts`, 11), `lib/client/ocr-fallback.ts`, `lib/ocr/extract.ts` (`extract.test.ts`, 9).

## Sample cards and measurement

- **4 invented designs, 16 renders.** HTML templates per country with Arabic or Urdu labels, rendered by Playwright in
  four versions: clean, blurry (CSS blur), tilted on a table (perspective + shadow) and a photo of a screen (moiré lines,
  glare, skew, low contrast). Saudi cards print Hijri dates and Arabic-Indic years; two Pakistani cars carry frame numbers.
- **Ground truth is tested.** Each sample's printed values must check out to its ground truth under its own profile, so a
  broken sample can't skew the accuracy numbers.
- **Measured, with an honest caveat.** `npm run measure` runs the real pipeline on all 16 and writes per-country,
  per-variant and per-field tables. The page says plainly that made-up cards are easier than real ones.

Where: `samples/`, `scripts/render-samples.ts`, `scripts/measure.ts`, `docs/accuracy.md`.

## Process

- Pre-commit hook runs typecheck, lint, format check and all unit tests (`.githooks/pre-commit`); never skipped.
- The Gemini key was copied into `.env.local` with a shell pipe and never printed; the visitor salt is generated with
  `openssl rand` and piped into Vercel.
- Built test-first from a written design and plan (`docs/superpowers/`).

## Deferred (and what would trigger it)

| Option                                     | Trigger                                                        |
| ------------------------------------------ | -------------------------------------------------------------- |
| Arabic traineddata for the OCR fallback    | Fallback used often on Saudi cards (needs the bigger download) |
| More countries (Oman, Kuwait, Bahrain)     | A partner needs them: one profile file each                    |
| VIN check digit for North-American imports | Many US-spec cars in the data                                  |
| Real-card accuracy set                     | Permission to use real, redacted cards                         |
| HEIC support                               | iPhone uploads are common in the logs                          |
