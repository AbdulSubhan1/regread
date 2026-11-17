/**
 * Lets the sites in ALLOWED_ORIGINS (comma-separated, e.g. https://brokwise.vercel.app) call the scan from their
 * pages. Any other origin gets no CORS header, so browsers keep it from reading answers and spending the free quota.
 */
export function corsHeaders(
  origin: string | null,
  allowed = process.env.ALLOWED_ORIGINS ?? "",
): Record<string, string> {
  const list = allowed
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  const base = { Vary: "Origin" };
  if (!origin || !list.includes(origin)) return base;
  return {
    ...base,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "X-Runs-Remaining",
    "Access-Control-Max-Age": "86400",
  };
}
