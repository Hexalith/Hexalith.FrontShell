#!/usr/bin/env bash
# Scaffold Smoke Test
#
# Verifies that create-hexalith-module produces a compilable, testable,
# lint-clean module. Scaffolds into modules/ (workspace-aware) so that
# workspace:* dependencies resolve correctly.
#
# Usage: bash scripts/scaffold-smoke-test.sh

set -euo pipefail

ROOT_DIR="$(pwd)"
MODULE_NAME="ci-smoke-test"
OUTPUT_DIR_NAME="hexalith-$MODULE_NAME"
OUTPUT_DIR="$ROOT_DIR/$OUTPUT_DIR_NAME"
WORKSPACE_DIR="$ROOT_DIR/modules/$OUTPUT_DIR_NAME"

cleanup() {
  echo "==> Cleaning up"
  cd "$ROOT_DIR"
  rm -rf "$OUTPUT_DIR" "$WORKSPACE_DIR"
}
trap cleanup EXIT

echo "==> Scaffolding module '$MODULE_NAME'"
node tools/create-hexalith-module/dist/index.js "$MODULE_NAME"

echo "==> Moving to modules/ workspace"
mv "$OUTPUT_DIR" "$WORKSPACE_DIR"

echo "==> Installing workspace dependencies"
if pnpm install --frozen-lockfile; then
  echo "==> Reused existing lockfile"
else
  echo "==> Temporary workspace package requires a lockfile refresh; retrying without frozen lockfile"
  pnpm install --no-frozen-lockfile
fi

echo "==> TypeScript compile check"
cd "$WORKSPACE_DIR"
pnpm tsc --noEmit

echo "==> Running tests"
pnpm test

echo "==> Running lint"
pnpm lint

echo ""
echo "Scaffold smoke test passed"
