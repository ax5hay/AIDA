#!/usr/bin/env bash
# Stop processes started by demo-start.sh (PIDs file) and optionally free demo ports + tunnel-friendly ports.
set -euo pipefail

PIDS_FILE="${DEMO_PIDS_FILE:-/tmp/aida-demo.pids}"

if [[ -f "$PIDS_FILE" ]]; then
  echo "==> Stopping PIDs from $PIDS_FILE"
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
      echo "    Sent SIGTERM to $pid"
    fi
  done <"$PIDS_FILE"
  sleep 2
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    kill -9 "$pid" 2>/dev/null || true
  done <"$PIDS_FILE"
  rm -f "$PIDS_FILE"
fi

echo "==> Freeing ports 3000, 3001, 4000, 4010"
for p in 3000 3001 4000 4010; do
  pids=$(lsof -ti ":$p" 2>/dev/null || true)
  if [[ -n "${pids:-}" ]]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    echo "    Port $p: $pids"
  fi
done

echo "Done."
