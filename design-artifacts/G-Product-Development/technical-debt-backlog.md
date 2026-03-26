# Technical Debt Backlog

Single source of truth for all known technical debt. Updated 2026-03-26.

## Open Items

### HIGH — Fix before next feature epic

No high-priority items remaining.

### MEDIUM — Address during next epic

| # | Item | Source | Impact | Effort | Notes |
|---|------|--------|--------|--------|-------|
| ~~3~~ | ~~`packages/` in `.gitignore`~~ | Story 2.7 | — | — | **Resolved** — `git check-ignore` confirms files are not ignored. Re-inclusion rules work correctly. |
| 4 | **Unhandled rejection warning in useQuery.test.ts** | Story 2.5 | Test console noise only; no production impact | Low | Pre-existing async warning. Suppress or fix the unhandled promise in the test. |
| 5 | **Status bar placeholder segments** | Epic 1 | Last-command and connection segments show em-dash placeholders | Low | Replace with live data once CQRS command tracking and connection health are wired to the status bar. |
| 6 | **Native HTML select for tenant switching** | Epic 1 | StatusBar uses `<select>` instead of `@hexalith/ui` Select component | Low | Functional but inconsistent with design system. Swap to `Select` from `@hexalith/ui` for visual consistency. |

### LOW — Nice to have

| # | Item | Source | Impact | Effort | Notes |
|---|------|--------|--------|--------|-------|
| 7 | **Manual browser verification not performed** | Epic 1 | Automated tests pass but no human visual QA recorded | Low | Consider adding a manual QA checklist to the PR template. |

## Resolved Items

Kept for historical reference. No action needed.

| Item | Source | Resolution |
|------|--------|------------|
| No git hooks | Epic 1, Epic 2 | Husky + lint-staged installed (commit `c2127b1`) |
| `AbortSignal.any` jsdom incompatibility | Story 2.4 | Replaced with `setTimeout`-based abort |
| contrastMatrix test brittleness | Epic 1 | Fixed in Story 1.8 |
| Responsive sidebar collapse | Epic 1 | Fully implemented with media query breakpoint |
| Coverage gates (80%/95%) | Epic 1 | 95% for foundation packages, 80% for modules/apps — enforced in CI |
| No consolidated debt backlog | Epic 1, Epic 2 | This file |
| Stylelint plugin build-order dependency | Epic 2 retro | Pre-commit hook now builds UI package before lint-staged |
| Import-order errors in test files | Stories 2.5, 2.6 | Fixed via `eslint --fix` (Button.spec.tsx) |
| `packages/` in `.gitignore` | Story 2.7 | Verified: `git check-ignore` confirms re-inclusion rules work correctly |

## How to Use This File

- **Before sprint planning:** Review open items and pick 1-2 to include in the sprint.
- **After an epic:** Add new debt items discovered during retrospective.
- **When resolving:** Move the item to Resolved with a one-line resolution note.
