#!/usr/bin/env bash
# Push the latest dist/monvino-release-* to the LAN Apache host via SSH/rsync.
# Never stores passwords or private keys — uses your SSH agent / ~/.ssh.
#
# Usage:
#   cp deploy.env.example deploy.env   # set DEPLOY_USER
#   ./scripts/build-monvino.sh
#   ./scripts/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/deploy.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE"
  echo "Copy deploy.env.example to deploy.env and set DEPLOY_USER (gitignored)."
  exit 1
fi

# shellcheck source=/dev/null
set -a
source "$ENV_FILE"
set +a

: "${DEPLOY_HOST:?Set DEPLOY_HOST in deploy.env}"
: "${DEPLOY_USER:?Set DEPLOY_USER in deploy.env}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_MONVINO_PATH="${DEPLOY_MONVINO_PATH:-/var/www/html/monvino}"

SSH=(ssh -p "$DEPLOY_PORT" -o BatchMode=yes)
RSYNC_SSH="ssh -p $DEPLOY_PORT -o BatchMode=yes"
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"

echo "==> Checking SSH (key/agent auth, no password prompt)"
if ! "${SSH[@]}" "$REMOTE" "echo ok" >/dev/null 2>&1; then
  echo "Cannot SSH to $REMOTE as non-interactive (BatchMode)."
  echo "Set up a key once, then retry:"
  echo "  ssh-copy-id -p $DEPLOY_PORT $REMOTE"
  echo "Or deploy manually with the tarballs under dist/ — see DEPLOYMENT.md"
  exit 1
fi

src="$(ls -1d "$ROOT/dist/monvino-release-"* 2>/dev/null | grep -v '\.tar\.gz$' | sort | tail -1 || true)"
if [ -z "$src" ] || [ ! -d "$src" ]; then
  echo "No monvino release folder under dist/. Run ./scripts/build-monvino.sh first." >&2
  exit 1
fi

echo "==> Deploying Mon Vino from $src → $REMOTE:$DEPLOY_MONVINO_PATH"
"${SSH[@]}" "$REMOTE" "mkdir -p '$DEPLOY_MONVINO_PATH/www' '$DEPLOY_MONVINO_PATH/api-php' '$DEPLOY_MONVINO_PATH/database'"
rsync -az --delete -e "$RSYNC_SSH" \
  "$src/www"/ "$REMOTE:$DEPLOY_MONVINO_PATH/www/"
rsync -az --delete -e "$RSYNC_SSH" \
  --exclude='config.local.php' \
  --exclude='AccesBd.cls.php' \
  "$src/api-php"/ "$REMOTE:$DEPLOY_MONVINO_PATH/api-php/"
if [ -f "$src/api-php/modeles/AccesBd.cls.php" ]; then
  rsync -az -e "$RSYNC_SSH" \
    --ignore-existing \
    "$src/api-php/modeles/AccesBd.cls.php" \
    "$REMOTE:$DEPLOY_MONVINO_PATH/api-php/modeles/AccesBd.cls.php"
fi
if [ -d "$src/database" ]; then
  rsync -az -e "$RSYNC_SSH" \
    "$src/database"/ "$REMOTE:$DEPLOY_MONVINO_PATH/database/"
fi

echo ""
echo "Done. Check http://${DEPLOY_HOST}/monvino/"
echo "Mon Vino deployed (config.local.php preserved if already present)."
