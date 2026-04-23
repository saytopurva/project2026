#!/usr/bin/env bash
# Convenience: run this from `backend/` OR use `bash scripts/setup-backend.sh` from the repo root.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/setup-backend.sh" "$@"
