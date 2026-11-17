import type { NextConfig } from "next";
import { SECURITY_HEADERS } from "./lib/http/security-headers";

const nextConfig: NextConfig = {
  // The scan route reads the made-up sample cards from disk; on Vercel public/ isn't in the function by default
  outputFileTracingIncludes: { "/api/scan": ["./public/samples/**/*"] },
  headers: async () => [{ source: "/:path*", headers: SECURITY_HEADERS }],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
