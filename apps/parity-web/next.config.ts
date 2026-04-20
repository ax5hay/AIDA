import fs from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

/**
 * Resolve monorepo root so repo `.env` loads even when `__dirname` for this file is wrong
 * (Next may evaluate config from a temp/bundled path).
 */
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
