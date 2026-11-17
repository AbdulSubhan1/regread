/**
 * Sent with every page and API answer. No script or style rules here: Next's inline scripts and the on-device OCR's
 * CDN worker would need nonces and a CDN allow list, which this demo doesn't carry yet.
 */
export const SECURITY_HEADERS = [
  // Stops click tricks: no other site can show RegRead inside a frame
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];
