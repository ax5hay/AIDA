#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> AIDA — local run"
echo "Requires: Node 20+, npm. For Postgres only: docker compose up -d"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found. Install Node 20+ (https://nodejs.org) or use nvm/fnm."
  exit 1
fi

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"
echo ""

if [ ! -f "$ROOT/.env" ]; then
  echo "Creating .env from .env.example"
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Set DATABASE_URL=postgresql://aida:aida@localhost:5432/aida if using docker-compose Postgres."
fi

echo "==> npm install"
npm install

echo "==> Prisma generate + push"
npm run db:generate
npm run db:push

echo "==> Seed"
npm run db:seed

echo "==> Build packages"
npm run build

echo ""
echo "=== READY ==="
echo "Terminal 1:  npm run dev:api"
echo "             → API http://localhost:4000/v1/metrics/health"
echo "Terminal 2:  npm run dev:web"
echo "             → Web http://localhost:3000"
echo ""
echo "If DB connection failed, start Postgres:"
echo "  docker compose up -d"
echo ""
