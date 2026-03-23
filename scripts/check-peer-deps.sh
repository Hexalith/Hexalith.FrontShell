#!/usr/bin/env bash
# check-peer-deps.sh
# Validates that modules' @hexalith/* peerDependency version ranges
# are satisfied by the current workspace package versions.
#
# In workspace context, workspace:* devDependencies bypass pnpm's
# peer dependency version validation. This script catches mismatches
# that would only surface when the module is used outside the workspace.
set -euo pipefail

ERRORS=0

# Get workspace foundation package versions
SHELL_API_VER=$(node -p "require('./packages/shell-api/package.json').version")
CQRS_CLIENT_VER=$(node -p "require('./packages/cqrs-client/package.json').version")
UI_VER=$(node -p "require('./packages/ui/package.json').version")

echo "Foundation package versions:"
echo "  @hexalith/shell-api: $SHELL_API_VER"
echo "  @hexalith/cqrs-client: $CQRS_CLIENT_VER"
echo "  @hexalith/ui: $UI_VER"
echo ""

# Check each module in modules/
for MODULE_PKG in modules/*/package.json; do
  [ -f "$MODULE_PKG" ] || continue

  MODULE_NAME=$(node -p "require('./$MODULE_PKG').name")
  echo "Checking $MODULE_NAME..."

  # Check each @hexalith/* peerDependency
  for PKG_KEY in shell-api cqrs-client ui; do
    PEER_RANGE=$(node -p "try { require('./$MODULE_PKG').peerDependencies?.['@hexalith/$PKG_KEY'] || '' } catch { '' }")
    [ -z "$PEER_RANGE" ] && continue

    case "$PKG_KEY" in
      shell-api) ACTUAL_VER="$SHELL_API_VER" ;;
      cqrs-client) ACTUAL_VER="$CQRS_CLIENT_VER" ;;
      ui) ACTUAL_VER="$UI_VER" ;;
    esac

    # Use node's semver.satisfies to check if actual version matches the peer range
    SATISFIES=$(node -e "
      const semver = require('semver');
      process.stdout.write(semver.satisfies('$ACTUAL_VER', '$PEER_RANGE') ? 'true' : 'false');
    " 2>/dev/null || echo "error")

    if [ "$SATISFIES" = "error" ]; then
      # semver not available, fall back to a simple check via npx
      SATISFIES=$(npx --yes semver "$ACTUAL_VER" -r "$PEER_RANGE" > /dev/null 2>&1 && echo "true" || echo "false")
    fi

    if [ "$SATISFIES" = "false" ]; then
      echo "  ERROR: Module $MODULE_NAME requires @hexalith/$PKG_KEY $PEER_RANGE but workspace has $ACTUAL_VER"
      echo "         Update your peerDependency version in $MODULE_PKG"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "FAILED: $ERRORS peer dependency mismatch(es) found"
  exit 1
else
  echo "OK: All module peer dependencies match workspace versions"
fi
