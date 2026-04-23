#!/usr/bin/env bash
# Stop whatever is listening on Vite (3000) and Django (8000) dev ports.
# Usage: bash scripts/free-dev-ports.sh [--quiet]
#   --quiet  minimal output (for npm run dev)
set -euo pipefail

QUIET=0
if [ "${1:-}" = "--quiet" ] || [ "${1:-}" = "-q" ]; then
  QUIET=1
fi

free_port() {
  local port=$1
  local pids
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -z "${pids:-}" ]; then
    [ "$QUIET" = "0" ] && echo "Port $port: already free."
    return 0
  fi
  [ "$QUIET" = "0" ] && echo "Port $port: stopping PID(s) $pids"
  kill $pids 2>/dev/null || true
  sleep 0.4
  pids=$(lsof -nP -iTCP:"$port" -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "${pids:-}" ]; then
    kill -9 $pids 2>/dev/null || true
  fi
  [ "$QUIET" = "0" ] && echo "Port $port: freed."
}

if ! command -v lsof >/dev/null 2>&1; then
  echo "[sms] Warning: lsof not found — skipping port cleanup. If dev fails, free ports manually."
  exit 0
fi

free_port 3000
free_port 8000
if [ "$QUIET" = "0" ]; then
  echo "Done. You can run: npm run dev"
else
  echo "[sms] Dev ports 3000 and 8000 are ready."
fi
