# Story 6.2: Module Publishing via Git Integration

Status: ready-for-dev

## Story

As a module developer,
I want to publish my module to the shell by adding my git repository,
So that my module integrates into the shell without manual build configuration or code changes.

## Acceptance Criteria

1. **AC1 — Submodule Integration**
   - **Given** a module is developed as an independent git repository
   - **When** the shell team adds it as a git submodule in `modules/`
   - **Then** `git submodule add <repo-url> modules/<module-name>` adds the reference
   - **And** `.gitmodules` is updated with the submodule entry
   - **And** the submodule commit is pinned — CI always builds against the pinned version, not HEAD

2. **AC2 — Workspace Resolution**
   - **Given** the module is added to the workspace
   - **When** `pnpm-workspace.yaml` includes `modules/*`
   - **Then** pnpm resolves the module's `@hexalith/*` peer dependencies to the local workspace packages during development
   - **And** the module builds alongside the shell in the Turborepo task graph

3. **AC3 — Package Publishing**
   - **Given** foundation packages need to be available to external teams developing modules outside the shell workspace
   - **When** the shell team publishes `@hexalith/shell-api`, `@hexalith/cqrs-client`, and `@hexalith/ui` to GitHub Packages
   - **Then** external module developers can install versioned packages from the registry
   - **And** packages follow strict semver — breaking changes require major version bump

4. **AC4 — Submodule Updates & CI Testing**
   - **Given** a module developer updates their module
   - **When** the shell team updates the submodule reference (`git submodule update --remote modules/<name>`)
   - **Then** the new module version is tested by the full CI pipeline before merging
   - **And** the submodule pin advances only when CI passes

5. **AC5 — Peer Dependency Validation**
   - **Given** a module's peer dependency version doesn't match the workspace packages
   - **When** `pnpm install` runs
   - **Then** a clear warning is displayed identifying the version mismatch
   - **And** the module developer is guided to update their peer dependency version

*FRs covered: FR47*

## Tasks / Subtasks

- [ ] **Task 1: Prepare foundation packages for publishing** (AC: #3) — *No dependencies, do first*
  - [ ] 1.1 Remove `"private": true` from `packages/shell-api/package.json`
  - [ ] 1.2 Remove `"private": true` from `packages/cqrs-client/package.json`
  - [ ] 1.3 Remove `"private": true` from `packages/ui/package.json`
  - [ ] 1.3a **Checkpoint:** Run `pnpm install && pnpm turbo build && pnpm turbo test && pnpm turbo lint` immediately after removing `private: true` from all three packages. Verify workspace resolution still works — removing `private` can change how pnpm treats packages in the workspace. Fix any issues before proceeding.
  - [ ] 1.4 Add `publishConfig` with `registry: "https://npm.pkg.github.com"` and `access: "public"` to each foundation package.json
  - [ ] 1.5 Add `repository` field pointing to `https://github.com/Hexalith/Hexalith.FrontShell` in each foundation package.json
  - [ ] 1.6 Add `license`, `description`, and `files` fields to each foundation package.json:
    - `@hexalith/shell-api`: `files: ["dist"]`
    - `@hexalith/cqrs-client`: `files: ["dist"]`
    - `@hexalith/ui`: `files: ["dist", "src/tokens"]` — **CSS token exports (`"./tokens.css"` and `"./tokens/*.css"`) point to `src/tokens/`, so these MUST be included in the published tarball or external module styling breaks silently**
  - [ ] 1.7 Fix `@hexalith/ui` `main` field: change from `"./src/index.ts"` to `"./dist/index.js"` — **the current `main` points to TypeScript source which won't exist in the published tarball (`files: ["dist", "src/tokens"]` excludes `src/index.ts`). The `exports` map already has the correct `"./dist/index.js"` for modern bundlers, but `main` must also be valid for legacy resolution. Dev server HMR is driven by the `exports` map and Vite config, not `main`.**
  - [ ] 1.8 Verify `exports` map is correct for each package (already has `"."` entry with `import` + `types`)
  - [ ] 1.9 Verify cqrs-client's `"./testing"` export entry is included

- [ ] **Task 2: Configure GitHub Packages registry** (AC: #3) — *No dependencies, can parallel with Task 1*
  - [ ] 2.1 Add `@hexalith:registry=https://npm.pkg.github.com` to `.npmrc`
  - [ ] 2.2 Document that `NPM_TOKEN` (GitHub PAT with `packages:write`) must be set as repository secret
  - [ ] 2.3 Verify `.npmrc` does NOT contain hardcoded tokens (CI uses `NODE_AUTH_TOKEN` env var)

- [ ] **Task 3: Create GitHub Actions publish workflow** (AC: #3, #4) — *Depends on Task 1 + Task 2*
  - [ ] 3.1 Create `.github/workflows/publish.yml` triggered on push to main (or manual `workflow_dispatch`). **The workflow MUST declare `permissions: packages: write` at job level** — `GITHUB_TOKEN` does not have packages write scope by default. Also verify the repository has Settings → Actions → General → Workflow permissions set to "Read and write". Add a comment at the top of the publish job listing which packages are published: `# Publishes: @hexalith/shell-api, @hexalith/cqrs-client, @hexalith/ui — add new @hexalith/* packages here when created`.
  - [ ] 3.2 Workflow steps: checkout → setup Node 22 with `registry-url: 'https://npm.pkg.github.com'` → pnpm install → turbo build → version-check → publish changed packages
  - [ ] 3.3 Publish in **dependency order** (NOT parallel): `shell-api` first, then `cqrs-client` (its `dependencies` includes `@hexalith/shell-api` which pnpm converts from `workspace:*` to the actual version during publish — that version must exist on the registry before cqrs-client is published), then `ui` last. Use sequential calls to `scripts/publish-if-needed.sh` per package with `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`
  - [ ] 3.4 Add per-package version-check before publish. Concrete strategy: for each package, run `pnpm view @hexalith/<pkg>@$(node -p "require('./packages/<pkg>/package.json').version") version 2>/dev/null`; if exit code is 0 the version exists → skip publish for that package; if exit code is non-zero (package or version not found, including first-ever publish) → proceed with publish. Handle the first-publish case explicitly: `pnpm view` returns exit code 1 when the package doesn't exist at all on the registry.
  - [ ] 3.5 Wrap version-check + publish in a reusable shell script `scripts/publish-if-needed.sh <package-dir>` to avoid duplicating logic per package in the workflow YAML. **The script must track whether it published or skipped, and the workflow must count results: if ALL packages were skipped (all versions already exist), emit a GitHub Actions warning:** `echo "::warning::All package versions already published. If you made changes, bump the version in package.json."`
  - [ ] 3.6 Add post-publish verification step: after all publish calls complete, run `pnpm view @hexalith/shell-api@<version> version && pnpm view @hexalith/cqrs-client@<version> version && pnpm view @hexalith/ui@<version> version` to confirm packages are accessible on the registry. Only run this for packages that were actually published in this run (skip for skipped packages).

- [ ] **Task 4: Validate submodule integration workflow** (AC: #1, #2, #4) — *Depends on Task 1 (packages must be publish-ready for peerDep resolution)*
  - [ ] 4.1 Verify `pnpm-workspace.yaml` includes `modules/*` (already done)
  - [ ] 4.2 Verify `.github/workflows/ci.yml` already uses `actions/checkout` with `submodules: recursive` (already done in 6-1)
  - [ ] 4.3 Document the submodule add workflow: `git submodule add <repo-url> modules/<module-name>`
  - [ ] 4.4 Verify Turborepo builds modules in correct dependency order (packages first, then modules)
  - [ ] 4.5 Scaffold a test module and validate the full workflow: run `pnpm create-module` (or `node tools/create-hexalith-module/dist/index.js`) with name `test-publish-validation`, move the output into `modules/test-publish-validation/`, run `pnpm install` to link workspace deps, then run `pnpm turbo build && pnpm turbo test` to confirm it compiles and tests pass. Clean up the test module after validation (do NOT commit it — this is a verification step only).

- [ ] **Task 5: Add peer dependency validation** (AC: #5) — *Gate: Task 5.1 determines if 5.2-5.4 are needed*
  - [ ] 5.1 **GATE CHECK:** Verify pnpm's built-in behavior with `strict-peer-dependencies=true`. Test by temporarily setting a mismatched peerDependency in a module's `package.json` and running `pnpm install`. If pnpm already produces a clear error with the package name and version mismatch, then AC5 is satisfied by existing infrastructure — **skip Tasks 5.2-5.4** and document that pnpm handles this natively.
  - [ ] 5.2 *(Only if 5.1 shows pnpm's output is insufficient)* Create `scripts/check-peer-deps.sh` that runs `pnpm install` and parses output for `@hexalith/*` peer dependency warnings
  - [ ] 5.3 *(Only if 5.2 needed)* Add peer-dep-check step to CI pipeline (`.github/workflows/ci.yml`) after Install step
  - [ ] 5.4 *(Only if 5.2 needed)* Output clear message: "Module <name> requires @hexalith/shell-api ^X.Y.Z but workspace has X.Y.Z — update your peerDependency version"

- [ ] **Task 6: Update module scaffold template** (AC: #1, #2, #3, #5)
  - [ ] 6.1 Update `tools/create-hexalith-module/templates/module/package.json` to use versioned `@hexalith/*` peerDependencies (e.g., `^0.1.0` instead of `workspace:*`)
  - [ ] 6.2 Ensure module template's peerDependencies match current foundation package versions
  - [ ] 6.3 Add `repository` field template for module package.json
  - [ ] 6.4 Verify module template builds both in workspace context (pnpm resolves peerDeps to local) and standalone context (installs from registry)

- [ ] **Task 7: Write tests and documentation** (AC: all)
  - [ ] 7.1 Test publish workflow locally with `pnpm pack` for each foundation package. For each tarball: run `tar tzf <tarball>` to list contents and verify no unexpected files. Check tarball sizes are reasonable (< 1MB for shell-api/cqrs-client, < 5MB for ui including CSS tokens).
  - [ ] 7.2 Verify per-package tarball contents:
    - `@hexalith/shell-api`: contains `dist/` only, no `src/`, no test files
    - `@hexalith/cqrs-client`: contains `dist/` only (including `dist/testing.js` + `dist/testing.d.ts`), no `src/`, no test files. **Verify the tarball's `package.json` has `"@hexalith/shell-api": "0.1.0"` (resolved version), NOT `"workspace:*"`.** This confirms pnpm's workspace protocol conversion works correctly during pack/publish.
    - `@hexalith/ui`: contains `dist/` AND `src/tokens/` (CSS files). Verify `main` resolves to `dist/index.js` (exists in tarball). Verify `exports["./tokens.css"]` points to `src/tokens/index.css` (exists in tarball).
  - [ ] 7.3 Add "Module Publishing" section to developer documentation. This MUST include **external consumer setup**: (a) how to configure `.npmrc` with `@hexalith:registry=https://npm.pkg.github.com`, (b) authentication requirements (GitHub PAT with `read:packages` scope, set as `//npm.pkg.github.com/:_authToken=TOKEN` in `.npmrc` or via `NODE_AUTH_TOKEN` env var), (c) exact install commands (`pnpm add @hexalith/shell-api @hexalith/cqrs-client @hexalith/ui`). This is the external developer's first contact with the publishing system — if undocumented, packages are published but unusable.
  - [ ] 7.4 Document semver policy: **During 0.x development, any minor bump (0.1.0 → 0.2.0) may contain breaking changes. Foundation packages will follow strict semver starting at 1.0.0 (patch for fixes, minor for backward-compatible features, major for breaking changes). External module developers should pin exact versions during 0.x phase (e.g., `"@hexalith/shell-api": "0.1.0"` not `"^0.1.0"`).**
  - [ ] 7.5 Document submodule update workflow for shell team

## Dev Notes

### What Already Exists (DO NOT recreate)

**Workspace infrastructure is already in place:**
- `pnpm-workspace.yaml` already includes `modules/*` — no changes needed
- `.npmrc` already has `strict-peer-dependencies=true` and `ignore-scripts=true`
- `turbo.json` already defines build/test/lint tasks with correct dependency ordering
- CI pipeline (`.github/workflows/ci.yml`) already uses `actions/checkout` with `submodules: recursive`
- CI already runs full pipeline: build → lint → test → coverage → scaffold smoke → manifest validation → design system health
- Docker build already works for shell app deployment

**Foundation packages are built and tested:**
- `packages/shell-api/` — tsup build, ESM output, type declarations, version 0.1.0
- `packages/cqrs-client/` — tsup build, ESM output, two entry points (index + testing), version 0.2.0
- `packages/ui/` — tsup build, ESM output, two entry points (index + tokenCompliance), version 0.1.0
- All packages have working `exports` maps in package.json

**Existing git submodule:**
- `Hexalith.Tenants` exists at REPO ROOT (not in `modules/`) — this is the .NET backend project, NOT a frontend module
- `.gitmodules` references `https://github.com/Hexalith/Hexalith.Tenants.git` at path `Hexalith.Tenants`
- Frontend modules go in `modules/` directory — the backend submodule is separate

**`modules/` directory current state:**
- Contains `.gitkeep`, `hexalith-demo-tasks/` (empty), `hexalith-test-orders/` (empty)
- No actual frontend modules exist yet — Tenants frontend module is story 6.3/6.4 scope

### Architecture Compliance

**Module Distribution Model** [Source: architecture.md, Decision #8]:
- Each module is an independent git repo consumed as a submodule in `modules/`
- pnpm workspace resolves versioned peerDependencies to local packages during development
- Foundation packages published to GitHub Packages for external teams

**Module Boundary Rules** [Source: architecture.md, Lines 1538-1567]:
- Modules may ONLY import: `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`, `zod`
- Modules CANNOT import: `@radix-ui/*`, `oidc-client-ts`, `ky`, `@tanstack/react-query`, other `modules/*`
- No deep imports: `@hexalith/*/src/**` is blocked by ESLint
- No cross-module dependencies: CI enforces zero cross-module imports

**Dependency Type Rules** [Source: architecture.md, Lines 1577-1583]:
- `react`, `react-dom` → `peerDependencies` in ALL packages and modules
- `@hexalith/*` in modules → `peerDependencies` (always versioned, e.g., `^0.1.0`)
- Same `package.json` must work in both standalone (registry install) and workspace (pnpm symlink) contexts

**Package Publishing Rules** [Source: architecture.md, Line 207]:
- Publish to GitHub Packages (NOT npm public registry)
- Three packages: `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`
- Strict semver — breaking changes require major version bump

**Submodule Operational Realities** [Source: architecture.md, Lines 1511-1527]:
- `modules/` contains git submodules exclusively — no shared utilities, no helper packages
- MockShellProvider breaking changes cascade independently to each module
- dev-host standalone path is a Phase 1.5 validation gate — do NOT block on this
- Module `vitest.config.ts` must resolve `@hexalith/*` imports in both workspace and standalone contexts

### Library/Framework Requirements

- **pnpm** v10.25.0 — workspace protocol for local resolution, `publishConfig.registry` for GitHub Packages
- **Turborepo** v2.x — `tasks` key (not legacy `pipeline`), dependency-ordered builds
- **tsup** — ESM output with `.d.ts`, entry points via `entry` config
- **GitHub Actions** — `actions/checkout@v4`, `actions/setup-node@v4` (with `registry-url` for auth), `pnpm/action-setup@v4`
- **Node.js** 22 — matches `.nvmrc` and Dockerfile
- **GitHub Packages** — NPM registry at `https://npm.pkg.github.com`, scoped to `@hexalith`

### File Structure Requirements

**Files to CREATE:**
- `.github/workflows/publish.yml` — Package publish workflow
- `scripts/publish-if-needed.sh` — Per-package version-check + publish script
- `scripts/check-peer-deps.sh` — Peer dependency validation script *(conditional — only if Task 5.1 gate shows pnpm's built-in output is insufficient)*

**Files to UPDATE:**
- `packages/shell-api/package.json` — Remove `private`, add `publishConfig`, `repository`, `license`, `description`, `files`
- `packages/cqrs-client/package.json` — Remove `private`, add `publishConfig`, `repository`, `license`, `description`, `files`
- `packages/ui/package.json` — Remove `private`, add `publishConfig`, `repository`, `license`, `description`, `files`
- `.npmrc` — Add `@hexalith:registry=https://npm.pkg.github.com`
- `.github/workflows/ci.yml` — Add peer-dep-check step (optional, pnpm may already handle this)
- `tools/create-hexalith-module/templates/module/package.json` — Update peerDependency versions

**Files to NOT TOUCH:**
- `pnpm-workspace.yaml` — already correct
- `turbo.json` — no publish task needed (publish is a CI-only operation, not a turbo task)
- `.gitmodules` — backend submodule is separate from this story
- `Dockerfile` — no changes needed
- `nginx.conf` — no changes needed

### Testing Requirements

- `pnpm pack --filter @hexalith/shell-api` — verify tarball contains `dist/` files, no source or tests
- `pnpm pack --filter @hexalith/cqrs-client` — verify tarball contains `dist/` files, no source or tests
- `pnpm pack --filter @hexalith/ui` — verify tarball contains `dist/` AND `src/tokens/` (CSS token files). Verify `main` field resolves to a file that exists in the tarball (`dist/index.js`). Verify `exports["./tokens.css"]` and `exports["./tokens/*.css"]` resolve to files in the tarball.
- Verify `pnpm install` with `strict-peer-dependencies=true` errors on version mismatches
- Verify `pnpm turbo build` still succeeds after package.json changes
- Verify `pnpm turbo test` still passes after package.json changes
- Verify `pnpm turbo lint` still passes
- All gates must be locally reproducible (NO GitHub Actions environment required)

### Previous Story Intelligence (6-1)

**Story 6-1 is done** — CI pipeline and quality gates story. Key learnings:
- CI pipeline already handles submodule checkout with `submodules: recursive`
- Coverage gates are configured: 95% foundation, 80% modules
- Scaffold smoke test exists at `scripts/scaffold-smoke-test.sh`
- Design system health gate reports via `$GITHUB_STEP_SUMMARY`
- Docker build works with `node:22-alpine` builder + `nginx:alpine` runtime
- All CI steps in single `ci.yml` file — do NOT create separate workflow files for CI gates (publish workflow IS a separate file since it's a different concern)

**Anti-pattern from 6-1:** Do not use external GitHub Actions marketplace actions for publishing — use native `pnpm publish` with `NODE_AUTH_TOKEN` env var.

### Git Intelligence

Recent commits show active work on:
- Connection recovery and query revalidation (`useQuery`)
- Manifest validation and loading (`manifestValidationPlugin`)
- Module error boundaries and isolation (`ShellErrorBoundary`, `ModuleRenderGuard`)
- Navigation state preservation (`ScrollRestoration`, `VersionGuard`)
- Module isolation ESLint rules (`module-isolation.js`)

**Patterns established:**
- Co-located tests (`.test.ts(x)` next to source)
- Shell modules in `apps/shell/src/modules/`
- Build plugins in `apps/shell/src/build/`
- Scripts in `scripts/` at repo root
- Vitest for all unit/integration tests

### Critical Anti-Patterns to Avoid

1. **DO NOT use `workspace:*` in published packages** — When packages are published to GitHub Packages, `workspace:*` protocol is NOT valid. pnpm converts `workspace:*` to actual versions during publish, but `@hexalith/cqrs-client` depends on `@hexalith/shell-api` via `"@hexalith/shell-api": "workspace:*"` — this will be converted to the actual version during `pnpm publish`. Verify this conversion works correctly.
2. **DO NOT hardcode tokens in `.npmrc`** — Use `NODE_AUTH_TOKEN` env var in CI, never commit tokens
3. **DO NOT publish from local machine** — Publish only from CI to ensure builds are clean and reproducible
4. **DO NOT create a monorepo-wide version** — Each foundation package has independent versioning
5. **DO NOT add changesets/semantic-release yet** — Keep it simple for MVP: manual version bumps, CI publishes on main push. Version management tooling is Phase 2.
6. **DO NOT modify the `.gitmodules` Hexalith.Tenants entry** — That's the .NET backend submodule, not a frontend module
7. **DO NOT try to add an actual frontend module submodule** — That's story 6.3/6.4 scope (Tenants reference module)
8. **DO NOT add a `publish` task to turbo.json** — Publishing is a CI-only operation, not part of the dev build graph
9. **DO change `packages/ui/package.json` `main` field** to `./dist/index.js` — It currently points to `./src/index.ts` which won't exist in the published tarball. The `exports` map drives resolution for modern bundlers and Vite HMR, so changing `main` won't break local dev. The `main` field is only a fallback for legacy `require()` resolution.
10. **DO NOT remove `private: true` from root `package.json`** — Only remove it from the three foundation packages

### Project Structure Notes

- Foundation packages live in `packages/` — they are workspace packages built by Turborepo
- Module scaffold template lives in `tools/create-hexalith-module/templates/module/`
- The scaffold tool is at `tools/create-hexalith-module/` — it generates new modules
- Published packages must work in two contexts: (1) workspace symlinks during development, (2) installed from GitHub Packages registry by external teams
- The `exports` map in each package.json is the public API contract — it must be correct for both contexts

### References

- [Source: architecture.md, Decision #8] Module distribution model
- [Source: architecture.md, Lines 562-584] CI/CD pipeline with submodule handling
- [Source: architecture.md, Lines 1511-1527] Module operational realities
- [Source: architecture.md, Lines 1538-1583] Module and package boundary diagrams
- [Source: architecture.md, Lines 1577-1583] Dependency type rules
- [Source: architecture.md, Lines 1830] Hybrid distribution model
- [Source: architecture.md, Lines 1842-1843] Phase 1.5 validation gates (CLI wrappers — out of scope)
- [Source: prd.md, Lines 447-490] Module distribution model and developer workflow
- [Source: prd.md, Lines 480-490] Shell CLI commands (Phase 1.5 — out of scope for this story)
- [Source: prd.md, FR47] Module publishing via git repository integration
- [Source: epics.md, Lines 1962-1996] Story 6.2 acceptance criteria

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
