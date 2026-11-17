import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The scan route reads the made-up sample cards from disk; on Vercel public/ isn't in the function by default
  outputFileTracingIncludes: { "/api/scan": ["./public/samples/**/*"] },
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
