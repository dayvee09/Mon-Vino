#!/usr/bin/env bash
# Build AlpineCraft Rust→WASM portfolio and pack a deployable tarball.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE="$ROOT/apps/portfolio"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/dist/portfolio-release-$STAMP"
ARCHIVE="$ROOT/dist/portfolio-release-$STAMP.tar.gz"

echo "==> Checking prerequisites"
command -v rustc >/dev/null || { echo "rustc is required (install via rustup)"; exit 1; }
command -v trunk >/dev/null || { echo "trunk is required: cargo install trunk"; exit 1; }

rustup target list --installed | grep -q 'wasm32-unknown-unknown' \
  || rustup target add wasm32-unknown-unknown

echo "==> Building AlpineCraft portfolio (trunk --release)"
cd "$SITE"
trunk build --release

echo "==> Assembling release in $OUT"
rm -rf "$OUT"
mkdir -p "$OUT" "$ROOT/dist"
rsync -a "$SITE/dist/" "$OUT/"
cp "$SITE/DEPLOY.md" "$OUT/README-DEPLOY.md"

tar -czf "$ARCHIVE" -C "$ROOT/dist" "portfolio-release-$STAMP"

echo ""
echo "Portfolio release ready:"
echo "  Folder:  $OUT"
echo "  Archive: $ARCHIVE"
echo ""
echo "Upload to the server as /var/www/html/alpinecraft/ — see apps/portfolio/DEPLOY.md"
echo "Or: ./scripts/deploy.sh portfolio"
