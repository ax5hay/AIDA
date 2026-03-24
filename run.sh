#!/usr/bin/env bash
# One-click: build & start Postgres + API + Web (Docker only — no local Node required)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed or not on PATH."
  echo "Install: https://docs.docker.com/get-docker/ (Docker Desktop on macOS/Windows)"
  exit 1
fi

echo "==> AIDA: docker compose up --build -d"
docker compose up --build -d

echo ""
echo "==> Done. Open in your browser:"
echo "    Web:  http://localhost:3000"
echo "    API:  http://localhost:4000/v1/metrics/health"
echo ""
echo "Logs:    docker compose logs -f"
echo "Stop:    docker compose down"
echo ""
