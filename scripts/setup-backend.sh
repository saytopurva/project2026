#!/usr/bin/env bash
# One-time: create venv in this project + install Django deps + migrate.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Project root: $ROOT"

if [ ! -d venv ]; then
  echo "Creating virtual environment (venv)..."
  python3 -m venv venv
fi

# shellcheck source=/dev/null
source venv/bin/activate

echo "Installing Python packages..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

cd backend
python manage.py migrate --noinput
echo ""
echo "Done. Start Django with:"
echo "  bash scripts/run-backend.sh"
