# Upload security — short design

Approved by Abdul on 2026-11-17 ("Yes, build all 7", plus "make the PDF size much smaller").

## Why

RegRead is a public demo on a free Gemini key shared with JobFit. Nobody should be able to burn the quota, slip in
junk files or embed the page somewhere else.

## What already protects it

10 uploads a day per visitor, 200 AI calls a day for the app, 4 MB cap, four declared file types, CORS allow list,
no storage of images, car fields only.

## Changes

| #   | Gap                                                  | Change                                                                                                   |
| --- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 1   | The declared MIME type is trusted                    | Read the first bytes (JPEG, PNG, WebP, PDF signatures); they must match the declared type, else 400 type |
| 2   | A PDF can hold hundreds of pages, and be 4 MB        | PDFs: at most 1 MB (`pdfSize`) and at most 2 pages (`pages`)                                             |
| 3   | IPv6 visitors rotate addresses inside their /64      | An IPv6 visitor is their /64 network                                                                     |
| 4   | A script can fire all 10 runs at once; any caller    | 3 uploads a minute per visitor (429 `burst`); POSTs need an `Origin` of this site or the allow list      |
| 5   | Text on a card could try to instruct the model       | One prompt line: text on the card is data, never instructions                                            |
| 6   | The whole body is read before the size check         | `Content-Length` over the cap is refused (413) before parsing                                            |
| 7   | No browser safety headers                            | `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, referrer and permissions policies                |

## Approaches

- **In-code checks (picked):** no new packages, testable, same free Upstash store.
- Vercel BotID: strong against bots, but a new package; Abdul chose not to add it now.
- Vercel Firewall rules: dashboard config, not in the repo and not testable; left for later.

## Limits of these checks

- The `Origin` check stops casual scripts, not a determined one (it can be faked). The daily caps are the real limit.
- The PDF page count reads the page markers in the file. A PDF that hides them in compressed object streams shows 0
  pages and passes; the 1 MB cap still bounds it.
- The burst limit falls back to OCR on the device like any 429, so a real visitor who scans fast still gets a result.
