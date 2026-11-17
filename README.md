# RegRead

Read a vehicle registration card (photo or PDF) and get clean, checked car details: make, model, year, chassis number,
plate, registration date and engine number. Supports the UAE, Pakistan, Saudi Arabia and Qatar.

**Live:** https://regread.vercel.app · No card? Use **"No card? Try a sample"** (made-up specimen cards).

## How it works

1. **AI reads the card.** Google Gemini (free tier) returns one fixed shape for every country, with a confidence per
   field. Only car fields: the owner's name, address and ID are never requested.
2. **Region profiles check it.** One data file per country: plate formats, VIN or Japanese frame number, calendars
   (Hijri dates on Saudi cards are converted to Gregorian). A value that fails is left empty and flagged; an unsure one
   is marked "Please check this one".
3. **You confirm.** Every field is editable. Confirm runs the same rules again; nothing is used before that.

If the AI is unavailable (daily limit or free quota used up), the card is read in the browser with Tesseract.js instead,
and every field is marked for checking.

Accuracy on the 16 sample cards: **112/112 fields** ([docs/accuracy.md](docs/accuracy.md)). Every decision is written
up in [docs/kb/engineering-highlights.md](docs/kb/engineering-highlights.md).

## Run it locally

```bash
npm install
cp .env.example .env.local   # add GOOGLE_GENERATIVE_AI_API_KEY
npm run dev                  # http://localhost:3621
```

Without Upstash env vars, local dev keeps the daily counters in memory.

## Environment

| Variable                                                              | What                                                                                                   |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `AI_PROVIDER`                                                         | `google` (the only provider installed)                                                                 |
| `AI_MODEL`                                                            | e.g. `gemini-3.5-flash-lite`                                                                           |
| `GOOGLE_GENERATIVE_AI_API_KEY`                                        | Free key from Google AI Studio                                                                         |
| `AI_DAILY_LIMIT`                                                      | Uploads per visitor per UTC day (default 10)                                                           |
| `AI_GLOBAL_DAILY_LIMIT`                                               | AI calls for the whole app per UTC day (default 200)                                                   |
| `ALLOWED_ORIGINS`                                                     | Sites that may call `/api/scan` from their pages, comma-separated (e.g. `https://brokwise.vercel.app`) |
| `VISITOR_SALT`                                                        | Secret for hashing visitor IPs; required in production                                                 |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` (or `KV_REST_API_URL` / `_TOKEN`) | Daily counters and cached sample results; required in production                                       |

## Scripts

| Script             | What                                                                              |
| ------------------ | --------------------------------------------------------------------------------- |
| `npm run dev`      | Dev server on port 3621                                                           |
| `npm test`         | Unit tests (Vitest)                                                               |
| `npm run check`    | Typecheck, lint, format check (also runs on every commit)                         |
| `npm run test:e2e` | Playwright: sample flow and confirm errors (uses a real AI call)                  |
| `npm run samples`  | Re-render the 16 sample cards from `samples/templates`                            |
| `npm run measure`  | Run the real pipeline on all samples and rewrite `docs/accuracy.md` (16 AI calls) |

## Using it from another site

`POST https://regread.vercel.app/api/scan` with a `multipart/form-data` body: `file` (JPEG, PNG, WebP or PDF, max 4 MB) or
`sampleId`. The answer is the result shape in `lib/profiles/types.ts` (`ScanResult`). The calling site must be in
`ALLOWED_ORIGINS`, must show its own consent note before sending a visitor's card, and must let the visitor check
the values. Brokwise's car form uses it this way.

## Adding a country

Add `lib/profiles/<code>.ts` (plate patterns, chassis kinds, calendars, prompt hints), add its code to `COUNTRY_CODES`
in `lib/profiles/types.ts` and one line to `lib/profiles/index.ts`. The checker and the prompt pick it up.

## Privacy

Images are processed in memory and never stored or logged. On the free Gemini plan Google may use uploaded images to
improve its products; the page says so and asks for consent before an own-card upload. The sample cards are invented
designs with fake people and cars.

## Upload safety

Uploads must really be a JPG, PNG, WebP or PDF (checked from the file's bytes, not its name). PDFs may be at most 1 MB
and 2 pages. Each visitor gets 3 uploads a minute and 10 a day (an IPv6 visitor is their /64 network), and the app
stops at 200 AI calls a day. Only RegRead's own page and the sites in `ALLOWED_ORIGINS` may post. Details:
`docs/kb/engineering-highlights.md#upload-security`.
