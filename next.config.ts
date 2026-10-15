import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* ShopFusion: classic App Router rendering. Most pages are session-aware,
     so the new cacheComponents model (which forbids runtime data access
     during prerender) is intentionally disabled. */
  cacheComponents: false,
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
