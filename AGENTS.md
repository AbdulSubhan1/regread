## This is NOT the Next.js you know

Next.js 16 has breaking changes. Read the relevant guide in `node_modules/next/dist/docs/` before writing route or page code. Heed deprecation notices.

# Coding standard

These rules apply to every person and AI model working in this repo. `npm run check` and `npm test` run on every commit (`.githooks/pre-commit`). Never skip the hook.

## 1. Where things live

| Folder                                    | What goes there                                                  |
| ----------------------------------------- | ---------------------------------------------------------------- |
| `app/`                                    | Routes: `page.tsx`, `layout.tsx`, `app/api/scan/route.ts`        |
| `components/ui/`                          | The UI library: one component per file, exported from `index.ts` |
| `components/<feature>/`                   | Feature sections, e.g. `scan/result-form.tsx`                    |
| `constants/`                              | Fixed values: limits, threshold                                  |
| `lib/rules/`                              | Shared field rules: digits, VIN/frame, year, dates, Hijri        |
| `lib/profiles/`                           | One data file per country + the generic checker                  |
| `lib/ai/`, `lib/scan/`                    | Model adapter, schema, prompt, reading a card                    |
| `lib/limits/`, `lib/store/`, `lib/cache/` | Daily limits, visitor id, Redis, sample cache                    |
| `lib/ocr/`, `lib/client/`                 | Browser fallback and browser-only helpers                        |
| `samples/`                                | Made-up specimen card templates and their ground truth           |
| `docs/`                                   | Spec, plan, accuracy, KB                                         |

## 2. Region profiles

- A country is one file in `lib/profiles/` holding **data only**: plate patterns, allowed chassis kinds, calendars, prompt hints.
- `lib/profiles/check.ts` is the only code that applies a profile. Adding a country never changes it.

## 3. Privacy (strict)

- The AI schema has no owner fields. Never add one.
- Images, request bodies and model output are never stored or logged. Log status codes only.
- The only server-side state is the daily counters and the cached results of the made-up sample cards.
- Keys live only in server env vars. Nothing secret uses the `NEXT_PUBLIC_` prefix.

## 4. UI (strict)

- Pages and feature components build UI only from `@/components/ui`. ESLint blocks raw `<button>`, `<input>`, `<select>`, `<textarea>`, `<a>`, `<img>` and `<svg>` outside `components/ui`.
- No inline styles. No UI, icon or class-name libraries.
- Colours, fonts and radii exist only as tokens in `app/globals.css` (`@theme`).
- Mobile-first: base classes are for phones, then `md:` / `lg:`. Never `max-*` variants. Text-holding flex/grid children get `min-w-0`.
- RTL-safe classes only: `ms-`, `me-`, `ps-`, `pe-`, `text-start`, `text-end`.
- Forms: inline error under the field, focus the first bad field, no error summary box.

## 5. Code style

- TypeScript strict. No `any`. No unused code.
- Prettier formats everything (`npm run format`).
- Comments explain _why_, not _what_.
- Names: components `PascalCase`, files `kebab-case`, constants `UPPER_SNAKE_CASE`, functions `camelCase`.
- New npm packages need Abdul's OK first.
