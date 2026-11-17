/**
 * Lets the sites in ALLOWED_ORIGINS (comma-separated, e.g. https://brokwise.vercel.app) call the scan from their
 * pages. Any other origin gets no CORS header, so browsers keep it from reading answers and spending the free quota.
 */
export function corsHeaders(
  origin: string | null,
  allowed = process.env.ALLOWED_ORIGINS ?? "",
): Record<string, string> {
  const base = { Vary: "Origin" };
  if (!origin || !allowList(allowed).includes(origin)) return base;
  return {
    ...base,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "X-Runs-Remaining",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Whether a POST may spend the quota: it must come from RegRead's own page (same host as the request) or an allowed
 * site. Browsers always send Origin on a POST, so a missing one means a script. Scripts can fake it; this only stops
 * casual ones, and the daily limits stay the real cap.
 */
export function isAllowedOrigin(
  origin: string | null,
  requestUrl: string,
  allowed = process.env.ALLOWED_ORIGINS ?? "",
): boolean {
  if (!origin || !URL.canParse(origin)) return false;
  return new URL(origin).host === new URL(requestUrl).host || allowList(allowed).includes(origin);
}

function allowList(allowed: string): string[] {
  return allowed
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}
