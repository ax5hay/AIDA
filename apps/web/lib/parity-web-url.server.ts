import fs from "node:fs";
import path from "node:path";
import { DEFAULT_PARITY_WEB_BASE } from "@/lib/parity-web-default";

function monorepoRootFromCwd(): string {
  const hasPrisma = (dir: string) =>
    fs.existsSync(path.join(dir, "packages", "db", "prisma", "schema.prisma"));
  let dir = process.cwd();
  for (let i = 0; i < 14; i++) {
    if (hasPrisma(dir)) return dir;
    const p = path.dirname(dir);
    if (p === dir) break;
    dir = p;
  }
  return process.cwd();
}

function unquoteEnvValue(raw: string): string {
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  const hash = v.indexOf(" #");
  if (hash !== -1) v = v.slice(0, hash).trim();
  return v;
}

/** Read `PARITY_WEB_URL` from repo-root `.env` at runtime (tunnel / demo hosts). */
export function readParityWebUrlFromRepoDotenv(): string | undefined {
  try {
    const root = monorepoRootFromCwd();
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath)) return undefined;
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const t = line.replace(/^\s*/, "");
      if (t === "" || t.startsWith("#")) continue;
      const m = t.match(/^(?:export\s+)?PARITY_WEB_URL=(.*)$/);
      if (!m) continue;
      const v = unquoteEnvValue(m[1] ?? "");
      if (v) return v;
    }
  } catch {
    /* no .env */
  }
  return undefined;
}

/** Parity web origin for sidebar “Product hub” (no trailing slash). Server-only. */
export function getParityWebBaseFromEnv(): string {
  const raw =
    readParityWebUrlFromRepoDotenv()?.trim() ||
    process.env.PARITY_WEB_URL?.trim() ||
    process.env.NEXT_PUBLIC_PARITY_WEB_URL?.trim();
  return (raw || DEFAULT_PARITY_WEB_BASE).replace(/\/$/, "");
}
