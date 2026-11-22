#!/usr/bin/env bash
# Build both apps into dist/ release folders + tarballs.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

"$ROOT/scripts/build-portfolio.sh"
"$ROOT/scripts/build-monvino.sh"

echo ""
echo "All releases ready under dist/"
ls -1 "$ROOT/dist"/*-release-* 2>/dev/null | sed 's/^/  /' || true
