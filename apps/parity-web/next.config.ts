import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aida/ui", "@aida/parity-core"],
  async rewrites() {
    const origin = process.env.PARITY_API_INTERNAL_URL ?? "http://127.0.0.1:4010";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${origin.replace(/\/$/, "")}/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
