#!/usr/bin/env bash
# publish-if-needed.sh <package-dir>
# Checks if the current version of a package is already published on the registry.
# If not, publishes it. Tracks whether it published or skipped via exit code:
#   stdout "published" or "skipped"
set -euo pipefail

PKG_DIR="$1"

if [ ! -f "$PKG_DIR/package.json" ]; then
  echo "Error: $PKG_DIR/package.json not found" >&2
  exit 1
fi

PKG_NAME=$(node -p "require('./$PKG_DIR/package.json').name")
PKG_VERSION=$(node -p "require('./$PKG_DIR/package.json').version")

echo "Checking $PKG_NAME@$PKG_VERSION..."

# Check if this version already exists on the registry.
# pnpm view exits non-zero if the package or version doesn't exist.
if pnpm view "$PKG_NAME@$PKG_VERSION" version 2>/dev/null; then
  echo "$PKG_NAME@$PKG_VERSION already published — skipping"
  echo "skipped"
  exit 0
fi

echo "Publishing $PKG_NAME@$PKG_VERSION..."
pnpm publish --filter "$PKG_NAME" --no-git-checks --access public
echo "$PKG_NAME@$PKG_VERSION published successfully"
echo "published"
