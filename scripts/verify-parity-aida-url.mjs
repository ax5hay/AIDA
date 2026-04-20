#!/usr/bin/env node
/**
 * Loads repo-root .env like apps/parity-web/next.config.ts, then checks AIDA URL resolution.
 * Usage: node scripts/verify-parity-aida-url.mjs
 */
import fs from "node:fs";
import path from "node:path";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

function monorepoRoot() {
  const hasPrismaSchema = (dir) =>
    fs.existsSync(path.join(dir, "packages", "db", "prisma", "schema.prisma"));
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (hasPrismaSchema(dir)) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find monorepo root (packages/db/prisma/schema.prisma)");
}

function getAidaWebBaseFromEnv() {
  const raw = process.env.AIDA_WEB_URL?.trim() || process.env.NEXT_PUBLIC_AIDA_WEB_URL?.trim();
  return (raw || "http://localhost:3000").replace(/\/$/, "");
}

const root = monorepoRoot();
loadEnvConfig(root);

const base = getAidaWebBaseFromEnv();

console.log("Monorepo root:", root);
console.log("AIDA_WEB_URL:", process.env.AIDA_WEB_URL ?? "(unset)");
console.log("Resolved AIDA base:", base);

if (!process.env.AIDA_WEB_URL?.trim()) {
  console.warn("WARN: AIDA_WEB_URL unset — using NEXT_PUBLIC or default localhost.");
}

const expectedHost = "aida-demo.merakiel.in";
if (process.env.AIDA_WEB_URL?.includes(expectedHost) && !base.includes(expectedHost)) {
  console.error("FAIL: AIDA_WEB_URL mentions demo host but resolved base does not.");
  process.exit(1);
}

console.log("OK: env load + resolution check passed.");
