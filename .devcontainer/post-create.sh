#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/monvino

# Prefer the Node version pinned in .nvmrc (latest LTS when possible).
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
  nvm install
  nvm alias default "$(node -v | sed 's/^v//')"
  echo "Using Node $(node -v) / npm $(npm -v)"
fi

ACCESBD="cellier-projet/api-php/modeles/AccesBd.cls.php"
TEMPLATE="cellier-projet/api-php/modeles/AccesBd-template.cls.php"

if [ ! -f "$ACCESBD" ]; then
  cp "$TEMPLATE" "$ACCESBD"
  sed -i \
    -e "s/mysql:host=localhost; dbname=pw2/mysql:host=${DB_HOST}; dbname=${DB_NAME}/" \
    -e "s/'root'/'${DB_USER}'/" \
    -e "s/''/'${DB_PASSWORD}'/" \
    "$ACCESBD"
  echo "Created ${ACCESBD} for the dev container database."
fi

cd cellier-projet/client
npm install
