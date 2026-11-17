# RegRead — case study

**Read a car registration card, get clean, checked details for an insurance quote.**
Live: https://regread.vercel.app · Code: https://github.com/AbdulSubhan1/regread

## The problem

Car insurance forms in the Gulf and Pakistan ask for make, model, year, chassis number, plate and registration date.
People type these from their registration card and get them wrong: a VIN with an O instead of a 0, a plate in the wrong
format, a Saudi date in the Hijri calendar. Wrong details mean wrong quotes and rework for the broker.

## What I built

A standalone app (and later a step in my Brokwise demo broker) where you upload a photo or PDF of the card, or try a
made-up sample. A vision model reads it into one fixed shape for every country. Then **region profiles** check every
field: UAE emirate plates, Pakistani city plates and Japanese frame numbers, Saudi plate letters and Hijri dates, Qatari
digit plates. A value that fails a check is left empty with a plain reason; an unsure one is marked "please check". You
edit and confirm before anything is used.

## Decisions I'd defend in an interview

- **AI vision + rules over OCR + rules.** Mixed Arabic/English/Urdu cards and unknown layouts break OCR; the rules catch
  the model's mistakes instead.
- **Countries are data.** A profile is plate patterns, letter maps, chassis kinds and calendars. The same checker runs on
  the server, on a country switch in the browser, and on confirm.
- **A wrong value never looks checked.** Only fields with a format rule can get a tick; rejected values are never put back.
- **Privacy by shape.** The AI schema has no owner fields; images stay in memory; visitor ids are salted hashes.
- **Free tier on purpose.** Shared Gemini key with a daily cap, per-visitor limits, refunds on failure, cached samples,
  and a browser OCR fallback when the AI is unavailable.

## Results

- 16 made-up specimen cards (4 countries × clean, blurry, tilted, photo of a screen): **112/112 fields right, 16/16
  countries detected** with Gemini Flash Lite. Honest note: invented cards are easier than real ones.
- 156 unit tests, including Hijri conversion against known dates and the frame-number rule.

## What I'd do next

Plug it into Brokwise's car form, add Arabic OCR data for the fallback, and build a redacted real-card test set.
