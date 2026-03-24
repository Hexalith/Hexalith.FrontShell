# Testing Strategy

Last reviewed: 2026-03-23

## Test Pyramid Ratios

Risk-calibrated guidance per epic type:

| Epic Type             | Unit | Integration | E2E |
| --------------------- | ---- | ----------- | --- |
| API/integration-heavy | 30%  | 50%         | 20% |
| UI-heavy              | 20%  | 30%         | 50% |
| Default balanced      | 60%  | 30%         | 10% |

Ratios are guidelines, not rigid targets. Optimize for confidence in the areas of highest risk.

## Priority Classification

- **P0** — Security, authentication, data integrity. Must be tested; failures block release.
- **P1** — Core user workflows (CRUD, navigation, command submission). Must be tested.
- **P2** — Edge cases, error recovery, degraded states. Should be tested.
- **P3** — Cosmetic, nice-to-have behaviors. Test if time permits.

## Test File Conventions

| Pattern             | Framework  | Placement                                                      |
| ------------------- | ---------- | -------------------------------------------------------------- |
| `.test.ts(x)`       | Vitest     | Co-located with source                                         |
| `.spec.ts(x)`       | Playwright | E2E in `apps/shell/e2e/`, CT co-located in `packages/ui/`      |
| `.contract.test.ts` | Vitest     | Bus-level in `mocks/__contracts__/`, API-level in `contracts/` |

All tests are co-located with their source files. No `__tests__/` directories.

## Test Reliability Standards

Five checks enforced by `scripts/check-test-quality.ts`:

1. **Deterministic** — No `setTimeout()`, `setInterval()`, `new Date()`, `Date.now()` unless using `vi.useFakeTimers()` or in mock/fixture files. Prefer timing injection over global mocking (lesson from Story 6-5).
2. **Isolated** — `beforeAll` must have matching `afterAll` cleanup. No shared mutable state between tests.
3. **Explicit** — Every test file with `it()`/`test()` blocks must contain at least one `expect()` assertion.
4. **Focused** — Test files ≤ 300 lines (warn at 250).
5. **Fast** — No network client imports (`fetch`, `axios`, `ky`, `node-fetch`, `undici`) in test files. Allowed in `__contracts__/` and `contracts/` directories.

Inline suppression: add `// quality-ignore` on the line before a violation.

## Quality Standards Validation

Run locally:

```bash
# Check only changed files (default)
pnpm check:test-quality

# Check all test files
pnpm check:test-quality --all
```

CI runs `--changed-only` on pull requests (blocking for new/modified tests).

## AC Marker Convention (Traceability)

Format: `// AC: story-id#criterion`

Place markers at the top of the file (after imports) or on the `describe()` block:

```typescript
// AC: 6-3#2 — Tenant list page renders table with data
describe('TenantListPage', () => { ... });
```

- Multiple markers per file are allowed (file covers multiple criteria).
- Convention is for incremental adoption — not enforced by CI in v1.

### On-Demand Traceability Verification

```bash
# List all AC markers across test files
grep -r "// AC:" --include="*.test.*" --include="*.spec.*" packages/ modules/ apps/ | sort

# Count AC markers per story
grep -roh "// AC: [0-9]-[0-9]" --include="*.test.*" --include="*.spec.*" packages/ modules/ apps/ | sort | uniq -c | sort -rn
```

Quality gate guidance:

- **PASS** — All ACs for the current epic have markers.
- **CONCERNS** — >90% mapped.
- **FAIL** — <90% mapped.

**Note:** A full TypeScript traceability matrix script can be added when AC marker adoption is widespread. The grep commands above achieve 80% of the value at zero maintenance cost.

**Recommendation:** Update the create-story workflow template to include AC marker guidance for future stories.

## Contract Testing

Two distinct contract testing layers:

### Bus-Level Contracts (existing)

Location: `packages/cqrs-client/src/mocks/__contracts__/`

Validates that `MockCommandBus` and any real `ICommandBus` implementation behave identically. Tests interface method signatures, return types, error types. Prevents mock/real divergence.

### API-Level Consumer Contracts (new)

Location: `packages/cqrs-client/src/contracts/`

Validates that the frontend's HTTP code sends requests and handles responses according to the expected backend API contract:

- `POST /api/v1/commands` → 202 Accepted with `{ correlationId }`
- `GET /api/v1/commands/status/{id}` → status polling with `CommandStatusResponse`
- `POST /api/v1/queries` → 200 OK with Zod-validatable body
- Error responses → RFC 9457 ProblemDetails format

Consumer contracts validate frontend expectations only. Provider verification (running contracts against the real Hexalith backend) requires a running backend and is out of scope for MVP.

## ATDD CI Enforcement

`scripts/check-atdd-compliance.sh` runs on PRs to ensure implementation changes include corresponding tests.

Exempt PRs: docs, config, CI-only changes.
Exempt sources: `index.ts`, `types.ts`, `*.d.ts`, `*.css`, testing files.

### Emergency Bypass

Add `[hotfix]` to the PR title to bypass the ATDD check entirely. Hotfix testing is handled post-incident.

### Solo-Dev Workflow

For direct-to-main workflows (no PRs), run manually:

```bash
bash scripts/check-atdd-compliance.sh
```

## Coverage Thresholds

Enforced via per-package `vitest.config.ts`:

- Foundation packages (`shell-api`, `cqrs-client`, `ui`): **95%**
- Modules and apps: **80%**

## Assumptions & Limitations

- Traceability matrix only tracks work that goes through BMAD story files. Ad-hoc work or hotfixes without stories won't appear.
- Consumer contract tests validate frontend expectations only. Provider verification requires a running backend (out of scope for MVP).
- CI gates (ATDD check, test quality) only run on PRs. For direct-to-main workflows, run scripts manually.
