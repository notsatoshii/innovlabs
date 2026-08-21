import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for DigitalOcean droplet deployment (Docker + nginx)
  output: "standalone",
  // Track fact sheets are read at runtime by the one-pager route; make sure
  // the standalone build bundles them.
  outputFileTracingIncludes: {
    "/api/one-pager": ["./content/tracks/**/*"],
  },
};

export default nextConfig;
