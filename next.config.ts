import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the Docker image (copies a self-contained server).
  output: "standalone",
};

export default nextConfig;
