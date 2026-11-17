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
