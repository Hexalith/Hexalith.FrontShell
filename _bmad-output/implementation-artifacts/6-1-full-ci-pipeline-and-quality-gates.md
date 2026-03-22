# Story 6.1: Full CI Pipeline & Quality Gates

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a shell team developer,
I want a comprehensive CI pipeline that enforces all quality gates on every PR,
so that broken manifests, token violations, accessibility regressions, and insufficient test coverage are caught before merging.

## Acceptance Criteria

1. **AC1 — Full PR gate sequence.** Given the GitHub Actions PR pipeline is expanded from Story 1.8, when a PR is opened or updated, then the pipeline executes the full gate sequence: (1) Checkout with `submodules: recursive`, (2) Install `pnpm install --frozen-lockfile`, (3) Build `turbo build` — cached, parallel, (4) Lint `turbo lint` — ESLint + Stylelint + token compliance, (5) Test `turbo test` — Vitest + Playwright CT with `@axe-core/playwright`, (6) Coverage gate ≥ 80% modules / ≥ 95% foundation packages, (7) Scaffold smoke test — scaffold temp module → compile → run scaffolded test → green, (8) Manifest validation — TypeScript compile — invalid manifests fail, (9) Design System Health gate — token parity, contrast matrix, a11y, prop budget, import boundaries, inline style ban.

2. **AC2 — Coverage gate enforcement.** Given a module has test coverage below 80%, when the coverage gate runs, then the pipeline fails with a message identifying the module and its current coverage percentage. Foundation packages (`@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`) below 95% coverage also fail.

3. **AC3 — Scaffold smoke test.** Given the scaffold smoke test runs, when `create-hexalith-module` generates a temporary module, then the generated module compiles without errors, the generated tests pass, and template drift (scaffold produces broken output) is caught immediately.

4. **AC4 — Design System Health score in PR.** Given the Design System Health gate runs, when any violation is detected (non-token values, parity mismatch, a11y failure, prop budget exceeded), then a single Design System Health score is displayed in the PR, where 100% = pass and any violation = fail with specific remediation guidance.

5. **AC5 — Migration coexisting warning mode.** Given a module has `migrationStatus: "coexisting"` in its manifest, when the Design System Health gate runs for that module, then the gate runs in warning mode — violations reported but do not block merge — and the compliance score is still displayed to track migration progress.

6. **AC6 — Main branch pipeline.** Given the main branch pipeline runs on push and all checks pass, then: the shell production build is generated (Vite production build), a Docker image is produced (shell app served by nginx), and Turborepo remote caching is used for cross-run efficiency.

**FRs covered:** FR48

## Tasks / Subtasks

- [x] Task 1: Configure Vitest coverage collection and thresholds (AC: #1, #2)
  - [x] 1.1: Update root `vitest.config.ts` — add coverage configuration:
    - Provider: `v8` (built into Vitest, no extra dependency)
    - Enable coverage in CI via `coverage.enabled` controlled by env var or CLI flag `--coverage`
    - Set global thresholds: `branches: 80, functions: 80, lines: 80, statements: 80`
    - Configure per-package threshold overrides for foundation packages:
      - `packages/shell-api`: 95% all metrics
      - `packages/cqrs-client`: 95% all metrics
      - `packages/ui`: 95% all metrics (unit tests only — Playwright CT coverage handled separately)
    - Include patterns: `src/**/*.{ts,tsx}` per package
    - Exclude patterns: `**/*.test.{ts,tsx}`, `**/*.spec.{ts,tsx}`, `**/*.stories.{ts,tsx}`, `**/test-setup.ts`, `**/index.ts` (barrel re-exports), `**/testing.ts`
    - Output reporters: `text-summary` (CI console), `json-summary` (machine-readable for PR comment)
    - `coverage.reportOnFailure: true` — still generate report even when thresholds fail (so dev sees what's missing)
  - [x] 1.2: Update per-package `vitest.config.ts` files — ensure each package can be individually checked:
    - `packages/shell-api/vitest.config.ts` — add `coverage.thresholds: { branches: 95, functions: 95, lines: 95, statements: 95 }`
    - `packages/cqrs-client/vitest.config.ts` — same 95% thresholds
    - `packages/ui/vitest.config.ts` — same 95% thresholds (unit project only)
    - `apps/shell/vitest.config.ts` — 80% thresholds (module-level)
    - `tools/create-hexalith-module/vitest.config.ts` — 80% thresholds
  - [x] 1.3: Test locally: `pnpm turbo test -- --coverage` — verify thresholds report correctly, identify any packages below threshold and note for team awareness (do NOT pad tests to meet threshold — just ensure the gate works)

- [x] Task 2: Add scaffold smoke test to CI (AC: #1, #3)
  - [x] 2.1: Create `scripts/scaffold-smoke-test.sh`:
    - Create temp directory: `TMPDIR=$(mktemp -d)`
    - Run scaffold: `node tools/create-hexalith-module/dist/index.js --name smoke-test-module --output "$TMPDIR" --non-interactive` (add `--non-interactive` flag if not yet supported — see 2.2)
    - Install deps in temp module: `cd "$TMPDIR/smoke-test-module" && pnpm install --frozen-lockfile`
    - TypeScript compile check: `pnpm tsc --noEmit`
    - Run scaffolded tests: `pnpm test`
    - Run ESLint: `pnpm lint`
    - Cleanup: `rm -rf "$TMPDIR"`
    - Exit with appropriate code on any step failure
  - [x] 2.2: Check `tools/create-hexalith-module/src/` for interactive prompts — if scaffold uses `inquirer` or `readline`, add a `--non-interactive` / `--ci` flag that accepts all defaults (module name from `--name`, skip prompts). The CLI already takes positional args; verify it can run headlessly
  - [x] 2.3: Add `scaffold-smoke-test` step to CI workflow (see Task 5)

- [x] Task 3: Add manifest TypeScript compile gate to CI (AC: #1, #8)
  - [x] 3.1: Verify `apps/shell/tsconfig.build.json` exists and includes `modules/*/src/manifest.ts` — this file was created in Story 5-5. Confirm it type-checks manifest files correctly:
    - Run locally: `cd apps/shell && pnpm tsc --project tsconfig.build.json --noEmit`
    - If this fails on valid manifests, fix the tsconfig paths
  - [x] 3.2: Add `manifest-typecheck` step to CI workflow (see Task 5)
  - [x] 3.3: Ensure `apps/shell/src/build/manifestValidationPlugin.ts` (Vite plugin from Story 5-5) continues to run at `buildStart` — the CI `turbo build` already triggers this. Document that build-time validation is two-tier: (1) TypeScript type-check via tsconfig.build.json, (2) semantic validation via Vite plugin

- [x] Task 4: Enhance Design System Health gate reporting (AC: #4, #5)
  - [x] 4.1: Update `packages/ui/scripts/design-system-health.ts`:
    - Output a machine-readable JSON summary alongside human-readable console output:
      - `{ "score": 98.5, "total": 200, "violations": 3, "details": [...], "tokenParity": "pass", "propBudget": "pass" }`
      - Write to `packages/ui/health-report.json`
    - Support `--warn-only` flag for modules with `migrationStatus: "coexisting"` — runs all checks but exits 0 on violations, still reports score
  - [x] 4.2: Create `scripts/post-health-comment.sh` (or integrate into CI step):
    - Read `packages/ui/health-report.json`
    - Format as GitHub step summary (`$GITHUB_STEP_SUMMARY`) so the score appears in the PR checks UI:

      ```text
      ## Design System Health: 98.5%
      - Token Compliance: 100% (150/150 declarations)
      - Token Parity (Light/Dark): PASS
      - Prop Budget: PASS (0 components over budget)
      - Violations: 3 (see details below)
      ```

    - This uses `$GITHUB_STEP_SUMMARY` (native GitHub Actions) — no external action needed

  - [x] 4.3: If manifest `migrationStatus` field exists in `@hexalith/shell-api` types, wire up the health gate to check it. If not defined yet, add `migrationStatus?: "native" | "coexisting" | "migrating"` to `ModuleManifest` type in `packages/shell-api/src/manifest/types.ts` and pass `--warn-only` for coexisting modules

- [x] Task 5: Update `.github/workflows/ci.yml` — Full PR pipeline (AC: #1, #2, #3, #4, #8)
  - [x] 5.1: Add coverage gate step **after** the existing Test step:

    ```yaml
    - name: Test with Coverage
      run: pnpm turbo test -- --coverage
    ```

    Replace the existing `pnpm turbo test` step. Vitest thresholds (from Task 1) fail the step automatically if below threshold

  - [x] 5.2: Add scaffold smoke test step:

    ```yaml
    - name: Scaffold Smoke Test
      run: bash scripts/scaffold-smoke-test.sh
    ```

  - [x] 5.3: Add manifest TypeScript compile step:

    ```yaml
    - name: Manifest Type Check
      run: cd apps/shell && pnpm tsc --project tsconfig.build.json --noEmit
    ```

    Place BEFORE the Build step — fail early on manifest type errors before running the full build

  - [x] 5.4: Update Design System Health step to write step summary:

    ```yaml
    - name: Design System Health
      run: |
        pnpm --filter @hexalith/ui health
        bash scripts/post-health-comment.sh
    ```

  - [x] 5.5: Verify step ordering in final CI file matches the gate sequence from AC1:
    1. Checkout (existing)
    2. Setup pnpm + Node (existing)
    3. Install (existing)
    4. Manifest Type Check (new — Task 3)
    5. Build (existing)
    6. Lint (existing)
    7. Test with Coverage (updated — Task 1)
    8. Scaffold Smoke Test (new — Task 2)
    9. Storybook Build (existing)
    10. Playwright Component Tests (existing)
    11. Design System Health with summary (updated — Task 4)
    12. Build time regression (existing, main only)
    13. Artifact upload (existing, main only)

- [x] Task 6: Add main branch pipeline enhancements (AC: #6)
  - [x] 6.1: Create `Dockerfile` at repo root:

    ```dockerfile
    FROM node:22-alpine AS builder
    WORKDIR /app
    COPY . .
    RUN corepack enable && pnpm install --frozen-lockfile
    RUN pnpm turbo build --filter=shell

    FROM nginx:alpine
    COPY --from=builder /app/apps/shell/dist /usr/share/nginx/html
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    EXPOSE 80
    ```

    - The `COPY . .` is fine because submodules are checked out in CI before Docker build
    - **Do NOT add secrets to Docker image** — runtime config via `/config.json` ConfigMap

  - [x] 6.2: Create `nginx.conf` at repo root:
    - SPA fallback: `try_files $uri $uri/ /index.html;`
    - Gzip compression for `text/html`, `application/javascript`, `text/css`, `application/json`
    - Cache headers: `*.js`, `*.css` → `Cache-Control: public, max-age=31536000, immutable` (Vite content-hashes filenames)
    - `index.html` → `Cache-Control: no-cache` (always fresh entry point)
    - `/config.json` → `Cache-Control: no-cache` (runtime config, may change per deploy)
    - Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
  - [x] 6.3: Add Docker build step to CI (main branch only):

    ```yaml
    - name: Build Docker Image
      if: github.ref == 'refs/heads/main' && success()
      run: |
        docker build -t hexalith-frontshell:${{ github.sha }} .
        docker tag hexalith-frontshell:${{ github.sha }} hexalith-frontshell:latest
    ```

    Note: Docker push to a registry is out of scope for this story — that requires registry credentials and deployment infrastructure. Just build and verify the image is valid

  - [x] 6.4: Document Turborepo remote caching setup in CI file comments — the env vars `TURBO_TOKEN` and `TURBO_TEAM` are already referenced; add a step summary note when remote caching is active:

    ```yaml
    - name: Report Remote Cache Status
      if: env.TURBO_TOKEN != ''
      run: echo "Turborepo remote caching is active (team: $TURBO_TEAM)" >> "$GITHUB_STEP_SUMMARY"
    ```

- [x] Task 7: Write tests for new CI components (AC: all)
  - [x] 7.1: Add test for scaffold smoke script — create `scripts/scaffold-smoke-test.test.sh` or integrate into existing test suite:
    - Verify the script can run in dry-run mode locally
    - The real validation happens in CI; local test just ensures the script is syntactically valid and the CLI is callable
  - [x] 7.2: Verify coverage thresholds work — run `pnpm turbo test -- --coverage` locally, confirm:
    - Foundation packages report coverage percentages
    - Threshold failures produce clear error messages with package name and metric
  - [x] 7.3: Verify manifest typecheck — run `cd apps/shell && pnpm tsc --project tsconfig.build.json --noEmit` locally, confirm:
    - Valid manifests pass
    - Intentionally broken manifest (wrong type) fails with clear error
  - [x] 7.4: Verify design system health JSON output — run `pnpm --filter @hexalith/ui health` locally, confirm:
    - JSON report is written to `packages/ui/health-report.json`
    - Score, violations, and details are present

## Dev Notes

### What Already Exists (DO NOT recreate)

The current CI pipeline (`.github/workflows/ci.yml` from Story 1.8) already includes:

- Checkout with `submodules: recursive`
- pnpm + Node.js setup with caching
- `pnpm install --frozen-lockfile`
- `pnpm turbo build` with duration tracking
- `pnpm lint` (ESLint + Stylelint + token compliance via `scripts/run-stylelint.mjs`)
- `pnpm turbo test` (Vitest unit tests)
- `pnpm --filter @hexalith/ui build-storybook`
- Playwright browser install + `pnpm --filter @hexalith/ui test:ct` (component tests with axe-core)
- `pnpm --filter @hexalith/ui health` (design system health gate)
- Build time regression detection (main only, `.build-times.json` cache)
- Artifact upload of `apps/shell/dist/` (main only, 90-day retention)

**This story EXTENDS the existing pipeline — do not rewrite from scratch.**

### Existing Quality Gate Infrastructure

- **Token compliance**: `packages/ui/dist/tokenCompliance.js` — Stylelint plugin scanning for hardcoded colors/spacing/typography/motion. Runs via `scripts/run-stylelint.mjs` which computes compliance score
- **Design System Health**: `packages/ui/scripts/design-system-health.ts` — three checks: token compliance scan, light/dark token parity, prop budget (12 props simple / 20 props complex components)
- **Module boundaries**: `packages/eslint-config/module-boundaries.js` — blocks deep `@hexalith/*/src/**` imports, direct `@radix-ui` imports, CSS-in-JS
- **Module isolation**: `packages/eslint-config/module-isolation.js` — prevents cross-module dependencies, limits `@hexalith/*` imports to shell-api, cqrs-client, ui
- **Manifest validation**: `apps/shell/src/build/manifestValidationPlugin.ts` — Vite plugin running at `buildStart`, validates manifest schema + cross-module semantic rules (duplicate names, duplicate routes)
- **Manifest typecheck**: `apps/shell/tsconfig.build.json` — TypeScript-only check of `modules/*/src/manifest.ts` files

### Architecture Compliance

- **Build tooling**: Turborepo v2 with `tasks` (not legacy `pipeline`), pnpm workspaces
- **Test runners**: Vitest for `.test.ts(x)`, Playwright for `.spec.ts(x)` — NEVER mix runners
- **Coverage provider**: Vitest `v8` (built-in, no `@vitest/coverage-istanbul` needed)
- **Docker**: Multi-stage build — Node 22 builder + nginx:alpine runtime
- **No external CI services**: GitHub Actions only, Turborepo remote caching optional via Vercel
- **No GitHub Apps or bots**: Use native `$GITHUB_STEP_SUMMARY` for PR reporting, not external comment bots

### Library/Framework Requirements

- **Vitest**: v3.x — coverage via `vitest --coverage` flag, thresholds in `vitest.config.ts` under `test.coverage`
- **Turborepo**: v2.x — `turbo.json` uses `tasks` key. CLI: `turbo build`, `turbo test`, `turbo lint`
- **GitHub Actions**: `actions/checkout@v4`, `actions/setup-node@v4`, `pnpm/action-setup@v4`, `actions/cache@v4`, `actions/upload-artifact@v4`
- **Docker**: `node:22-alpine` builder, `nginx:alpine` runtime
- **pnpm**: v10.25.0 (from `package.json` packageManager field)
- **Node.js**: 22 (from `.nvmrc`)

### File Structure Requirements

```text
.github/workflows/
  ci.yml                          # UPDATE — add coverage, scaffold smoke, manifest check, Docker
Dockerfile                        # CREATE — multi-stage build
nginx.conf                        # CREATE — SPA routing + security headers
scripts/
  scaffold-smoke-test.sh          # CREATE — temp scaffold → compile → test → cleanup
  post-health-comment.sh          # CREATE — read health JSON → write $GITHUB_STEP_SUMMARY
  run-stylelint.mjs               # EXISTS — do not modify
packages/ui/
  scripts/design-system-health.ts # UPDATE — add JSON output to health-report.json
  health-report.json              # GENERATED — add to .gitignore
vitest.config.ts                  # UPDATE — add coverage config
packages/*/vitest.config.ts       # UPDATE — add per-package coverage thresholds
apps/shell/vitest.config.ts       # UPDATE — add coverage thresholds
```

### Testing Requirements

- All new scripts must be testable locally before CI integration
- Coverage thresholds: run `pnpm turbo test -- --coverage` — Vitest exits non-zero if thresholds fail
- Scaffold smoke test: run `bash scripts/scaffold-smoke-test.sh` locally
- Manifest typecheck: run `cd apps/shell && pnpm tsc --project tsconfig.build.json --noEmit` locally
- Design system health: run `pnpm --filter @hexalith/ui health` and verify JSON output
- Docker: run `docker build -t test .` locally to verify image builds
- DO NOT add tests that require a running GitHub Actions environment — all gates must be locally reproducible

### Previous Story Intelligence

**From Story 5-5 (Build-Time Manifest Validation):**

- Vite plugin pattern: `enforce: "pre"`, `buildStart` hook, `this.error()` to fail build
- TypeScript transform pattern: `esbuild.transform()` (not `.build()`), function constructor for execution
- `tsconfig.build.json` created for manifest-only TypeScript checking — reuse this in CI
- Cross-module detection defense-in-depth: TypeScript > ESLint > Vite plugin > Runtime guard
- Error message format: `[module-name] field: specific error` with actionable guidance

**From Story 5-4 (Navigation State Preservation):**

- `vi.useFakeTimers()` for timestamp/freshness tests — real `Date.now()` comparisons are flaky in CI
- Cache freshness pattern: `ETagCache.isFresh(key, maxAgeMs)` with timestamp at write time
- Version check pattern: `<meta name="hexalith-shell-version">` in `index.html`

**From Story 5-3 (Module Error Isolation):**

- Test pattern: use `vi.fn()` for error handler mocks, verify error boundary catches with `@testing-library/react`
- Module error isolation is catch-all — CI should verify error boundaries don't leak

### Git Intelligence

Recent commits show active work on:

- Manifest validation and loading (`3ce4c96`) — builds on Story 5-5
- Shell error boundary and module error handling (`22f217b`, `0771d18`) — Story 5-3
- Module developer documentation (`7d131d3`) — Story 4-6

The codebase has stabilized around the shell composition pattern. CI extension is the natural next step.

### Critical Anti-Patterns to Avoid

1. **DO NOT rewrite ci.yml from scratch** — extend the existing workflow. Read the current file first
2. **DO NOT use external GitHub Actions marketplace actions for coverage** — Vitest has built-in coverage thresholds. `--coverage` flag + `coverage.thresholds` in config is sufficient
3. **DO NOT create separate workflow files** — keep everything in one `ci.yml` to maintain the single gate sequence
4. **DO NOT use `jest` or `istanbul`** — this project uses Vitest with v8 coverage provider
5. **DO NOT add `@vitest/coverage-v8` or `@vitest/coverage-istanbul` packages** — Vitest v3 includes v8 coverage built-in. Verify by checking if `--coverage` works without extra deps first. If it requires the package, then add `@vitest/coverage-v8`
6. **DO NOT push Docker images in this story** — just build and verify locally. Registry push requires credentials setup (future story)
7. **DO NOT modify existing test files** — coverage thresholds are about configuration, not padding tests
8. **DO NOT use `actions/github-script` or PR comment bots** — use `$GITHUB_STEP_SUMMARY` for all CI reporting

### Project Structure Notes

- Alignment with unified project structure: scripts go in `scripts/`, Docker files at repo root, CI in `.github/workflows/`
- `health-report.json` is a generated artifact — add to `.gitignore`
- `Dockerfile` and `nginx.conf` at repo root following standard Docker convention
- No new packages or workspace changes needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — CI/CD Pipeline Architecture, Build Tooling, Quality Gates, Deployment Structure, Dockerfile, nginx.conf]
- [Source: _bmad-output/planning-artifacts/prd.md — FR48, NFR test quality standards, coverage gates, MTTD]
- [Source: .github/workflows/ci.yml — existing CI pipeline to extend]
- [Source: packages/ui/scripts/design-system-health.ts — existing health gate]
- [Source: scripts/run-stylelint.mjs — existing token compliance runner]
- [Source: apps/shell/tsconfig.build.json — manifest typecheck config from Story 5-5]
- [Source: apps/shell/src/build/manifestValidationPlugin.ts — Vite manifest validation plugin from Story 5-5]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Pre-existing test failure: `packages/ui/src/utils/CssLayerSmoke.test.ts` — times out running `pnpm run build` inside the test (also fails on clean main branch, not introduced by this story)
- Pre-existing test regression: `tools/create-hexalith-module/src/integration.test.ts` — expected `module-boundaries` but template uses `module-isolation` (fixed as part of this story)
- `@vitest/coverage-v8` required as explicit dependency — Vitest v3 does not bundle v8 coverage provider, contrary to initial assumption in story dev notes. Added `@vitest/coverage-v8@^3.2.4` to root devDependencies
- Coverage thresholds: shell-api currently at 93.58% lines / 77.14% functions (below 95% threshold). Per story instructions, thresholds are correctly configured but tests are not padded — the gate works as designed
- Review follow-up: fixed invalid YAML in `.github/workflows/ci.yml` remote cache summary step and made the Design System Health step run with summary reporting even when earlier quality gates fail
- Review follow-up: fixed Docker builder filter from `shell` to `@hexalith/shell` after verifying Turbo package resolution in the workspace
- Review follow-up: wired Design System Health warn-only mode to actual module manifest detection for `migrationStatus: "coexisting"`, added contrast-matrix reporting, and surfaced lint/a11y gate status in the unified report
- Review follow-up: added the missing scaffold smoke script test and hardened `scripts/scaffold-smoke-test.sh` cleanup/install behavior

### Completion Notes List

- **Task 1**: Configured Vitest v8 coverage with global 80% thresholds and per-package 95% overrides for foundation packages. Added `@vitest/coverage-v8@^3.2.4` dependency. All 6 vitest configs updated with coverage thresholds. Coverage gate verified working locally.
- **Task 2**: Created `scripts/scaffold-smoke-test.sh` that scaffolds into `modules/` workspace, installs, type-checks, tests, and lints. CLI already runs headlessly via positional arg — no `--non-interactive` flag needed.
- **Task 3**: Verified `apps/shell/tsconfig.build.json` exists and passes manifest typecheck. Two-tier validation documented: TypeScript check + Vite plugin semantic validation.
- **Task 4**: Enhanced `design-system-health.ts` with JSON report output (`health-report.json`), `--warn-only` flag for coexisting modules. Created `scripts/post-health-comment.sh` for GitHub step summary. Added `migrationStatus` optional field to `ModuleManifestV1` type.
- **Task 5**: Updated `ci.yml` with full gate sequence: manifest typecheck → build → lint → test with coverage → scaffold smoke → storybook → playwright CT → design system health with summary → remote cache status → (main only) Docker build + build time regression + artifact upload.
- **Task 6**: Updated existing `Dockerfile` to use `pnpm turbo build`. Enhanced `nginx.conf` with security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`), explicit index.html no-cache, and immutable asset caching. Docker build and remote cache status steps added to CI.
- **Task 7**: Verified all CI components locally: coverage thresholds produce clear error messages, manifest typecheck passes, health JSON report generated, scripts syntactically valid.
- **Fix**: Corrected pre-existing integration test assertion (`module-boundaries` → `module-isolation`) to match current template.
- **Review Fixes**: Repaired CI YAML parsing, corrected the Docker Turbo filter, made Design System Health reporting resilient and comprehensive enough to summarize lint/a11y/contrast outcomes, auto-enabled warn-only mode for coexisting modules, and added a test covering the scaffold smoke script contract.

### Change Log

- 2026-03-22: Story 6-1 implementation complete. Full CI pipeline with all quality gates configured.
- 2026-03-22: Review follow-ups addressed. Story moved from review to done after fixing CI workflow validity, Docker build filter, coexisting migration handling, and missing smoke-script test coverage.

### File List

- `.github/workflows/ci.yml` — MODIFIED: added manifest typecheck, coverage, scaffold smoke, docker build, health summary, remote cache status steps
- `.gitignore` — MODIFIED: added `health-report.json` to gitignore
- `Dockerfile` — MODIFIED: updated to use `pnpm turbo build --filter=@hexalith/shell`
- `nginx.conf` — MODIFIED: added security headers, explicit index.html caching, immutable asset caching
- `package.json` — MODIFIED: added `@vitest/coverage-v8` dev dependency
- `pnpm-lock.yaml` — MODIFIED: lockfile updated for new dependency
- `vitest.config.ts` — MODIFIED: added root-level coverage configuration (v8 provider, include/exclude, reporters, thresholds)
- `packages/shell-api/vitest.config.ts` — MODIFIED: added 95% coverage thresholds
- `packages/cqrs-client/vitest.config.ts` — MODIFIED: added 95% coverage thresholds
- `packages/ui/vitest.config.ts` — MODIFIED: added 95% coverage thresholds
- `apps/shell/vitest.config.ts` — MODIFIED: added 80% coverage thresholds
- `tools/create-hexalith-module/vitest.config.ts` — MODIFIED: added 80% coverage thresholds
- `packages/ui/scripts/design-system-health.ts` — MODIFIED: added JSON report output, `--warn-only` flag, `HealthReport` interface
- `packages/ui/scripts/design-system-health.ts` — MODIFIED: added contrast matrix reporting, external gate status capture, and automatic coexisting-module warn-only detection
- `packages/shell-api/src/manifest/manifestTypes.ts` — MODIFIED: added `migrationStatus` optional field to `ModuleManifestV1`
- `scripts/scaffold-smoke-test.sh` — NEW: scaffold smoke test script for CI
- `scripts/post-health-comment.sh` — NEW: design system health GitHub step summary writer
- `tools/create-hexalith-module/src/scaffoldSmokeScript.test.ts` — NEW: validates scaffold smoke script coverage of scaffold/install/typecheck/test/lint/cleanup steps
- `tools/create-hexalith-module/src/integration.test.ts` — MODIFIED: fixed pre-existing assertion (`module-boundaries` → `module-isolation`)
