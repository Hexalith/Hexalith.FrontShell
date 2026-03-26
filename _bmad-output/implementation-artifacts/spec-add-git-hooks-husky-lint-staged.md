---
title: 'Add git hooks with husky and lint-staged'
type: 'chore'
created: '2026-03-25'
status: 'done'
baseline_commit: 'cf1a3d5'
context: ['docs/testing-strategy.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Lint violations (import ordering, type imports, restricted imports) reach CI instead of being caught locally. This has been a recurring pain point across 17 stories in Epics 1-2, committed as an action item in two consecutive retrospectives without being addressed.

**Approach:** Install husky for git hook management and lint-staged for running ESLint and Stylelint on staged files only. Pre-commit hook catches violations before they reach the remote.

## Boundaries & Constraints

**Always:**
- Use `husky` (v9+) and `lint-staged` (v15+) as root devDependencies
- Only lint staged files (not the entire repo) for fast commits
- Run ESLint on `.ts`, `.tsx`, `.js` files and Stylelint on `.css` files
- Hook must work with pnpm (not npm/yarn)
- The `.husky/` directory must be committed to git

**Ask First:**
- Whether to add `--fix` flag (auto-fix on commit) vs fail-only
- Whether to also run `tsc --noEmit` on staged files (type checking adds latency)

**Never:**
- Do not run the full `pnpm lint` turbo pipeline in the hook (too slow)
- Do not add formatting tools (prettier) — not part of the current stack
- Do not modify ESLint or Stylelint rules
- Do not fix existing lint errors in this spec — that's a separate task

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Clean commit | Staged `.ts` files pass lint | Commit proceeds | N/A |
| Lint violation | Staged `.ts` file has import order error | Commit blocked, violations printed | Exit code 1, user fixes and re-stages |
| Non-lintable files only | Staged `.md` or `.yaml` files | Commit proceeds (no lint runs) | N/A |
| Husky skip | `HUSKY=0 git commit` | Hook skipped, commit proceeds | N/A |
| Empty staging | `git commit --allow-empty` | No lint runs, commit proceeds | N/A |

</frozen-after-approval>

## Code Map

- `package.json` -- Root package.json: add husky + lint-staged devDependencies and `prepare` script
- `.husky/pre-commit` -- Husky pre-commit hook: invokes lint-staged
- `.lintstagedrc.json` -- Lint-staged config: file pattern → command mapping

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- Add `husky` and `lint-staged` as root devDependencies, add `"prepare": "husky"` script -- enables hook installation on `pnpm install`
- [x] `.husky/pre-commit` -- Create pre-commit hook running `pnpm exec lint-staged` -- triggers lint-staged on every commit
- [x] `.lintstagedrc.json` -- Create lint-staged config: `*.{ts,tsx,js}` → `eslint`, `*.css` → `stylelint` -- scopes linting to staged files by type
- [x] `pnpm install` -- Run install to trigger husky `prepare` script and initialize `.husky/` -- ensures hooks are active

**Acceptance Criteria:**
- Given a staged `.ts` file with an import ordering violation, when `git commit` is run, then the commit is blocked and the ESLint error is displayed
- Given a staged `.ts` file with no lint errors, when `git commit` is run, then the commit succeeds
- Given only `.md` files are staged, when `git commit` is run, then no lint runs and the commit succeeds
- Given `HUSKY=0` is set, when `git commit` is run, then the hook is bypassed

## Verification

**Commands:**
- `pnpm install` -- expected: husky `prepare` script runs, `.husky/` directory exists with pre-commit hook
- `echo "test" > /tmp/test.ts && git add /tmp/test.ts` -- expected: lint-staged runs ESLint on the staged file during commit attempt

## Suggested Review Order

- `prepare` script + devDependencies wire husky into the install lifecycle
  [`package.json:20`](../../package.json#L20)

- Pre-commit hook delegates to lint-staged — single line, no logic
  [`.husky/pre-commit:1`](../../.husky/pre-commit#L1)

- Glob-to-command mapping scopes linting to staged files by extension
  [`.lintstagedrc.json:1`](../../.lintstagedrc.json#L1)
