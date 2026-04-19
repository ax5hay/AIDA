#!/usr/bin/env bash
# One-shot start: Postgres (Docker) + AIDA API/Web + Parity API/Web (+ optional cloudflared).
# Usage:
#   ./scripts/demo-start.sh
#   ./scripts/demo-start.sh --no-kill          # do not free ports 3000,3001,4000,4010 first
#   ./scripts/demo-start.sh --no-postgres      # skip docker compose postgres
#   ./scripts/demo-start.sh --tunnel           # also run: cloudflared tunnel run $DEMO_TUNNEL_UUID
#   DEMO_TUNNEL_UUID=3a2e59da-... ./scripts/demo-start.sh --tunnel
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

KILL_PORTS=true
START_POSTGRES=true
START_TUNNEL=false
TUNNEL_ID="${DEMO_TUNNEL_UUID:-${CLOUDFLARED_TUNNEL_ID:-}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-kill) KILL_PORTS=false ;;
    --no-postgres) START_POSTGRES=false ;;
    --tunnel) START_TUNNEL=true ;;
    -h|--help)
      grep '^#' "$0" | head -20 | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
  shift
done

PIDS_FILE="${DEMO_PIDS_FILE:-/tmp/aida-demo.pids}"
LOG_DIR="${DEMO_LOG_DIR:-/tmp}"
: >"$PIDS_FILE"

echo "==> AIDA demo stack — repo: $ROOT"

if [[ ! -f "$ROOT/.env" ]] && [[ ! -f "$ROOT/.env.local" ]]; then
  echo "Warning: no .env in repo root — APIs may fail without DATABASE_URL." >&2
fi

if $KILL_PORTS; then
  echo "==> Freeing ports 3000, 3001, 4000, 4010"
  for p in 3000 3001 4000 4010; do
    pids=$(lsof -ti ":$p" 2>/dev/null || true)
    if [[ -n "${pids:-}" ]]; then
      # shellcheck disable=SC2086
      kill -9 $pids 2>/dev/null || true
      echo "    Port $p: stopped PIDs $pids"
    fi
  done
  sleep 1
fi

if $START_POSTGRES; then
  if command -v docker >/dev/null 2>&1; then
    echo "==> Starting Postgres (docker compose)"
    docker compose -f "$ROOT/docker-compose.yml" up -d postgres
    echo "==> Waiting for Postgres to accept connections"
    for _ in $(seq 1 45); do
      if docker compose -f "$ROOT/docker-compose.yml" exec -T postgres pg_isready -U aida -d aida >/dev/null 2>&1; then
        echo "    Postgres is ready."
        break
      fi
      sleep 1
    done
  else
    echo "Warning: docker not found — assuming Postgres is already running on DATABASE_URL." >&2
  fi
fi

echo "==> prisma generate (quick sanity)"
npx prisma generate --schema "$ROOT/packages/db/prisma/schema.prisma" >/dev/null

launch() {
  local name="$1"
  local workspace="$2"
  local log="$LOG_DIR/aida-demo-${name}.log"
  echo "==> Starting $name → $log"
  : >"$log"
  nohup npm run dev -w "$workspace" >>"$log" 2>&1 &
  echo $! >>"$PIDS_FILE"
}

launch "api" "@aida/api"
launch "web" "@aida/web"
launch "parity-api" "@aida/parity-api"
launch "parity-web" "@aida/parity-web"

echo "==> Waiting for HTTP health (up to ~90s; first Next compile can be slow)"
ok_api=false
ok_parity=false
ok_web=false
ok_pw=false
for i in $(seq 1 90); do
  curl -fsS "http://127.0.0.1:4000/v1/metrics/health" >/dev/null 2>&1 && ok_api=true || true
  curl -fsS "http://127.0.0.1:4010/v1/parity/health" >/dev/null 2>&1 && ok_parity=true || true
  curl -fsS -o /dev/null "http://127.0.0.1:3000/" 2>/dev/null && ok_web=true || true
  curl -fsS -o /dev/null "http://127.0.0.1:3001/" 2>/dev/null && ok_pw=true || true
  if $ok_api && $ok_parity && $ok_web && $ok_pw; then
    echo "    All four endpoints responded (iteration $i)."
    break
  fi
  sleep 1
  [[ $((i % 15)) -eq 0 ]] && echo "    ... still waiting (${i}s)"
done

echo "==> Status"
$ok_api && echo "    AIDA API   http://127.0.0.1:4000/v1/metrics/health — OK" || echo "    AIDA API   — not ready (see $LOG_DIR/aida-demo-api.log)"
$ok_parity && echo "    Parity API http://127.0.0.1:4010/v1/parity/health — OK" || echo "    Parity API — not ready (see $LOG_DIR/aida-demo-parity-api.log)"
$ok_web && echo "    AIDA web   http://127.0.0.1:3000 — OK" || echo "    AIDA web   — not ready (see $LOG_DIR/aida-demo-web.log)"
$ok_pw && echo "    Parity web http://127.0.0.1:3001 — OK" || echo "    Parity web — not ready (see $LOG_DIR/aida-demo-parity-web.log)"

if $START_TUNNEL; then
  if ! command -v cloudflared >/dev/null 2>&1; then
    echo "Error: cloudflared not on PATH." >&2
    exit 1
  fi
  if [[ -z "$TUNNEL_ID" ]]; then
    echo "Error: --tunnel requires DEMO_TUNNEL_UUID or CLOUDFLARED_TUNNEL_ID in the environment." >&2
    echo "  Example: DEMO_TUNNEL_UUID=3a2e59da-b84a-4ad4-a596-1f629ae3b0c0 ./scripts/demo-start.sh --tunnel" >&2
    exit 1
  fi
  echo "==> Starting cloudflared tunnel run $TUNNEL_ID → $LOG_DIR/aida-demo-tunnel.log"
  nohup cloudflared tunnel run "$TUNNEL_ID" >>"$LOG_DIR/aida-demo-tunnel.log" 2>&1 &
  echo $! >>"$PIDS_FILE"
fi

echo ""
echo "PIDs saved to $PIDS_FILE"
echo "Logs: $LOG_DIR/aida-demo-{api,web,parity-api,parity-web,tunnel}.log"
echo "Stop:  ./scripts/demo-stop.sh"
echo ""
echo "Local URLs:"
echo "  AIDA web    http://localhost:3000"
echo "  Parity web  http://localhost:3001"
echo "  AIDA API    http://localhost:4000/v1"
echo "  Parity API  http://localhost:4010/v1"
