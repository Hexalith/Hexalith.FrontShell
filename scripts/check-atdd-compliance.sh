#!/usr/bin/env bash
set -euo pipefail

# check-atdd-compliance.sh
# Ensures implementation PRs include corresponding acceptance tests.
# CI runs this on pull requests; run manually for direct-to-main workflows.
#
# Usage: bash scripts/check-atdd-compliance.sh [--help]
#
# Environment:
#   PR_TITLE - Optional. Set by CI. If contains [hotfix], bypasses all checks.
#
# Exit codes:
#   0 - Compliant (tests present or PR exempt)
#   1 - Non-compliant (source files without corresponding tests)

if [[ "${1:-}" == "--help" ]]; then
  echo "Usage: bash scripts/check-atdd-compliance.sh"
  echo ""
  echo "Validates that implementation PRs include corresponding test files."
  echo "Source files in packages/*/src/, modules/*/src/, apps/*/src/ must have"
  echo "matching .test.* or .spec.* files when modified."
  echo ""
  echo "Exempt PRs: docs, config, CI files only."
  echo "Exempt sources: index.ts, types.ts, *.d.ts, *.css, testing files."
  echo "Bypass: Set PR_TITLE containing [hotfix] to skip checks."
  exit 0
fi

# ─── Hotfix bypass ───
if [[ -n "${PR_TITLE:-}" ]] && echo "$PR_TITLE" | grep -qi '\[hotfix\]'; then
  echo "⚡ [hotfix] detected in PR title — ATDD check bypassed"
  exit 0
fi

# ─── Change discovery helpers ───
add_changed_files() {
  local output="$1"
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    CHANGED_FILES+="$file"$'\n'
  done <<< "$output"
}

BASELINE_REF=""
if git rev-parse --verify --quiet origin/main >/dev/null; then
  BASELINE_REF="origin/main"
elif git rev-parse --verify --quiet main >/dev/null; then
  BASELINE_REF="main"
else
  GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never git -c credential.interactive=never fetch origin main --depth=1 >/dev/null 2>&1 || true
  if git rev-parse --verify --quiet origin/main >/dev/null; then
    BASELINE_REF="origin/main"
  fi
fi

# ─── Get changed files (PR diff + local staged/unstaged/untracked support) ───
CHANGED_FILES=""

if [[ -n "$BASELINE_REF" ]]; then
  add_changed_files "$(git diff --name-only --diff-filter=ACMR "$BASELINE_REF"...HEAD 2>/dev/null || true)"
fi

add_changed_files "$(git diff --name-only --diff-filter=ACMR 2>/dev/null || true)"
add_changed_files "$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)"
add_changed_files "$(git ls-files --others --exclude-standard 2>/dev/null || true)"

CHANGED_FILES=$(printf '%s' "$CHANGED_FILES" | sed '/^$/d' | sort -u)

if [[ -z "$CHANGED_FILES" ]]; then
  echo "✅ No changed files detected — ATDD check passed"
  exit 0
fi

# ─── Check if ALL changed files are exempt (docs, config, CI) ───
HAS_NON_EXEMPT=false
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  case "$file" in
    docs/*|*.md|.github/*|scripts/*|*.yaml|*.yml|*.json|*.config.*) continue ;;
  esac
  HAS_NON_EXEMPT=true
  break
done <<< "$CHANGED_FILES"

if [[ "$HAS_NON_EXEMPT" == "false" ]]; then
  echo "✅ All changes are exempt (docs/config/CI) — ATDD check passed"
  exit 0
fi

# ─── Collect source files that need tests ───
SOURCE_FILES=""
while IFS= read -r file; do
  [[ -z "$file" ]] && continue

  # Must be in src/ directory of packages, modules, or apps
  case "$file" in
    packages/*/src/*|modules/*/src/*|apps/*/src/*) ;;
    *) continue ;;
  esac

  # Skip test files themselves
  case "$file" in
    *.test.*|*.spec.*) continue ;;
  esac

  # Source file exemptions
  basename=$(basename "$file")
  case "$basename" in
    index.ts|index.tsx) continue ;;
    types.ts|*.d.ts) continue ;;
    *.css|*.module.css) continue ;;
    testing.ts) continue ;;
  esac

  # Skip testing utility directories
  case "$file" in
    */testing/*) continue ;;
  esac

  SOURCE_FILES+="$file"$'\n'
done <<< "$CHANGED_FILES"

# Remove trailing newline
SOURCE_FILES=$(echo "$SOURCE_FILES" | sed '/^$/d')

if [[ -z "$SOURCE_FILES" ]]; then
  echo "✅ No testable source files changed — ATDD check passed"
  exit 0
fi

# ─── Collect changed test files ───
TEST_FILES=""
while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  case "$file" in
    *.test.*|*.spec.*) TEST_FILES+="$file"$'\n' ;;
  esac
done <<< "$CHANGED_FILES"

# ─── Check each source file has a corresponding test ───
VIOLATIONS=""
VIOLATION_COUNT=0

while IFS= read -r src_file; do
  [[ -z "$src_file" ]] && continue

  src_without_ext="${src_file%.*}"
  src_dir=$(dirname "$src_file")
  src_basename=$(basename "$src_without_ext")

  HAS_TEST=false
  if [[ -n "$TEST_FILES" ]]; then
    while IFS= read -r test_file; do
      [[ -z "$test_file" ]] && continue
      case "$test_file" in
        "$src_without_ext".test.ts|"$src_without_ext".test.tsx|"$src_without_ext".spec.ts|"$src_without_ext".spec.tsx)
          HAS_TEST=true
          break
          ;;
      esac

      test_dir=$(dirname "$test_file")
      test_name=$(basename "$test_file")
      if [[ "$test_dir" == "$src_dir" ]] && [[ "$test_name" =~ ^${src_basename}\.(test|spec)\.(ts|tsx)$ ]]; then
        HAS_TEST=true
        break
      fi
    done <<< "$TEST_FILES"
  fi

  if [[ "$HAS_TEST" == "false" ]]; then
    VIOLATIONS+="  ✗ $src_file"$'\n'
    VIOLATION_COUNT=$((VIOLATION_COUNT + 1))
  fi
done <<< "$SOURCE_FILES"

if [[ $VIOLATION_COUNT -gt 0 ]]; then
  echo "❌ ATDD Compliance Check FAILED" >&2
  echo "" >&2
  echo "Source files modified without corresponding test files:" >&2
  echo "" >&2
  echo "$VIOLATIONS" >&2
  echo "For each source file, add or update a corresponding .test.* or .spec.* file." >&2
  echo "" >&2
  echo "Exemptions: docs/config/CI only PRs, index.ts, types.ts, *.d.ts, *.css, testing files." >&2
  echo "Bypass: Add [hotfix] to the PR title for emergency changes." >&2
  echo "" >&2
  echo "Summary: $VIOLATION_COUNT source file(s) without tests" >&2
  exit 1
fi

echo "✅ ATDD Compliance Check PASSED — all source files have corresponding tests"
exit 0
