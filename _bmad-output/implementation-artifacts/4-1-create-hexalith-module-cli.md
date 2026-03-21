# Story 4.1: create-hexalith-module CLI

Status: done

## Story

As a module developer,
I want to scaffold a new module with a single CLI command,
So that I get a complete, correctly structured module project without manual setup.

## Acceptance Criteria

1. **AC1 — Directory structure generated.** Given the CLI tool is implemented in `tools/create-hexalith-module/`, when a developer runs `pnpm create-module my-orders` (via root workspace script), then a complete module directory `hexalith-my-orders/` is generated with this structure:

```text
 hexalith-my-orders/
 ├── .gitattributes
 ├── .gitignore
 ├── .stylelintrc.json
 ├── README.md
 ├── eslint.config.js
 ├── package.json
 ├── tsconfig.json
 ├── tsup.config.ts
 ├── vitest.config.ts
 ├── src/
 │   ├── index.ts
 │   ├── manifest.ts
 │   ├── routes.tsx
 │   ├── schemas/
 │   ├── pages/
 │   ├── components/
 │   └── hooks/
 └── dev-host/
     ├── index.html
     ├── main.tsx
     └── vite.config.ts
```

1. **AC2 — Config files correct.** Given the CLI runs, when the scaffold completes, then:
   - `package.json` declares `@hexalith/shell-api`, `@hexalith/cqrs-client`, and `@hexalith/ui` as versioned peer dependencies
   - `tsconfig.json` extends the shared base configuration with TypeScript strict mode
   - ESLint config includes the shared ESLint config with `no-restricted-imports` rules pre-configured
   - Vitest config includes pattern `**/*.test.ts(x)` and excludes `**/*.spec.ts(x)`

1. **AC3 — Module name applied everywhere.** Given the CLI accepts a module name argument (e.g., `my-orders`), when the name is provided, then all generated files use the correct module name in `package.json` `name`, manifest `name`/`displayName`, and component names. The module name is validated (lowercase alphanumeric with hyphens).

1. **AC4 — Error handling.** Given the CLI encounters an error (e.g., directory already exists), when the error occurs, then a descriptive error message is displayed with remediation guidance.

**FRs covered:** FR1

## Tasks / Subtasks

- [x] Task 1: CLI entry point and argument parsing (AC: #3, #4)
  - [x] 1.1: Implement `src/index.ts` as CLI entry point — parse module name from command-line args
  - [x] 1.2: Validate module name: lowercase alphanumeric + hyphens only, no leading/trailing hyphens, no consecutive hyphens, non-empty, max 50 characters, not a JavaScript reserved word (e.g., `class`, `export`, `default`)
  - [x] 1.3: Check if output directory already exists — error with remediation message
  - [x] 1.4: Add `bin` field to `package.json` pointing to built entry point. Use tsup `banner` option to prepend `#!/usr/bin/env node` shebang to the compiled output
  - [x] 1.5: Add root-level workspace script `"create-module": "node tools/create-hexalith-module/dist/index.js"` to root `package.json` so the MVP invocation is `pnpm create-module my-orders`
  - [x] 1.6: Print success message after scaffold completes showing created directory and next-steps (`cd hexalith-<name>`, `pnpm install`, `pnpm dev`)
  - [x] 1.7: Write `src/index.test.ts` — name validation, error cases
- [x] Task 2: Scaffold engine (AC: #1, #2, #3)
  - [x] 2.1: Implement `src/scaffold.ts` — copy template files from `templates/module/` to output directory. Resolve template directory path using `import.meta.url` (or equivalent ESM mechanism) relative to the package root — NOT relative to the compiled `dist/` file location. This is critical because tsup bundles `src/` to `dist/` but templates are resource files outside `src/`
  - [x] 2.2: String replacement engine — replace placeholders (`__MODULE_NAME__`, `__MODULE_DISPLAY_NAME__`, `__MODULE_PACKAGE_NAME__`) in text files only (`.ts`, `.tsx`, `.json`, `.md`, `.html`, `.css`, `.js`). Copy binary files (images, fonts) as-is without replacement. Write all output files with UTF-8 encoding and LF line endings (normalize `\r\n` → `\n`)
  - [x] 2.3: Convert module name to display name (e.g., `my-orders` → `My Orders`)
  - [x] 2.4: Generate `package.json` name as `@hexalith/my-orders`
  - [x] 2.5: Write `src/scaffold.test.ts` — verify correct structure, replacements, generated files
  - [x] 2.6: Run `git init -b main` in the generated output directory after all files are written. Include a `.gitignore` (node_modules, dist, coverage, .turbo) and a `.gitattributes` (`* text=auto eol=lf`) in the template. Wrap `git init` in try/catch — if git is not installed, print a warning but do NOT fail the scaffold. The module directory is still valid without `.git/`
- [x] Task 3: Version compatibility check (AC: #2)
  - [x] 3.1: Implement `src/versionCheck.ts` — read current `@hexalith/*` package versions from the monorepo
  - [x] 3.2: Inject correct version ranges into generated `package.json` peerDependencies
  - [x] 3.3: Write `src/versionCheck.test.ts`
- [x] Task 4: Template files — configuration skeleton (AC: #1, #2)
  - [x] 4.1: Create `templates/module/package.json` with: ESM config (`"type": "module"`), `"main": "./src/index.ts"` (source-first, matching monorepo convention), `"types": "./dist/index.d.ts"`. peerDependencies: `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`, `react` `^19.0.0`, `react-dom` `^19.0.0`, `zod` `^3.0.0`. devDependencies: `vite`, `tsup`, `typescript`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@types/react`, `@types/react-dom`, `jsdom`, `@hexalith/eslint-config`, `@hexalith/tsconfig`. Scripts: `build`, `lint`, `test`, `dev`
  - [x] 4.2: Create `templates/module/tsconfig.json` extending `@hexalith/tsconfig/base.json` with `jsx: "react-jsx"`, strict mode
  - [x] 4.3: Create `templates/module/eslint.config.js` importing `@hexalith/eslint-config/react` and `@hexalith/eslint-config/module-boundaries`
  - [x] 4.4: Create `templates/module/vitest.config.ts` with include `**/*.test.ts(x)` and exclude `**/*.spec.ts(x)`
  - [x] 4.5: Create `templates/module/tsup.config.ts` with entry `src/index.ts`, ESM format, dts
  - [x] 4.6: Create `tsconfig.templates.json` in `tools/create-hexalith-module/` for type-checking template files without emitting JS. Include `templates/module/src/**` and resolve `@hexalith/*` from the workspace. Add a type-check script to package.json (`"typecheck:templates": "tsc -p tsconfig.templates.json --noEmit"`). Wire into CI: either add to the existing `lint` script (`"lint": "eslint ... && pnpm typecheck:templates"`) or add a `typecheck` task in `turbo.json` — templates must be type-checked on every PR
  - [x] 4.7: Create `templates/module/README.md` with module name placeholder, brief description ("Built on Hexalith FrontShell"), and dev commands (`pnpm install`, `pnpm dev`, `pnpm test`, `pnpm build`)
  - [x] 4.8: Create `templates/module/.stylelintrc.json` extending the workspace Stylelint config — prepares for Story 4.2 when CSS files are added to the template
  - [x] 4.9: Create `templates/module/.gitattributes` with `* text=auto eol=lf` to enforce LF line endings in git
- [x] Task 5: Template files — source skeleton (AC: #1, #3)
  - [x] 5.1: Create `templates/module/src/index.ts` — module entry point (placeholder export)
  - [x] 5.2: Create `templates/module/src/manifest.ts` — typed `ModuleManifest` with placeholders for name, routes, navigation. MUST export a valid `ModuleManifest` object that compiles against `@hexalith/shell-api` types. Include inline JSDoc comments on each manifest field explaining its purpose (name, displayName, routes, navigation) — this file is the primary teaching artifact for the platform contract
  - [x] 5.3: Create `templates/module/src/routes.tsx` — module route definitions (placeholder)
  - [x] 5.4: Create empty `templates/module/src/schemas/`, `pages/`, `components/`, `hooks/` directories (with `.gitkeep` files). These are placeholders for Story 4.2; `.gitkeep` files will be replaced with real files later
  - [x] 5.5: **Template placeholder rules:** Use `Example` prefix for all code identifiers (component names, types, function names) — e.g., `ExampleListPage`, `ExampleSchema`. These must be valid TypeScript identifiers so templates compile as-is. Use `__MODULE_NAME__` / `__MODULE_DISPLAY_NAME__` / `__MODULE_PACKAGE_NAME__` only in string literals (package.json name field, manifest displayName, comments). The scaffold engine replaces `Example` via PascalCase-aware regex `/\bExample(?=[A-Z])/g` (matches only when followed by uppercase — e.g., `ExampleListPage` but NOT "Example" alone in comments). `__PLACEHOLDER__` tokens use simple string replace
- [x] Task 6: Template files — dev-host skeleton (AC: #1)
  - [x] 6.1: Create `templates/module/dev-host/` directory structure (placeholder for Story 4.3)
  - [x] 6.2: Minimal `dev-host/index.html`, `dev-host/main.tsx` (placeholder), `dev-host/vite.config.ts`
- [x] Task 7: Integration test — scaffold smoke test (AC: #1, #2, #3)
  - [x] 7.1: End-to-end test: run scaffold → dynamically compare generated file list against template source files (glob the template directory, don't hardcode file names — this makes the test resilient to template additions in Stories 4.2-4.4) → verify `package.json` has correct deps → verify `tsconfig.json` extends base → verify module name substitution → verify ESLint config present → verify `.gitignore` and `.gitattributes` present → verify `git init` ran (`.git/` exists)
  - [x] 7.2: Type-check smoke test: run `tsc --noEmit` on generated template source (with `@hexalith/*` packages resolved from workspace) — verify the scaffolded TypeScript compiles against current platform APIs
  - [x] 7.3: Placeholder scan test: scan all generated files for any remaining `__` delimited tokens (e.g., `__MODULE_NAME__`) — verify zero unreplaced placeholders in the scaffold output

## Dev Notes

### Scope Boundaries — What This Story IS and IS NOT

**This story builds the CLI tool and config-level template scaffolding.** The generated template files contain minimal placeholder code sufficient to compile and verify structure. Premium example code (pages with CQRS hooks, UI components, realistic data) is Story 4.2. The dev-host mock providers and full functionality are Story 4.3. Scaffolded tests that pass out-of-box are Story 4.4.

**Do NOT implement:**

- Full example page components (4.2)
- MockShellProvider wiring in dev-host (4.3)
- Pre-built test fixtures or passing tests (4.4)
- Full typed manifest contract with URL patterns, sidebar grouping, lazy-loading configuration (4.5) — Task 5.2 creates a minimal manifest with 1 placeholder route and 1 nav item; Story 4.5 adds the complete contract

**DO implement:**

- Minimal `manifest.ts` that exports a valid `ModuleManifest` object (enough to compile)
- Minimal `routes.tsx` with a placeholder route
- Minimal `src/index.ts` that exports the module root
- Minimal `dev-host/` skeleton (index.html, main.tsx placeholder, vite.config.ts)

### Architecture Constraints — MUST Follow

1. **Templates are REAL TypeScript files, not EJS.** Template files in `tools/create-hexalith-module/templates/module/` are actual `.ts`/`.tsx` files. They are **resource files copied by the scaffold engine, NOT compiled to `dist/`**. However, they MUST be type-checked to catch API drift. Create a separate `tsconfig.templates.json` that includes `templates/module/src/**` for type-checking only (no emit), with `@hexalith/*` packages resolved from the workspace. The main `tsconfig.json` (rootDir: `src/`) handles only CLI source compilation. The scaffold tool copies template files and does string replacement (module name, domain name). If shell-api changes a type, the template type-check fails in CI. [Source: architecture.md#Key Structural Decisions]

2. **All modules are standalone git repositories.** Every module is scaffolded as an independent git repo with versioned `@hexalith/*` peerDependencies and a bundled `dev-host/`. When consumed by the shell, the module repo is added as a git submodule in `modules/`. pnpm workspaces resolve peerDependencies to the local workspace version automatically — one `package.json` works in both contexts. [Source: architecture.md#Key Structural Decisions]

3. **ESM-only.** Package must use `"type": "module"`. No CommonJS. [Source: root package.json]

4. **TypeScript strict mode.** `tsconfig.json` must extend `@hexalith/tsconfig/base.json` which has `strict: true`. [Source: packages/tsconfig/base.json]

5. **Node 22 target.** `.nvmrc` specifies Node 22. CLI can use Node 22 APIs. [Source: .nvmrc]

6. **pnpm workspace integration.** The CLI tool is in `tools/*` which is part of `pnpm-workspace.yaml`. It can resolve workspace packages via `workspace:*`. [Source: pnpm-workspace.yaml]

7. **Turborepo pipeline.** Build depends on `^build` (upstream packages first). Test depends on `build`. [Source: turbo.json]

8. **No barrel file nesting.** Only `src/index.ts` is a barrel. Sub-folders never get `index.ts` (exception: complex component folder re-exports). [Source: architecture.md#Barrel Export Clarification]

### Existing Codebase Context

**What already exists in `tools/create-hexalith-module/`:**

- `package.json` — named `@hexalith/create-hexalith-module`, private, ESM, has tsup/typescript devDeps plus `@hexalith/eslint-config` and `@hexalith/tsconfig`
- `tsconfig.json` — extends `@hexalith/tsconfig/base.json`, outDir `dist`, rootDir `src`
- `tsup.config.ts` — entry `src/index.ts`, ESM format, dts, clean
- `vitest.config.ts` — includes `**/*.test.ts` and `**/*.test.tsx`, passWithNoTests
- `eslint.config.js` — exists
- `src/index.ts` — empty (`export {};`)
- `dist/` — exists (built output from empty source)
- No `templates/` directory yet

**@hexalith/shell-api exports** (the module will peer-depend on this):

- Providers: `AuthProvider`, `TenantProvider`, `ThemeProvider`, `LocaleProvider`, `ConnectionHealthProvider`, `FormDirtyProvider`
- Hooks: `useAuth`, `useTenant`, `useTheme`, `useLocale`, `useConnectionHealth`, `useFormDirty`
- Types: `ModuleManifest`, `ModuleManifestV1`, `ModuleRoute`, `ModuleNavigation`, `AuthContextValue`, `TenantContextValue`, `ThemeContextValue`, `LocaleContextValue`
- Testing: `MockShellProvider`, `createMockAuthContext`, `createMockTenantContext`, `createMockConnectionHealthContext`, `createMockFormDirtyContext`

**@hexalith/cqrs-client exports** (the module will peer-depend on this):

- Hooks: `useSubmitCommand`, `useCommandStatus`, `useCommandPipeline`, `useQuery`, `useConnectionState`, `useCanExecuteCommand`, `useCanExecuteQuery`, `useProjectionSubscription`
- Providers: `CqrsProvider`, `QueryProvider`, `SignalRProvider`
- Types: `ICommandBus`, `IQueryBus`, `CommandStatus`, `PipelineStatus`, `QueryParams`, `QueryOptions`, `UseQueryResult`
- Mocks: `MockCommandBus`, `MockQueryBus`, `MockSignalRHub`
- Errors: `HexalithError`, `ApiError`, `AuthError`, `CommandRejectedError`, `CommandTimeoutError`, `ValidationError`, `ForbiddenError`, `RateLimitError`

**@hexalith/ui exports** (the module will peer-depend on this):

- Layout: `PageLayout`, `Stack`, `Inline`, `Divider`
- Forms: `Button`, `Input`, `Select`, `TextArea`, `Checkbox`, `Form`, `FormField`, `DatePicker`
- Feedback: `ToastProvider`, `useToast`, `Skeleton`, `EmptyState`, `ErrorDisplay`, `ErrorBoundary`
- Navigation: `Sidebar`, `Tabs`
- Overlay: `Tooltip`, `Modal`, `AlertDialog`, `DropdownMenu`, `Popover`
- Data Display: `Table`, `DetailView`

**Current package versions from the monorepo:**

- React: `^19.0.0`
- TypeScript: `^5.0.0`
- Vite: via Turborepo (check apps/shell for actual version)
- Zod: `^3.25.76` (in cqrs-client), `^3.0.0` (in ui peer)
- pnpm: `10.25.0`
- Node: 22

### Module-Boundary ESLint Rules (for scaffold template)

The scaffold must include `@hexalith/eslint-config/module-boundaries` which blocks:

- `@radix-ui/*` direct imports → "Import from @hexalith/ui instead"
- `@hexalith/*/src/**` deep imports → "Use barrel exports only"
- `@emotion/*`, `styled-components`, `@stitches/react` → "Use CSS Modules"
- `oidc-client-ts` → "Import from @hexalith/shell-api"
- `ky` → "Import from @hexalith/cqrs-client"
- `@tanstack/react-query` → "Import from @hexalith/cqrs-client"
- `@tanstack/react-table` → "Import from @hexalith/ui"

### CLI Implementation Decisions

**MVP invocation: `pnpm create-module <name>`.** The package is `private: true` and unpublished, so `pnpm create hexalith-module` (which requires an npm-published `create-hexalith-module` package) will NOT work during MVP. Instead, add a root workspace script `"create-module": "node tools/create-hexalith-module/dist/index.js"` so developers run `pnpm create-module my-orders`. The `bin` field is still added for forward-compatibility when packages are eventually published (Phase 1.5). The epics file references `pnpm create hexalith-module` as the aspirational command — the MVP workspace script is the pragmatic equivalent.

**No interactive prompts for MVP.** The module name is a required positional argument. Interactive prompts (domain name, additional options) can be added later. Keep it minimal.

**String replacement approach — two-tier strategy:**

- **String literal placeholders** (simple string replace): `__MODULE_NAME__` → `my-orders`, `__MODULE_DISPLAY_NAME__` → `My Orders`, `__MODULE_PACKAGE_NAME__` → `@hexalith/my-orders`. Used in `package.json` name, manifest displayName, comments.
- **Code identifier prefix** (PascalCase-aware regex): `Example` prefix in component names, types, functions → replaced with PascalCase module name (e.g., `ExampleListPage` → `MyOrdersListPage`). Use `/\bExample(?=[A-Z])/g` — matches only when followed by uppercase letter, preventing false positives in comments and standalone strings. Scope to file content only, not file names.

Template files compile as-is in the monorepo because `Example` is a valid TypeScript identifier. Placeholders like `__MODULE_NAME__` appear only in string contexts.

**Output location.** The CLI creates the module directory in the current working directory (wherever the user runs the command). Not inside the monorepo's `modules/` directory — the module is a standalone repo.

**Standalone install limitation (MVP).** The generated `package.json` lists `@hexalith/*` as peerDependencies, but these packages are `private: true` and not published to any registry. Running `pnpm install` outside the workspace will fail to resolve them. This is a known limitation documented in the architecture: "standalone dev-host is a Phase 1.5 validation gate." During MVP, the scaffold is validated inside the workspace only (pnpm resolves peerDependencies via workspace symlinks). Do NOT test standalone `pnpm install` in integration tests.

**Dependencies to add to `tools/create-hexalith-module/package.json`:**

- No heavy CLI framework needed for MVP. Use `process.argv` directly for the single positional argument.
- `fs/promises` and `path` from Node stdlib for file operations.
- Consider `picocolors` for colored terminal output (tiny dependency).

**Success output.** After scaffold completes, print a clear next-steps block:

```text
Created hexalith-my-orders/

Next steps:
  cd hexalith-my-orders
  pnpm install
  pnpm dev
```

This is the developer's first 10 seconds with the platform — make it count.

### Git Intelligence — Recent Project Patterns

Last 5 commits show Epic 3 completion (overlay components, data-display, navigation). Patterns observed:

- Component files follow `Component.tsx` + `Component.module.css` + `Component.test.tsx` + `Component.stories.tsx` pattern
- All CSS uses `@layer components { }` wrapping with design token custom properties
- Tests use `@testing-library/react` with `vitest`
- Radix primitives are wrapped with own types (never re-exported)
- `tsup` builds with ESM + DTS for all packages
- `eslint.config.js` (flat config, not `.eslintrc`)

### Critical Anti-Patterns to Prevent

1. **Do NOT use EJS, Handlebars, or any templating engine.** Templates are real TypeScript files. String replacement only.
2. **Do NOT hardcode @hexalith/\* versions in templates.** Read them from the monorepo at scaffold time via `versionCheck.ts`.
3. **Do NOT create a monorepo inside the scaffold.** The output is a flat standalone project, not a workspace.
4. **Do NOT add `react` or `react-dom` as dependencies.** They must be `peerDependencies` in the generated `package.json`.
5. **Do NOT use `.eslintrc` format.** Use flat config `eslint.config.js` (ESLint 9+) matching the monorepo pattern.
6. **Do NOT add cross-module imports in templates.** Module must import only from `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`, and `zod`.
7. **Do NOT scaffold Playwright tests.** Vitest tests only for this story. Playwright CT comes later.
8. **Do NOT use unscoped regex for `Example` replacement.** Use PascalCase-aware regex (`/\bExample(?=[A-Z])/g`) — matches only when `Example` is followed by an uppercase letter (i.e., PascalCase identifiers like `ExampleListPage`). This prevents false positives in comments like "See Example usage" or standalone "Example" strings. Scope replacement to file content, not file names.

### Testing Strategy

- **Unit tests** for name validation, display name conversion, PascalCase conversion
- **Unit tests** for scaffold engine — mock file system or use temp directories
- **Integration test** — run full scaffold to temp directory, verify all expected files exist with correct content
- **Type-check smoke test** — after scaffolding, run `tsc --noEmit` on the generated module source with `@hexalith/*` resolved from the workspace. This verifies the scaffold output is structurally and type-wise valid against current platform APIs. This is this story's canary — distinct from the full CI scaffold smoke test in Epic 6
- Use `vitest` with `fs/promises` mocking or real temp directory cleanup
- Template files in `templates/module/` are type-checked via `tsconfig.templates.json` (separate from CLI source compilation)

### Project Structure Notes

- Alignment: The scaffold output structure matches the architecture spec's "Module Internal Organization" exactly [Source: architecture.md lines 796-821]
- The `tools/*` workspace inclusion means the CLI package participates in Turborepo build/test/lint pipelines
- Template files must be included in the npm package or copied at build time — they are NOT TypeScript source compiled to dist; they are resource files copied as-is by the scaffold engine

### References

- [Source: architecture.md#Complete Project Directory Structure] — `tools/create-hexalith-module/` layout with src/index.ts, scaffold.ts, versionCheck.ts, templates/module/
- [Source: architecture.md#Key Structural Decisions] — Templates are real TypeScript, all modules are standalone git repos
- [Source: architecture.md#Naming Patterns] — File and code naming conventions
- [Source: architecture.md#Structure Patterns] — Component file organization, barrel export rules
- [Source: architecture.md#Module Internal Organization] — Standalone module directory structure
- [Source: epics.md#Story 4.1] — Full acceptance criteria
- [Source: prd.md#Developer Platform Specific Requirements] — CLI command: `pnpm create hexalith-module`, module distribution via git submodules
- [Source: prd.md#Module Distribution Model] — Modules as independent git repos with versioned peerDependencies
- [Source: packages/eslint-config/module-boundaries.js] — ESLint no-restricted-imports rules for module boundary enforcement
- [Source: packages/tsconfig/base.json] — Shared TypeScript config with strict mode, ES2022 target, ESNext modules

## Change Log

- 2026-03-21: Implemented all 7 tasks for create-hexalith-module CLI. CLI entry point with name validation, scaffold engine with placeholder replacement, version check, template files (config + source + dev-host), and integration tests. 35 tests pass.
- 2026-03-21: Senior code review fixes applied. Restored a real template module entry point, replaced the generated Stylelint config with a standalone token-compliance configuration, improved cross-platform remediation guidance for existing output directories, fixed CLI package lint ordering issues, and expanded validation to 37 passing tests with clean lint/build.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed tsconfig.templates.json: needed `paths` to resolve @hexalith/\* from workspace sources
- Fixed integration test type-check: needed `typeRoots` pointing to tool's node_modules/@types for React types resolution in temp directory
- Added @types/node and @types/react to devDependencies for CLI source and template type-checking

### Completion Notes List

- Task 1: CLI entry point (`src/index.ts`) with argument parsing, name validation (`validateModuleName.ts`), directory existence check, success message, and cross-platform remediation guidance for existing output directories. Added `bin` field to package.json, shebang via tsup `banner`, root workspace script `create-module`. 12 unit tests.
- Task 2: Scaffold engine (`src/scaffold.ts`) with template file copying, two-tier string replacement (placeholder tokens + PascalCase-aware `Example` prefix), CRLF normalization, binary file passthrough, git init with error handling. Name utilities in `nameUtils.ts`. 11 unit tests.
- Task 3: Version check (`versionCheck.ts`) reads `@hexalith/*` package versions from the monorepo and injects them into the generated package.json. Falls back to `workspace:*`. 3 unit tests.
- Task 4: Template configuration files — package.json (ESM, peerDeps, devDeps, scripts), tsconfig.json (extends base, jsx, strict), eslint.config.js (base + react + boundaries), vitest.config.ts (include `*.test`, exclude `*.spec`), tsup.config.ts, README.md, .stylelintrc.json, .gitattributes, .gitignore. The generated Stylelint config is standalone from the scaffolded module root and uses the `@hexalith/ui` token-compliance plugin path rather than an invalid relative workspace reference. Also tsconfig.templates.json for CI type-checking of templates.
- Task 5: Template source files — index.ts (module entry point with default root export plus manifest/routes re-exports), manifest.ts (typed ModuleManifest with JSDoc), routes.tsx (placeholder component with Example prefix). Empty directories with .gitkeep for schemas/, pages/, components/, hooks/.
- Task 6: Dev-host skeleton — index.html, main.tsx (placeholder), vite.config.ts.
- Task 7: Integration tests — 10 tests covering: dynamic file comparison with template source, package.json deps, tsconfig extends, name substitution, template entry export, ESLint config, standalone Stylelint config, git files, git init, placeholder scan (zero unreplaced tokens), and type-check smoke test (tsc --noEmit against workspace types). Total package validation now passes with 37 tests.

### File List

New files:

- tools/create-hexalith-module/src/index.ts (CLI entry point)
- tools/create-hexalith-module/src/validateModuleName.ts (name validation)
- tools/create-hexalith-module/src/nameUtils.ts (display name + PascalCase conversion)
- tools/create-hexalith-module/src/scaffold.ts (scaffold engine)
- tools/create-hexalith-module/src/versionCheck.ts (version reader)
- tools/create-hexalith-module/src/index.test.ts (unit tests: validation, name utils)
- tools/create-hexalith-module/src/scaffold.test.ts (unit tests: scaffold engine)
- tools/create-hexalith-module/src/versionCheck.test.ts (unit tests: version check)
- tools/create-hexalith-module/src/integration.test.ts (integration tests: full scaffold)
- tools/create-hexalith-module/tsconfig.templates.json (template type-checking)
- tools/create-hexalith-module/templates/module/package.json
- tools/create-hexalith-module/templates/module/tsconfig.json
- tools/create-hexalith-module/templates/module/eslint.config.js
- tools/create-hexalith-module/templates/module/vitest.config.ts
- tools/create-hexalith-module/templates/module/tsup.config.ts
- tools/create-hexalith-module/templates/module/README.md
- tools/create-hexalith-module/templates/module/.stylelintrc.json
- tools/create-hexalith-module/templates/module/.gitattributes
- tools/create-hexalith-module/templates/module/.gitignore
- tools/create-hexalith-module/templates/module/src/index.ts
- tools/create-hexalith-module/templates/module/src/manifest.ts
- tools/create-hexalith-module/templates/module/src/routes.tsx
- tools/create-hexalith-module/templates/module/src/schemas/.gitkeep
- tools/create-hexalith-module/templates/module/src/pages/.gitkeep
- tools/create-hexalith-module/templates/module/src/components/.gitkeep
- tools/create-hexalith-module/templates/module/src/hooks/.gitkeep
- tools/create-hexalith-module/templates/module/dev-host/index.html
- tools/create-hexalith-module/templates/module/dev-host/main.tsx
- tools/create-hexalith-module/templates/module/dev-host/vite.config.ts

Modified files:

- pnpm-lock.yaml (workspace lockfile updates for CLI implementation dependencies)
- tools/create-hexalith-module/package.json (bin field, scripts, devDependencies)
- tools/create-hexalith-module/src/index.ts (cross-platform remediation guidance, import order cleanup)
- tools/create-hexalith-module/src/index.test.ts (import order cleanup)
- tools/create-hexalith-module/src/scaffold.test.ts (standalone Stylelint config coverage)
- tools/create-hexalith-module/src/integration.test.ts (template entry point and Stylelint config coverage)
- tools/create-hexalith-module/src/versionCheck.test.ts (import order cleanup)
- tools/create-hexalith-module/tsup.config.ts (shebang banner)
- tools/create-hexalith-module/templates/module/.stylelintrc.json (standalone token-compliance configuration)
- tools/create-hexalith-module/templates/module/src/index.ts (default module root export)
- package.json (added create-module workspace script)

## Senior Developer Review (AI)

### Reviewer

GitHub Copilot (GPT-5.4)

### Outcome

Approved after fixes.

### Review Notes

- Fixed the template module entry so `src/index.ts` now exports a real default root component instead of only acting as a barrel.
- Replaced the generated `.stylelintrc.json` with a standalone configuration that is valid from the scaffolded module root.
- Updated CLI remediation guidance for existing output directories to include both PowerShell and bash commands.
- Cleaned remaining CLI package lint failures caused by import ordering.
- Added regression coverage for the standalone Stylelint config and template entry export.

### Validation

- `pnpm --filter @hexalith/create-hexalith-module test`
- `pnpm --filter @hexalith/create-hexalith-module lint`
- `pnpm --filter @hexalith/create-hexalith-module build`

Result: 37 tests passed, lint passed, template type-check passed, and build passed.
