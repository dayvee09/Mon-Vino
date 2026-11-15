#!/usr/bin/env bash
# Start Apache for the PHP API (used by compose + postStartCommand).
set -euo pipefail

run_svc() {
  if command -v sudo >/dev/null 2>&1; then
    sudo "$@"
  else
    "$@"
  fi
}

if run_svc service apache2 status >/dev/null 2>&1; then
  echo "Apache is already running."
  exit 0
fi

run_svc service apache2 start
echo "Apache started."
