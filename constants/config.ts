/** Below this the model was unsure: the field is filled but marked "Please check this one". */
export const CONFIDENCE_THRESHOLD = 0.7;

/** Longest model name or engine number we accept as text. */
export const MAX_TEXT_FIELD = 40;

/** Default uploads per visitor per UTC day (override with AI_DAILY_LIMIT). */
export const DEFAULT_VISITOR_DAILY_LIMIT = 10;

/** Default AI calls for the whole app per UTC day (override with AI_GLOBAL_DAILY_LIMIT). Shares JobFit's free key. */
export const DEFAULT_GLOBAL_DAILY_LIMIT = 200;

/** Cached sample results live a week; a new AI_MODEL starts fresh. */
export const SAMPLE_CACHE_SECONDS = 604_800;

/** Largest upload we accept. The browser shrinks photos well below this; PDFs are sent as-is. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Largest PDF we accept. A scanned card is one or two pages, well under this. */
export const MAX_PDF_BYTES = 1024 * 1024;

/** Most PDF pages we send to the AI: a card's front and back. Every page costs quota. */
export const MAX_PDF_PAGES = 2;

/** Uploads one visitor may start in a minute, on top of the daily limit. */
export const BURST_PER_MINUTE = 3;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
