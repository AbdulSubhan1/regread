# Accuracy on the sample cards

Model: `google / gemini-3.5-flash-lite` · measured 2026-11-17 · 16 made-up cards, 7 fields each.

A field counts as right when the value after the profile checks matches the ground truth (ignoring case and spaces). A field that is blank on the card counts as right when it comes back empty. Re-run with `npm run measure`.

**Overall: 100% (112/112) of fields right. Country detected: 100% (16/16).**

## By country

| Country | Fields right |
| ------- | ------------ |
| AE      | 100% (28/28) |
| PK      | 100% (28/28) |
| SA      | 100% (28/28) |
| QA      | 100% (28/28) |

## By photo quality

| Variant | Fields right |
| ------- | ------------ |
| clean   | 100% (28/28) |
| blurry  | 100% (28/28) |
| tilted  | 100% (28/28) |
| screen  | 100% (28/28) |

## By field

| Field            | Right        |
| ---------------- | ------------ |
| make             | 100% (16/16) |
| model            | 100% (16/16) |
| year             | 100% (16/16) |
| chassisNumber    | 100% (16/16) |
| plate            | 100% (16/16) |
| registrationDate | 100% (16/16) |
| engineNumber     | 100% (16/16) |

## Misses

None on this run.

## What this does and doesn't show

These are made-up cards rendered from HTML: sharp text, plain layouts and standard fonts, even in the blurry, tilted and screen-photo versions. Real cards are worn, laminated, photographed in bad light and laid out in ways the model hasn't seen here, so real-world accuracy will be lower. That is why every value goes through the country rules, low-confidence values are marked, and nothing is used before the visitor confirms.
