#!/usr/bin/env bash
set -euo pipefail

REMOTE_URL="https://github.com/Finkedinkedude/LivingFog.git"

if ! command -v git >/dev/null 2>&1; then
  echo "Git is not installed or not on PATH."
  exit 1
fi

if [ ! -d .git ]; then
  git init -b main
fi

if git remote get-url origin >/dev/null 2>&1; then
  CURRENT_REMOTE="$(git remote get-url origin)"
  if [ "$CURRENT_REMOTE" != "$REMOTE_URL" ]; then
    echo "Existing origin is: $CURRENT_REMOTE"
    echo "Expected origin is: $REMOTE_URL"
    echo "Refusing to overwrite it automatically."
    exit 1
  fi
else
  git remote add origin "$REMOTE_URL"
fi

echo "Fetching origin/main..."
git fetch origin main

echo "Attaching this working tree to the current GitHub main branch without overwriting local files..."
git reset --mixed origin/main

git branch --set-upstream-to=origin/main main >/dev/null 2>&1 || true

echo
echo "Ready. Current changes compared with GitHub main:"
git status --short --branch
