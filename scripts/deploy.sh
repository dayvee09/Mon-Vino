#!/usr/bin/env bash
# Push the latest dist/ release folders to the LAN Apache host via SSH/rsync.
# Never stores passwords or private keys — uses your SSH agent / ~/.ssh.
#
# Usage:
#   cp deploy.env.example deploy.env   # set DEPLOY_USER
#   ./scripts/build-all.sh             # or build-portfolio / build-monvino
#   ./scripts/deploy.sh                # both apps
#   ./scripts/deploy.sh portfolio
#   ./scripts/deploy.sh monvino
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/deploy.env"
TARGET="${1:-all}"

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
DEPLOY_PORTFOLIO_PATH="${DEPLOY_PORTFOLIO_PATH:-/var/www/html/alpinecraft}"
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

latest_dir() {
  local prefix="$1"
  local dir
  dir="$(ls -1d "$ROOT/dist/${prefix}"-release-* 2>/dev/null | grep -v '\.tar\.gz$' | sort | tail -1 || true)"
  if [ -z "$dir" ] || [ ! -d "$dir" ]; then
    echo "No $prefix release folder under dist/. Run ./scripts/build-${prefix}.sh first." >&2
    return 1
  fi
  printf '%s\n' "$dir"
}

deploy_portfolio() {
  local src
  src="$(latest_dir portfolio)"
  echo "==> Deploying portfolio from $src → $REMOTE:$DEPLOY_PORTFOLIO_PATH"
  "${SSH[@]}" "$REMOTE" "mkdir -p '$DEPLOY_PORTFOLIO_PATH'"
  rsync -az --delete -e "$RSYNC_SSH" \
    "$src"/ "$REMOTE:$DEPLOY_PORTFOLIO_PATH/"
  echo "Portfolio deployed."
}

deploy_monvino() {
  local src
  src="$(latest_dir monvino)"
  echo "==> Deploying Mon Vino from $src → $REMOTE:$DEPLOY_MONVINO_PATH"
  "${SSH[@]}" "$REMOTE" "mkdir -p '$DEPLOY_MONVINO_PATH/www' '$DEPLOY_MONVINO_PATH/api-php' '$DEPLOY_MONVINO_PATH/database'"
  # Frontend
  rsync -az --delete -e "$RSYNC_SSH" \
    "$src/www"/ "$REMOTE:$DEPLOY_MONVINO_PATH/www/"
  # API — never overwrite server-side secrets
  rsync -az --delete -e "$RSYNC_SSH" \
    --exclude='config.local.php' \
    --exclude='AccesBd.cls.php' \
    "$src/api-php"/ "$REMOTE:$DEPLOY_MONVINO_PATH/api-php/"
  # Ensure AccesBd from template exists if missing on server
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
  echo "Mon Vino deployed (config.local.php preserved if already present)."
}

case "$TARGET" in
  all)
    deploy_portfolio
    deploy_monvino
    ;;
  portfolio)
    deploy_portfolio
    ;;
  monvino)
    deploy_monvino
    ;;
  *)
    echo "Usage: $0 [all|portfolio|monvino]"
    exit 1
    ;;
esac

echo ""
echo "Done. Check http://${DEPLOY_HOST}/ and http://${DEPLOY_HOST}/monvino/"
