#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/alpinecraft

# Prefer the Node version pinned in .nvmrc (latest LTS when possible).
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm install
  nvm alias default "$(node -v | sed 's/^v//')"
  echo "Using Node $(node -v) / npm $(npm -v)"
fi

ACCESBD="apps/monvino/api-php/modeles/AccesBd.cls.php"
TEMPLATE="apps/monvino/api-php/modeles/AccesBd-template.cls.php"

if [ ! -f "$ACCESBD" ]; then
  cp "$TEMPLATE" "$ACCESBD"
  sed -i \
    -e "s/mysql:host=localhost; dbname=pw2/mysql:host=${DB_HOST}; dbname=${DB_NAME}/" \
    -e "s/'root'/'${DB_USER}'/" \
    -e "s/''/'${DB_PASSWORD}'/" \
    "$ACCESBD"
  echo "Created ${ACCESBD} for the dev container database."
fi

# Apache DocumentRoot is apps/portfolio/dist. Ensure it exists before Apache starts.
mkdir -p apps/portfolio/dist
if [ ! -f apps/portfolio/dist/index.html ]; then
  cat > apps/portfolio/dist/index.html <<'EOF'
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>AlpineCraft</title></head>
<body>
  <p>Portfolio build missing. From the repo root run <code>./scripts/build-portfolio.sh</code>
  (or <code>cd apps/portfolio && trunk serve</code> for live reload on :8080).</p>
  <p><a href="/monvino/">Mon Vino</a> · <a href="/api-php/">API</a></p>
</body>
</html>
EOF
  echo "Created placeholder apps/portfolio/dist/index.html (run build-portfolio.sh for the real site)."
fi

cd apps/monvino/client
npm install
