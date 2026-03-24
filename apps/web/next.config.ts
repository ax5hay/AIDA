import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aida/ui"],
  experimental: {
    optimizePackageImports: ["recharts", "framer-motion"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/:path*",
      },
    ];
  },
};

export default nextConfig;
