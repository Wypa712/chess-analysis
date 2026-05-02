import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@neondatabase/serverless"],
  experimental: {
    cpus: 1,
  },
};

export default nextConfig;
