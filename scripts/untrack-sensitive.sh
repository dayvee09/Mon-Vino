#!/usr/bin/env bash
# One-time: stop tracking files that should never be on GitHub.
# Run from repo root after updating .gitignore.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FILES=(
  apps/monvino/client/src/aws-exports.js
  apps/monvino/client/amplify/team-provider-info.json
  apps/monvino/client/amplify/.config/local-aws-info.json
  apps/monvino/client/amplify/.config/local-env-info.json
  .devcontainer/docker-compose.yml
  apps/monvino/database/pw2_le_bon.sql
  deploy.env
)

for f in "${FILES[@]}"; do
  if git ls-files --error-unmatch "$f" &>/dev/null; then
    git rm --cached "$f"
    echo "Untracked: $f"
  else
    echo "Not tracked (skip): $f"
  fi
done

for dir in \
  "apps/monvino/client/amplify/#current-cloud-backend" \
  "apps/monvino/client/amplify/backend/awscloudformation"; do
  if git ls-files --error-unmatch "$dir" &>/dev/null; then
    git rm -r --cached "$dir"
    echo "Untracked: $dir/ (recursive)"
  else
    echo "Not tracked (skip): $dir/"
  fi
done

for f in apps/monvino/client/amplify/backend/amplify-meta.json; do
  if git ls-files --error-unmatch "$f" &>/dev/null; then
    git rm --cached "$f"
    echo "Untracked: $f"
  fi
done

echo ""
echo "Done. Commit the .gitignore update and these removals when ready."
echo "Keep local copies of aws-exports.js and Amplify config on your machine."
