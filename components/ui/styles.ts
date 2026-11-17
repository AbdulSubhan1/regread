/** Shared class recipes. A new look is a new variant here, not a className override. */
export const BUTTON = {
  base: "inline-flex min-h-11 items-center justify-center gap-2 rounded-box px-5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50",
  primary: "bg-brand text-white hover:bg-brand-deep",
  secondary: "border border-line bg-card text-ink hover:border-ink-soft",
  ghost: "text-brand hover:bg-brand-soft",
} as const;

export const INPUT =
  "block min-h-11 w-full min-w-0 rounded-box border bg-card px-3 text-base text-ink focus:outline-2 focus:outline-offset-1 focus:outline-brand";

export const TONE = {
  ok: "bg-ok-soft text-ok",
  check: "bg-check-soft text-check",
  flag: "bg-flag-soft text-flag",
  info: "bg-brand-soft text-brand-deep",
} as const;

export type Tone = keyof typeof TONE;
