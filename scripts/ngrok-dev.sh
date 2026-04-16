#!/usr/bin/env bash
# Start ngrok for local AIDA. Requires: brew install ngrok/ngrok/ngrok
# Token: add NGROK_AUTHTOKEN to project .env, or run: ngrok config add-authtoken '...'
#   export NGROK_AUTHTOKEN='...'
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env"
  set +a
fi
TOKEN="${NGROK_AUTHTOKEN:-}"
if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok not found. Install: brew install ngrok/ngrok/ngrok" >&2
  exit 1
fi
# Build optional --authtoken args (or rely on ~/.config/ngrok/ngrok.yml after ngrok config add-authtoken)
AUTH_ARGS=()
if [[ -n "$TOKEN" ]]; then
  AUTH_ARGS=(--authtoken "$TOKEN")
elif ! ngrok config check >/dev/null 2>&1; then
  echo "Set NGROK_AUTHTOKEN in $ROOT/.env or run: ngrok config add-authtoken '<token>'" >&2
  echo "Get a token: https://dashboard.ngrok.com/get-started/your-authtoken" >&2
  exit 1
fi
MODE="${1:-web}"
case "$MODE" in
  web)
    # Covers UI + /api/* (Next rewrites to Nest on 4000). Set API WEB_ORIGIN to this HTTPS URL.
    exec ngrok http 3000 "${AUTH_ARGS[@]}"
    ;;
  both | all)
    exec ngrok start --all "${AUTH_ARGS[@]}" --config "$ROOT/scripts/ngrok-tunnels.yml"
    ;;
  api)
    exec ngrok http 4000 "${AUTH_ARGS[@]}"
    ;;
  *)
    echo "Usage: $0 [web | both | api]" >&2
    echo "  web   — tunnel Next.js :3000 (recommended; /api proxied to Nest)" >&2
    echo "  both  — tunnels :3000 and :4000 (two public URLs)" >&2
    echo "  api   — tunnel Nest :4000 only" >&2
    exit 1
    ;;
esac
