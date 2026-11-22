#!/usr/bin/env bash
# Alias: build Mon Vino into dist/ (kept for older docs/scripts that call build-all).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec "$ROOT/scripts/build-monvino.sh"
