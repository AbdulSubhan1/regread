# RegRead knowledge base

| Page                                                        | What it covers                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Engineering highlights](engineering-highlights.md)         | Every engineering decision: AI vs OCR, region profiles, rules, confidence, privacy, free tier, fallback |
| [Accuracy](../accuracy.md)                                  | Measured accuracy on the 16 sample cards                                                                |
| [Design](../superpowers/specs/2026-11-17-regread-design.md) | The agreed design                                                                                       |
| [Plan](../superpowers/plans/2026-11-17-regread-mvp.md)      | The build plan                                                                                          |
| [Case study](../case-study.md)                              | The portfolio write-up                                                                                  |

## How it fits together

```
 photo / PDF ──shrink in browser──► POST /api/scan ──limits──► Gemini (fixed Zod shape, no owner fields)
 sample id ─────────────────────►        │                          │
                                          │◄──── cache (samples) ◄───┘
                                          ▼
                              region profile checks (AE · PK · SA · QA)
                                          ▼
                 page: review form ──► country switch re-checks in the browser
                                   ──► confirm: same rules, inline errors ──► clean JSON
 429 / 502 ──► Tesseract.js in the browser ──► same checks, every field "please check"
```
