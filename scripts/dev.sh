#!/usr/bin/env bash
# Start Django (8000) + Vite (3000) with a clean, reliable flow:
# 1) Free stale listeners on 3000/8000 (can disable with SMS_DEV_AUTO_FREE=0)
# 2) Migrate, run Django, wait until /api/health/ returns sms-api
# 3) Start Vite (Ctrl+C stops Vite; EXIT trap stops Django we started)
#
# Uses defensive patterns so `set -e` never exits early on failed curl while the API is still starting.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

AUTO_FREE="${SMS_DEV_AUTO_FREE:-1}"

if [ ! -f venv/bin/activate ]; then
  echo "No Python venv. Run first:"
  echo "  bash scripts/setup-backend.sh"
  exit 1
fi

if [ "$AUTO_FREE" != "0" ]; then
  bash "$ROOT/scripts/free-dev-ports.sh" --quiet || true
else
  echo "[sms] SMS_DEV_AUTO_FREE=0 — not clearing ports (set to 1 for automatic cleanup)."
fi

# shellcheck source=/dev/null
source venv/bin/activate
cd "$ROOT/backend"
python manage.py migrate --noinput >/dev/null 2>&1 || true

HEALTH_URL="${SMS_DEV_HEALTH_URL:-http://127.0.0.1:8000/api/health/}"

wait_for_django() {
  local i=0
  local max=120
  local response
  echo "[sms] Waiting for Django API at $HEALTH_URL ..."
  while [ "$i" -lt "$max" ]; do
    # curl fails until the server is up — must not trigger `set -e`
    response="$(curl -sfS "$HEALTH_URL" 2>/dev/null || printf '%s' '')"
    if [[ "$response" == *"sms-api"* ]]; then
      echo "[sms] Django API is ready."
      return 0
    fi
    sleep 0.25
    i=$((i + 1))
  done
  echo "[sms] ERROR: Django did not respond with sms-api within ~30s."
  echo "       Check output above. Try: bash scripts/setup-backend.sh"
  return 1
}

DJANGO_PID=""
python manage.py runserver 127.0.0.1:8000 &
DJANGO_PID=$!

cleanup() {
  if [ -n "${DJANGO_PID:-}" ]; then
    kill "$DJANGO_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

sleep 0.5
if ! kill -0 "$DJANGO_PID" 2>/dev/null; then
  echo "[sms] ERROR: Django process exited immediately (port 8000 in use or Python error)."
  echo "       Run: npm run dev:free   then   npm run dev"
  trap - EXIT INT TERM
  exit 1
fi

if ! wait_for_django; then
  cleanup
  trap - EXIT INT TERM
  exit 1
fi

cd "$ROOT"
echo "[sms] Frontend: http://127.0.0.1:3000 (or next free port — see below)"
echo "[sms] API:      $HEALTH_URL"
set +e
npm run dev:vite
vite_exit=$?
set -e
if [ "${vite_exit:-0}" != "0" ]; then
  echo "[sms] Vite exited with code $vite_exit — see messages above."
fi
exit "${vite_exit:-0}"
