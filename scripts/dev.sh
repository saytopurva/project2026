#!/usr/bin/env bash
# Start Django (8000) and Vite (5173) together. Ctrl+C stops both.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f venv/bin/activate ]; then
  echo "No Python venv. Run first:"
  echo "  bash scripts/setup-backend.sh"
  exit 1
fi

# shellcheck source=/dev/null
source venv/bin/activate
cd "$ROOT/backend"
python manage.py migrate --noinput >/dev/null 2>&1 || true
python manage.py runserver 127.0.0.1:8000 &
DJANGO_PID=$!

cleanup() {
  kill "$DJANGO_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

cd "$ROOT"
echo "Django: http://127.0.0.1:8000/api/health/"
echo "Vite:   http://127.0.0.1:5173 (proxies /api → Django)"
exec npm run dev
