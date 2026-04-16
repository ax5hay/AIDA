#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Seeding AIDA synthetic data"
echo "This will reset facility assessments/facilities and repopulate synthetic rows."
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not on PATH."
  exit 1
fi

docker compose up -d postgres
echo "==> Running Prisma seed in API container"
docker compose run --rm api npx prisma db seed --schema /app/packages/db/prisma/schema.prisma
echo "==> Seed complete"
