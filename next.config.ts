import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for DigitalOcean droplet deployment (Docker + nginx)
  output: "standalone",
};

export default nextConfig;
