#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/.devcontainer/start-apache.sh"

# Wait briefly for the API to answer (DB may still be warming up).
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf --connect-timeout 2 \
    "http://127.0.0.1/PW2/cellier-projet/api-php/admin/rouge/saq" >/dev/null 2>&1; then
    echo "Apache API is ready."
    exit 0
  fi
  sleep 1
done

echo "WARNING: Apache is up but the API did not respond yet." >&2
echo "If login fails with HTTP 504, run: sudo service apache2 restart" >&2
