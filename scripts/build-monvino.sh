#!/usr/bin/env bash
# Build a production-ready tarball for Mon Vino (no secrets, no node_modules).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CLIENT="$ROOT/apps/monvino/client"
API="$ROOT/apps/monvino/api-php"
DB="$ROOT/apps/monvino/database"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$ROOT/dist/monvino-release-$STAMP"
ARCHIVE="$ROOT/dist/monvino-release-$STAMP.tar.gz"

echo "==> Checking prerequisites"
command -v npm >/dev/null || { echo "npm is required"; exit 1; }

if [ ! -f "$CLIENT/src/aws-exports.js" ]; then
  echo "Missing $CLIENT/src/aws-exports.js"
  echo "Copy src/aws-exports.example.js to src/aws-exports.js and configure Cognito."
  exit 1
fi

# React (create-react-app) reads .env.production during npm run build — no need to source it in bash.

echo "==> Building React client"
cd "$CLIENT"
if [ ! -d node_modules ]; then
  npm ci
fi
npm run build

echo "==> Assembling release in $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/api-php/modeles" "$OUT/www" "$OUT/database" "$OUT/docs"

# PHP API (no local secrets)
rsync -a --exclude='AccesBd.cls.php' --exclude='config.local.php' --exclude='.DS_Store' \
  "$API/" "$OUT/api-php/"
cp "$API/modeles/AccesBd-template.cls.php" "$OUT/api-php/modeles/AccesBd.cls.php"
cp "$API/config.local.example.php" "$OUT/api-php/"

# React static build
rsync -a "$CLIENT/build/" "$OUT/www/"

# Public starter schema only (never ship personal dumps)
if [ -f "$DB/monvino-starter.sql" ]; then
  cp "$DB/monvino-starter.sql" "$OUT/database/"
else
  echo "Warning: no SQL dump in $DB — import schema manually on the server."
fi

cp "$ROOT/DEPLOYMENT.md" "$OUT/docs/"
cp "$CLIENT/.env.production.example" "$OUT/docs/"
cp "$CLIENT/src/aws-exports.example.js" "$OUT/docs/"

cat > "$OUT/INSTALL.txt" <<'EOF'
Mon Vino — production bundle

1. Upload this folder to your server (e.g. /var/www/html/monvino).
2. Follow docs/DEPLOYMENT.md on the server.
3. Create api-php/config.local.php from config.local.example.php.
4. Import database/monvino-starter.sql into MySQL/MariaDB.
5. Point Alias /monvino at www/ and /api-php at api-php/.

Secrets are NOT included in this archive by design.
EOF

mkdir -p "$ROOT/dist"
tar -czf "$ARCHIVE" -C "$ROOT/dist" "monvino-release-$STAMP"

echo ""
echo "Release ready:"
echo "  Folder:  $OUT"
echo "  Archive: $ARCHIVE"
echo ""
echo "Upload the .tar.gz to your server, then extract and follow docs/DEPLOYMENT.md"
echo "Or: ./scripts/deploy.sh monvino"
