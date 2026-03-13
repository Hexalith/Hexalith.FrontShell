# Story 1.1: Monorepo Scaffold with Running Dev Server

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a shell team developer,
I want to initialize the project monorepo with Turborepo and pnpm workspaces,
So that I have a structured project foundation with running dev server and all package directories ready.

## Scope Boundaries

### IN Scope

- Root monorepo config: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `.nvmrc`, `.gitignore` (updated with Node.js patterns)
- Shared TypeScript configs: `packages/tsconfig/` with `base.json`, `react-library.json`, `react-app.json`
- Shared ESLint configs: `packages/eslint-config/` with `base.js`, `react.js`, `module-boundaries.js` (including all restricted imports)
- Stub packages: `packages/shell-api/`, `packages/cqrs-client/`, `packages/ui/` — each with minimal `package.json`, `tsconfig.json`, `tsup.config.ts`, `src/index.ts` (empty barrel export)
- Shell application: `apps/shell/` — Vite + React + TypeScript rendering a minimal placeholder page
- Tool stub: `tools/create-hexalith-module/` — minimal `package.json`, `src/index.ts`
- Module directory: `modules/` with `.gitkeep` (empty, separate from root-level .NET submodule)
- Vitest workspace config: root `vitest.config.ts`
- Verification: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm test` all succeed

### OUT of Scope

- Design tokens, CSS @layer system, Stylelint, PostCSS scanner (Story 1.2)
- Authentication provider, oidc-client-ts integration (Story 1.3)
- Tenant/Theme/Locale providers (Story 1.4)
- Shell layout, React Router, sidebar/topbar (Story 1.5)
- Storybook setup (Story 3.9)
- Playwright config and E2E tests (later stories)
- Dockerfile, .env.example, runtime /config.json (Story 1.7)
- GitHub Actions CI pipeline (Story 1.8)
- Git hooks (husky/lint-staged) — known gap, not in any story AC currently
- Any component implementation (Epic 3)
- Any CQRS client implementation (Epic 2)

## Dependencies

No upstream dependencies — this is the first story in the project.

## Acceptance Criteria

1. **Given** a developer runs the Turborepo initialization command
   **When** the scaffold completes
   **Then** the following workspace structure exists: `apps/shell/`, `packages/shell-api/`, `packages/cqrs-client/`, `packages/ui/`, `packages/tsconfig/`, `packages/eslint-config/`, `modules/`, `tools/create-hexalith-module/`
   **And** `pnpm-workspace.yaml` includes `packages/*`, `apps/*`, `modules/*`, `tools/*`

2. **Given** `turbo.json` is created
   **Then** it uses the Turborepo v2 `tasks` field (NOT v1 `pipeline`)
   **And** `build` tasks use `dependsOn: ["^build"]` so packages build before apps
   **And** `lint` tasks have NO `dependsOn` (run in parallel)
   **And** `test` tasks depend on `build`
   **And** `dev` task is defined with `persistent: true` for the shell dev server
   **And** task outputs include `"dist/**"` for build caching

3. **Given** the shared TypeScript configs exist in `packages/tsconfig/`
   **Then** `base.json` has `strict: true` enabled
   **And** `react-library.json` extends `base.json` (for foundation packages built with tsup)
   **And** `react-app.json` extends `base.json` (for Vite shell application)

4. **Given** the shared ESLint config exists in `packages/eslint-config/`
   **Then** `base.js` enforces import ordering (React → external → @hexalith → relative → CSS modules) and type-only import separation
   **And** `react.js` enforces React hooks rules and JSX conventions
   **And** `module-boundaries.js` blocks restricted imports: `@radix-ui/*`, `oidc-client-ts`, `ky`, `@tanstack/react-query`, `styled-components`, `@emotion/*`
   **And** `module-boundaries.js` blocks deep package imports via `@hexalith/*/src/**` (barrel-only access enforced)

5. **Given** `apps/shell` is created as a Vite + React + TypeScript application
   **Then** it renders a minimal placeholder page showing the app name ("Hexalith FrontShell") confirming Vite + React + TypeScript are correctly wired
   **And** `@vitejs/plugin-react` is configured in `vite.config.ts`
   **And** `pnpm dev` starts the shell dev server with HMR working

6. **Given** stub packages are created (`packages/shell-api/`, `packages/cqrs-client/`, `packages/ui/`, `tools/create-hexalith-module/`)
   **Then** each has a `package.json` with `"private": true`
   **And** each has a `tsconfig.json` extending the appropriate shared config
   **And** each has a `tsup.config.ts` with `entry: ['src/index.ts'], format: ['esm'], dts: true`
   **And** each has a `src/index.ts` with an empty barrel export (`export {}`)
   **And** `pnpm build` produces `dist/` output for every stub package without errors

7. **Given** the root configuration files are created
   **Then** `.npmrc` contains `strict-peer-dependencies=true` and `ignore-scripts=true`
   **And** `.nvmrc` contains `22` (plain number, not `v22` or `22.x`)
   **And** root `package.json` contains `engines: { "node": ">=22", "pnpm": ">=9" }`
   **And** `.gitignore` is updated with Node.js patterns (`node_modules/`, `dist/`, `.turbo/`, `*.tsbuildinfo`) while preserving existing VS/VisualStudio patterns
   **And** existing `.gitmodules` file is preserved unchanged

8. **Given** the test infrastructure is configured
   **Then** root `vitest.config.ts` defines `test.projects` with glob patterns `['packages/*', 'apps/*', 'tools/*']` (Vitest 3.x syntax — NOT the deprecated `vitest.workspace.ts` approach)
   **And** each stub package has a minimal `vitest.config.ts`
   **And** Vitest config includes only `**/*.test.ts(x)` files (excludes `**/*.spec.ts(x)` — reserved for Playwright)
   **And** `pnpm test` from root exits successfully (zero tests found is acceptable, must not crash)

9. **Given** the existing Hexalith.Tenants git submodule exists at the repository root
   **When** the monorepo scaffold is created
   **Then** the submodule is NOT moved, modified, or referenced by pnpm workspace config
   **And** the `modules/` directory (for future frontend JS modules) is separate from the root-level .NET submodule
   **And** `pnpm install` and `pnpm build` succeed without attempting to process the .NET submodule

## Tasks / Subtasks

- [x] Task 1: Initialize root monorepo configuration (AC: #1, #7)
  - [x] 1.1 Create root `package.json` with `engines`, workspace scripts (`dev`, `build`, `test`, `lint`), and devDependencies (turborepo)
  - [x] 1.2 Create `pnpm-workspace.yaml` with `packages/*`, `apps/*`, `modules/*`, `tools/*`
  - [x] 1.3 Create `turbo.json` with Turborepo v2 `tasks` field and correct dependency graph
  - [x] 1.4 Create `.npmrc` with `strict-peer-dependencies=true` and `ignore-scripts=true`
  - [x] 1.5 Create `.nvmrc` with `22`
  - [x] 1.6 Update `.gitignore` — append Node.js patterns while preserving existing VS patterns
  - [x] 1.7 Create `modules/.gitkeep`
- [x] Task 2: Create shared TypeScript configs (AC: #3)
  - [x] 2.1 Create `packages/tsconfig/package.json`
  - [x] 2.2 Create `packages/tsconfig/base.json` with `strict: true`, ESNext module, React JSX
  - [x] 2.3 Create `packages/tsconfig/react-library.json` extending base (for tsup packages)
  - [x] 2.4 Create `packages/tsconfig/react-app.json` extending base (for Vite app)
- [x] Task 3: Create shared ESLint configs (AC: #4)
  - [x] 3.1 Create `packages/eslint-config/package.json`
  - [x] 3.2 Create `packages/eslint-config/base.js` — import ordering, type-only import separation
  - [x] 3.3 Create `packages/eslint-config/react.js` — React hooks rules, JSX conventions
  - [x] 3.4 Create `packages/eslint-config/module-boundaries.js` — restricted imports (`@radix-ui/*`, `oidc-client-ts`, `ky`, `@tanstack/react-query`, `styled-components`, `@emotion/*`, `@hexalith/*/src/**`)
- [x] Task 4: Create stub packages (AC: #6)
  - [x] 4.1 Create `packages/shell-api/` with `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `src/index.ts`
  - [x] 4.2 Create `packages/cqrs-client/` with same structure
  - [x] 4.3 Create `packages/ui/` with same structure
  - [x] 4.4 Create `tools/create-hexalith-module/` with `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `src/index.ts`
- [x] Task 5: Create shell application (AC: #5)
  - [x] 5.1 Create `apps/shell/package.json` with react, react-dom, @vitejs/plugin-react dependencies
  - [x] 5.2 Create `apps/shell/tsconfig.json` extending react-app config
  - [x] 5.3 Create `apps/shell/vite.config.ts` with `@vitejs/plugin-react`
  - [x] 5.4 Create `apps/shell/index.html` entry point
  - [x] 5.5 Create `apps/shell/src/main.tsx` rendering placeholder page with "Hexalith FrontShell" title
  - [x] 5.6 Create `apps/shell/vitest.config.ts`
- [x] Task 6: Configure test infrastructure (AC: #8)
  - [x] 6.1 Create root `vitest.config.ts` with `test.projects` glob patterns (Vitest 3.x — NOT deprecated `vitest.workspace.ts`)
  - [x] 6.2 Verify each stub package has `vitest.config.ts` with `.test.ts(x)` include pattern (excludes `.spec.ts(x)`)
- [x] Task 7: Run `pnpm install` and verify all commands (AC: #1-#9)
  - [x] 7.1 Run `pnpm install` — must complete without errors
  - [x] 7.2 Run `pnpm build` — all packages produce `dist/`, shell produces production build
  - [x] 7.3 Run `pnpm lint` — ESLint passes across all packages
  - [x] 7.4 Run `pnpm test` — exits 0 (zero tests acceptable)
  - [x] 7.5 Run `pnpm dev` — shell dev server starts, HMR works
  - [x] 7.6 Verify Hexalith.Tenants submodule is unaffected (AC: #9)

## Dev Notes

### Technical Requirements

- **Runtime:** Node.js 22.x LTS (pinned via `.nvmrc`)
- **Package Manager:** pnpm (>=9) with workspace protocol
- **Build Orchestrator:** Turborepo v2 — uses `tasks` field in `turbo.json`, NOT v1 `pipeline`
- **Library Bundler:** tsup (esbuild-powered) — `entry: ['src/index.ts'], format: ['esm'], dts: true`
- **App Bundler:** Vite with `@vitejs/plugin-react`
- **Language:** TypeScript with `strict: true` across all packages
- **Test Runner:** Vitest (workspace mode) — `.test.ts(x)` files only; `.spec.ts(x)` reserved for Playwright (later stories)
- **Linter:** ESLint with shared configs — import ordering, React hooks, module boundary enforcement

**Greenfield Context:** This repository has NO existing JavaScript/TypeScript code, no `package.json`, no `node_modules`. It contains only BMAD planning artifacts, IDE configs, and a .NET backend submodule (`Hexalith.Tenants/`). You are building everything from scratch.

### Architecture Compliance

**Monorepo Tool Decisions (from architecture.md):**

- Turborepo v2 + pnpm workspaces — NOT Nx, NOT npm/yarn, NOT standalone Vite
- Initialization approach: Use `pnpm dlx create-turbo@latest --example design-system` as starting reference, then restructure to match FrontShell topology. Alternatively, build manually from scratch — both approaches are acceptable as long as all ACs are met
- turbo.json MUST use the `tasks` field (Turborepo v2). The v1 `pipeline` field is ignored by v2 and will silently produce no caching
- Include `$schema: "https://turborepo.dev/schema.json"` for config validation

**Package Topology (strict, from architecture.md):**

- `@hexalith/shell-api` — owns auth, tenant, theme, locale. Cannot import cqrs-client or ui
- `@hexalith/cqrs-client` — can import shell-api. Cannot import ui
- `@hexalith/ui` — peer dep on shell-api (for useLocale). Cannot import cqrs-client
- These dependency rules are NOT enforced in this story (packages are stubs), but the `package.json` dependency declarations should be correct from day one

**Import Boundary Enforcement (two-layer, established in this story):**

1. **Build-time (tsup):** `entry: ['src/index.ts']` ensures only public barrel is bundled; `dist/` never contains `internal/` exports
2. **Dev-time (ESLint):** `no-restricted-imports` blocks `@hexalith/*/src/**` deep imports, plus specific library restrictions

**CSS Layer Order (established but NOT implemented in this story):**
The architecture defines a six-layer CSS cascade: `reset → tokens → primitives → components → density → module`. This is OUT of scope (Story 1.2) but the dev should be aware of it for context.

### Library & Framework Requirements

**Exact dependencies for this story (root `package.json` devDependencies):**

- `turbo` — latest stable (Turborepo v2)
- `vitest` — latest stable (v3.x — uses `test.projects` syntax)

**Exact dependencies for `apps/shell/package.json`:**

- `react` — ^19.0.0
- `react-dom` — ^19.0.0
- `@vitejs/plugin-react` — latest stable (devDependency)
- `vite` — latest stable (devDependency)
- `typescript` — ^5.x (devDependency)

**Exact dependencies for stub packages (devDependencies):**

- `tsup` — latest stable
- `typescript` — ^5.x

**Peer dependencies pattern for foundation packages:**

- `react` and `react-dom` as `peerDependencies` in ALL packages (prevents duplicate React at runtime)
- In this story, stubs don't import React, but the `peerDependencies` declarations should be present

**Libraries NOT to install in this story:**

- `oidc-client-ts`, `react-oidc-context` (Story 1.3)
- `ky` (Story 2.2)
- `zod` (Story 2.4)
- `@tanstack/react-query` (Story 2.4)
- `@radix-ui/*` (Story 3.1)
- `react-hook-form` (Story 3.7)
- `react-router`, `react-router-dom` (Story 1.5)
- `storybook`, `@storybook/*` (Story 3.9)
- `playwright`, `@playwright/*` (later stories)
- `husky`, `lint-staged` (not in any story currently)

### File Structure Requirements

**~30 files total. Every file serves an AC directly:**

```
hexalith-frontshell/                    (existing repo root)
├── .gitignore                          (UPDATED — append Node.js patterns)
├── .gitmodules                         (EXISTING — preserve unchanged)
├── .npmrc                              (NEW)
├── .nvmrc                              (NEW)
├── package.json                        (NEW — root workspace)
├── pnpm-workspace.yaml                 (NEW)
├── turbo.json                          (NEW)
├── vitest.config.ts                    (NEW — root, test.projects config)
├── apps/
│   └── shell/
│       ├── index.html                  (NEW)
│       ├── package.json                (NEW)
│       ├── tsconfig.json               (NEW — extends react-app)
│       ├── vite.config.ts              (NEW)
│       ├── vitest.config.ts            (NEW)
│       └── src/
│           └── main.tsx                (NEW — placeholder page)
├── packages/
│   ├── tsconfig/
│   │   ├── package.json                (NEW)
│   │   ├── base.json                   (NEW)
│   │   ├── react-library.json          (NEW)
│   │   └── react-app.json              (NEW)
│   ├── eslint-config/
│   │   ├── package.json                (NEW)
│   │   ├── base.js                     (NEW)
│   │   ├── react.js                    (NEW)
│   │   └── module-boundaries.js        (NEW)
│   ├── shell-api/
│   │   ├── package.json                (NEW — private, peerDeps: react)
│   │   ├── tsconfig.json               (NEW — extends react-library)
│   │   ├── tsup.config.ts              (NEW)
│   │   ├── vitest.config.ts            (NEW)
│   │   └── src/
│   │       └── index.ts                (NEW — export {})
│   ├── cqrs-client/
│   │   ├── package.json                (NEW)
│   │   ├── tsconfig.json               (NEW)
│   │   ├── tsup.config.ts              (NEW)
│   │   ├── vitest.config.ts            (NEW)
│   │   └── src/
│   │       └── index.ts                (NEW — export {})
│   └── ui/
│       ├── package.json                (NEW)
│       ├── tsconfig.json               (NEW)
│       ├── tsup.config.ts              (NEW)
│       ├── vitest.config.ts            (NEW)
│       └── src/
│           └── index.ts                (NEW — export {})
├── modules/
│   └── .gitkeep                        (NEW)
├── tools/
│   └── create-hexalith-module/
│       ├── package.json                (NEW)
│       ├── tsconfig.json               (NEW)
│       ├── tsup.config.ts              (NEW)
│       ├── vitest.config.ts            (NEW)
│       └── src/
│           └── index.ts                (NEW — export {})
├── Hexalith.Tenants/                   (EXISTING — DO NOT TOUCH)
├── _bmad/                              (EXISTING — DO NOT TOUCH)
├── _bmad-output/                       (EXISTING — DO NOT TOUCH)
├── docs/                               (EXISTING — DO NOT TOUCH)
└── .github/                            (EXISTING — DO NOT TOUCH)
```

**Naming Conventions (from architecture.md):**

- File naming: `PascalCase.tsx` for React components, `camelCase.ts` for hooks/utils
- CSS Modules: `PascalCase.module.css` (not used in this story)
- Tests: `.test.ts(x)` for Vitest, `.spec.ts(x)` for Playwright
- Barrel exports: only at package root `src/index.ts` — no sub-folder barrels

### Testing Requirements

- **Framework:** Vitest 3.x with workspace/projects mode
- **Root config:** `vitest.config.ts` using `defineConfig` with `test.projects: ['packages/*', 'apps/*', 'tools/*']`
- **Per-package config:** Each package has its own `vitest.config.ts` with `include: ['**/*.test.ts', '**/*.test.tsx']`
- **Exclusion:** All vitest configs MUST exclude `**/*.spec.ts(x)` — these are reserved for Playwright (established in later stories)
- **Coverage:** Not required for this story. Foundation packages will need ≥95% coverage, modules ≥80% — but that's for stories that add actual code
- **Expected result:** `pnpm test` exits 0 with zero tests found. The infrastructure works; tests come later

### Git Intelligence

**Recent commits (all planning/setup — no code patterns to follow):**

```
9832399 Merge pull request #4 from Hexalith/update-submodules
9749eb7 Update Hexalith.Tenants submodule to latest
a10abe2 Merge pull request #3 from Hexalith/add-planning-artifacts
bfb1bea Add architecture, epics, UX design, and testing research planning artifacts
9633d4f Merge pull request #2 from Hexalith/add-bmad-framework
```

**Insight:** No JavaScript/TypeScript code exists yet. No code patterns to follow. No conventions to maintain. This is a clean start — the conventions established in THIS story become the patterns for ALL future stories.

### Latest Tech Information

**Turborepo v2 (current stable):**

- Config uses `tasks` field, NOT `pipeline` (v1 legacy)
- Include `$schema: "https://turborepo.dev/schema.json"` for validation
- `dependsOn: ["^build"]` means "run this package's dependencies' build first"
- `persistent: true` for dev tasks (keeps dev server running)
- `cache: false` for dev tasks (no point caching dev server output)
- `outputs: ["dist/**"]` for build caching

**Vitest 3.x (IMPORTANT — breaking change from v2):**

- `vitest.workspace.ts` file is DEPRECATED
- Use `test.projects` in `vitest.config.ts` instead:
  ```typescript
  import { defineConfig } from "vitest/config";
  export default defineConfig({
    test: {
      projects: ["packages/*", "apps/*", "tools/*"],
    },
  });
  ```
- Each project directory needs its own `vitest.config.ts` (or `vite.config.ts`)
- `test.workspace` key also renamed to `test.projects`

**tsup (current stable):**

- Use `defineConfig` from 'tsup' for type-safe config
- `dts: true` generates `.d.ts` declaration files
- For more reliable declarations, `--experimental-dts` flag uses `@microsoft/api-extractor` (optional for stubs)
- Minimal config for stubs:
  ```typescript
  import { defineConfig } from "tsup";
  export default defineConfig({
    entry: ["src/index.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
  });
  ```

**React 19 (current stable):**

- No breaking changes relevant to scaffold setup
- JSX transform: `react-jsx` (automatic, no import React needed)
- Vite plugin: `@vitejs/plugin-react` handles JSX transform

**pnpm 9+ (current stable):**

- `.npmrc` flags: `strict-peer-dependencies=true`, `ignore-scripts=true`
- Workspace protocol: `workspace:*` for internal deps (not needed yet — stubs have no cross-deps)

### Project Structure Notes

- **Alignment:** File structure matches the architecture.md specification exactly. All paths, package names, and directory organization follow the documented topology
- **Existing content coexistence:** `.gitignore`, `.gitmodules`, `Hexalith.Tenants/`, `_bmad/`, `_bmad-output/`, `docs/`, `.github/` are all existing and must NOT be modified (except `.gitignore` which gets Node.js patterns appended)
- **No detected conflicts:** The pnpm workspace globs (`packages/*`, `apps/*`, `modules/*`, `tools/*`) will not match existing directories. `Hexalith.Tenants/` is at root, not inside `modules/`. `_bmad/` and `_bmad-output/` don't match any glob

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Monorepo structure, package topology, dependency rules, naming conventions, build configuration]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.1 acceptance criteria and requirements]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Visual identity baseline, placeholder page expectations]
- [Source: _bmad-output/planning-artifacts/prd.md — FR20, FR49, FR50 and NFR requirements]
- [Source: Turborepo v2 docs — turbo.json tasks syntax, $schema, dependsOn, persistent, cache]
- [Source: Vitest 3.x docs — test.projects replaces deprecated vitest.workspace.ts]
- [Source: tsup docs — defineConfig, dts, format, entry configuration]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Turborepo v2.8.16 required `packageManager` field in root `package.json` — added `"packageManager": "pnpm@10.25.0"`
- ESLint `import-x/order` rule treated `react` and `react-dom/**` pathGroups as distinct groups — fixed by adding `distinctGroup: false`
- Vitest exits code 1 when no test files found — fixed by adding `passWithNoTests: true` to all vitest configs
- Code review remediation aligned import-order groups, widened lint coverage to config files, and corrected initial workspace dependency declarations for `@hexalith/ui` and `@hexalith/cqrs-client`

### Completion Notes List

- Built monorepo from scratch (greenfield, no prior JS/TS code)
- Turborepo v2.8.16 with pnpm 10.25.0 workspaces (8 workspace projects)
- All 5 packages build successfully via tsup (ESM + DTS) and Vite (shell app)
- ESLint 9 flat config with shared `@hexalith/eslint-config` package: base (import ordering, type-only imports), react (hooks, JSX), module-boundaries (restricted imports)
- Per-package `eslint.config.js` files added for turbo lint to work across all workspaces
- Root `eslint.config.js` added so root `pnpm lint` validates shared ESLint config and root Vitest config in addition to workspace sources
- Vitest 3.2.4 with `test.projects` (not deprecated `vitest.workspace.ts`) — all packages pass with zero tests
- Shell app renders "Hexalith FrontShell" placeholder on Vite dev server (port 5173)
- Hexalith.Tenants submodule verified unchanged
- Resolved: turbo, vitest, eslint, typescript at root level; tsup per package; react/react-dom as peerDeps on foundation packages
- Review fixes applied: import-order now separates React/external/@hexalith/relative/CSS-module imports, lint scripts cover workspace config files, and package topology now matches the architecture baseline from day one

### File List

**New files:**

- `package.json` (root workspace)
- `eslint.config.js` (root lint config for shared config and root Vitest validation)
- `pnpm-workspace.yaml`
- `turbo.json`
- `.npmrc`
- `.nvmrc`
- `vitest.config.ts` (root)
- `pnpm-lock.yaml`
- `packages/tsconfig/package.json`
- `packages/tsconfig/base.json`
- `packages/tsconfig/react-library.json`
- `packages/tsconfig/react-app.json`
- `packages/eslint-config/package.json`
- `packages/eslint-config/base.js`
- `packages/eslint-config/react.js`
- `packages/eslint-config/module-boundaries.js`
- `packages/shell-api/package.json`
- `packages/shell-api/tsconfig.json`
- `packages/shell-api/tsup.config.ts`
- `packages/shell-api/vitest.config.ts`
- `packages/shell-api/eslint.config.js`
- `packages/shell-api/src/index.ts`
- `packages/cqrs-client/package.json`
- `packages/cqrs-client/tsconfig.json`
- `packages/cqrs-client/tsup.config.ts`
- `packages/cqrs-client/vitest.config.ts`
- `packages/cqrs-client/eslint.config.js`
- `packages/cqrs-client/src/index.ts`
- `packages/ui/package.json`
- `packages/ui/tsconfig.json`
- `packages/ui/tsup.config.ts`
- `packages/ui/vitest.config.ts`
- `packages/ui/eslint.config.js`
- `packages/ui/src/index.ts`
- `tools/create-hexalith-module/package.json`
- `tools/create-hexalith-module/tsconfig.json`
- `tools/create-hexalith-module/tsup.config.ts`
- `tools/create-hexalith-module/vitest.config.ts`
- `tools/create-hexalith-module/eslint.config.js`
- `tools/create-hexalith-module/src/index.ts`
- `apps/shell/package.json`
- `apps/shell/tsconfig.json`
- `apps/shell/vite.config.ts`
- `apps/shell/vitest.config.ts`
- `apps/shell/eslint.config.js`
- `apps/shell/index.html`
- `apps/shell/src/main.tsx`
- `modules/.gitkeep`

**Modified files:**

- `.gitignore` (appended Node.js patterns)
- `_bmad-output/implementation-artifacts/1-1-monorepo-scaffold-with-running-dev-server.md` (review remediation notes and status update)
- `apps/shell/package.json` (lint coverage expanded to config files)
- `package.json` (root lint now validates root config files before workspace lint)
- `packages/cqrs-client/package.json` (declared workspace dependency on `@hexalith/shell-api` and expanded lint coverage)
- `packages/eslint-config/base.js` (import ordering aligned with AC #4, including CSS module ordering)
- `packages/eslint-config/package.json` (lint script added for shared config package)
- `packages/ui/package.json` (declared peer dependency on `@hexalith/shell-api` and expanded lint coverage)
- `packages/shell-api/package.json` (lint coverage expanded to config files)
- `tools/create-hexalith-module/package.json` (lint coverage expanded to config files)

**Unchanged (verified):**

- `.gitmodules`
- `Hexalith.Tenants/` (submodule)

## Change Log

- **2026-03-13:** Code review remediation — fixed high/medium findings by aligning shared import-order enforcement with AC #4, widening lint verification to config files, correcting `@hexalith/ui`/`@hexalith/cqrs-client` workspace topology, and normalizing story references to root `vitest.config.ts`.
- **2026-03-13:** Initial implementation — full monorepo scaffold with Turborepo v2, pnpm workspaces, shared TypeScript/ESLint configs, stub packages, shell app, and Vitest infrastructure. All ACs verified: build, lint, test, dev server, submodule integrity.
