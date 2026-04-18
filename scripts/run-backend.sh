#!/usr/bin/env bash
# Start Django on http://127.0.0.1:8000 (uses ./venv — run setup-backend.sh first).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f venv/bin/activate ]; then
  echo "No venv found. Run first:"
  echo "  bash scripts/setup-backend.sh"
  exit 1
fi

# shellcheck source=/dev/null
source venv/bin/activate
cd backend
exec python manage.py runserver "$@"
