import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

function monorepoRoot(): string {
  const hasPrismaSchema = (dir: string) =>
    fs.existsSync(path.join(dir, "packages", "db", "prisma", "schema.prisma"));
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (hasPrismaSchema(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, "..", "..");
}

loadEnvConfig(monorepoRoot());

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
