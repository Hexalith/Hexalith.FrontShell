# Deferred Work

## Consolidate Technical Debt Backlog

**Source:** Epic 2 Retrospective (2026-03-25), Action Item #3 (2nd carry from Epic 1)
**Owner:** Bob (Scrum Master)
**Priority:** Blocking — must complete before next sprint planning

**Description:** Gather all technical debt items from Epic 1 retro, Epic 2 retro, and individual story files (2.1-2.9) into a single markdown tracking file. Each item should include source story, priority, impact, and status.

**Known debt items to consolidate:**
- No git hooks (Epic 1, confirmed Epic 2) — being addressed separately
- `packages/` in `.gitignore` (Story 2.7)
- Pre-existing import-order errors in test files (Stories 2.5, 2.6)
- Coverage gates deferred >=80%/>=95% (Epic 1)
- `AbortSignal.any` incompatible with jsdom (Story 2.4)
- Unhandled rejection in useQuery.test.ts (Story 2.5)
- No consolidated tech debt backlog (Epic 1, confirmed Epic 2)
- contrastMatrix test brittleness (Epic 1, fixed in 1.8)
- Manual browser verification skipped (Epic 1)
- Responsive sidebar collapse deferred (Epic 1)
- Native HTML select for tenant switching (Epic 1, deferred to Epic 3)
- Placeholder segments in status bar (Epic 1)
- Stylelint plugin path (`./packages/ui/dist/tokenCompliance.js`) requires built dist file — pre-existing ordering dependency (surfaced during git hooks review)
