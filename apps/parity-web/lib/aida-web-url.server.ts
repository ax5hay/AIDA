import fs from "node:fs";
import path from "node:path";
import { DEFAULT_AIDA_WEB_BASE } from "@/lib/aida-web-default";

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

/** Read `AIDA_WEB_URL` from repo-root `.env` at runtime (authoritative for `next start` + tunnels). */
export function readAidaWebUrlFromRepoDotenv(): string | undefined {
  try {
    const root = monorepoRootFromCwd();
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath)) return undefined;
    const text = fs.readFileSync(envPath, "utf8");
    for (const line of text.split("\n")) {
      const t = line.replace(/^\s*/, "");
      if (t === "" || t.startsWith("#")) continue;
      const m = t.match(/^(?:export\s+)?AIDA_WEB_URL=(.*)$/);
      if (!m) continue;
      const v = unquoteEnvValue(m[1] ?? "");
      if (v) return v;
    }
  } catch {
    /* no .env in some deploys */
  }
  return undefined;
}

/** Server-only: resolves AIDA web origin (reads repo `.env` first to avoid Next build-time env inlining). */
export function getAidaWebBaseFromEnv(): string {
  const raw =
    readAidaWebUrlFromRepoDotenv()?.trim() ||
    process.env.AIDA_WEB_URL?.trim() ||
    process.env.NEXT_PUBLIC_AIDA_WEB_URL?.trim();
  return (raw || DEFAULT_AIDA_WEB_BASE).replace(/\/$/, "");
}
