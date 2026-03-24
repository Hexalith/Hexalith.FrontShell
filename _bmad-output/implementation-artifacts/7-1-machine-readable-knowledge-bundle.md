# Story 7.1: Machine-Readable Knowledge Bundle

Status: ready-for-dev

## Story

As an AI agent (or a developer writing AI prompts),
I want a structured, machine-readable knowledge bundle describing the platform's contracts,
So that AI-generated modules conform to the manifest schema, hook API, and component catalog without guessing.

## Acceptance Criteria

1. **AC1 — ModuleManifest Schema Description**
   - Given a knowledge bundle is created in the repository
   - When an AI agent or prompt author accesses it
   - Then the bundle includes a structured description of the `ModuleManifest` schema with all required and optional fields, types, and constraints
   - And the bundle includes the `useSubmitCommand`/`useCommandPipeline` hook API: parameters, return shape, status transitions, error types
   - And the bundle includes the `useQuery` hook API: parameters, Zod schema integration, return shape, caching behavior
   - And the bundle includes the `@hexalith/ui` component catalog: each component's name, props (with types and defaults), usage example, and density options

2. **AC2 — Naming Conventions**
   - Given the knowledge bundle covers naming conventions
   - When an AI agent reads it
   - Then file naming conventions (PascalCase components, camelCase hooks, etc.) are documented
   - And code naming conventions (I-prefix interfaces, union types over enums, etc.) are documented
   - And file organization patterns (co-located tests, no `__tests__` dirs, barrel exports at root only) are documented

3. **AC3 — Scaffold Structure**
   - Given the knowledge bundle covers the scaffold structure
   - When an AI agent generates a module
   - Then the bundle describes the expected directory structure with purpose of each directory
   - And import ordering rules are documented (React → external → @hexalith → relative → CSS)
   - And the pattern for loading/error/empty state handling is documented

4. **AC4 — Bundle Versioning**
   - Given the knowledge bundle is versioned
   - When the platform API changes
   - Then the knowledge bundle is updated alongside the API change (stale bundles are a P1 bug)
   - And the bundle version matches the `@hexalith/*` package versions

## Tasks / Subtasks

- [ ] **Task 1: Create knowledge bundle directory and index** (AC: #1, #4)
  - [ ] 1.1 Create `docs/ai-knowledge-bundle/` directory
  - [ ] 1.2 Create `docs/ai-knowledge-bundle/index.md` — master index listing all bundle sections with descriptions and file paths. Include a `bundle_version` field extracted from `packages/shell-api/package.json` version. The index should be the single entry point an AI agent reads first.
  - [ ] 1.3 Add a `last_synced` date field to the index for staleness tracking.

- [ ] **Task 2: Create ModuleManifest JSON Schema** (AC: #1)
  - [ ] 2.1 Create `docs/ai-knowledge-bundle/manifest-schema.json` — a JSON Schema (draft 2020-12) describing the `ModuleManifestV1` type:
    - **Required fields:** `manifestVersion` (const: 1), `name` (string, kebab-case pattern `^[a-z][a-z0-9-]*$`), `displayName` (string, min 1), `version` (string, semver pattern), `routes` (array of `ModuleRoute`), `navigation` (array of `ModuleNavigation`)
    - **Optional fields:** `migrationStatus` (enum: `native`, `coexisting`, `migrating`)
    - **ModuleRoute:** `{ path: string }` — path must start with `/`
    - **ModuleNavigation:** `{ label: string, path: string, icon?: string, category?: string }` — path must match a declared route
    - Include `$id`, `title`, `description`, and `examples` at the schema root
    - Include a realistic example manifest (e.g., the Tenants manifest pattern)
    - **Source truth:** Read `packages/shell-api/src/manifest/manifestTypes.ts` and `packages/shell-api/src/manifest/validateManifest.ts` for constraints. The JSON Schema must match these exactly.
  - [ ] 2.2 Create `docs/ai-knowledge-bundle/manifest-guide.md` — human+AI readable prose explaining:
    - Purpose of each field with rationale
    - The discriminated union versioning strategy (`manifestVersion` field)
    - Validation rules enforced by `validateManifest()` (kebab-case name, semver version, route path format, navigation-route cross-reference, warnings for navigation paths without matching routes)
    - A complete example manifest for a fictional "orders" module
    - Anti-patterns: don't use uppercase in name, don't hardcode routes without leading `/`, don't declare navigation paths that don't match routes

- [ ] **Task 3: Document CQRS hook APIs** (AC: #1)
  - [ ] 3.1 Create `docs/ai-knowledge-bundle/cqrs-hooks.md` documenting ALL public CQRS hooks:
    - **useSubmitCommand** — parameters: `ICommandBus` (from context), returns `{ submit: (command: SubmitCommandInput) => Promise<SubmitCommandResponse | null>, correlationId: string | null, error: HexalithError | null }`
    - **useCommandStatus** — parameters: correlationId, polling config; returns command status with transitions: `Submitted → Processing → Completed | Failed | TimedOut`
    - **useCommandPipeline** — combines submit + status into single workflow; parameters, return shape, lifecycle
    - **useQuery** — parameters: `QueryParams { domain, queryType, aggregateId?, entityId? }`, `QueryOptions { enabled?, refetchInterval?, refetchOnWindowFocus? }`, Zod schema for runtime validation; returns `{ data: T | undefined, isLoading: boolean, isRefreshing: boolean, error: HexalithError | null, refetch: () => void }`
    - **useCanExecuteCommand** / **useCanExecuteQuery** — pre-flight authorization validation
    - **useProjectionSubscription** — SignalR-based real-time updates; how it interacts with useQuery cache invalidation
    - **useConnectionState** — connection health monitoring
    - **Source truth:** Read actual hook files in `packages/cqrs-client/src/commands/`, `packages/cqrs-client/src/queries/`, `packages/cqrs-client/src/validation/`, `packages/cqrs-client/src/notifications/`, and `packages/cqrs-client/src/connection/`
  - [ ] 3.2 For each hook, include:
    - TypeScript signature (copy from source)
    - Usage example in a page component context
    - Error types that can be returned (`HexalithError` hierarchy: `ApiError`, `AuthError`, `CommandRejectedError`, `CommandTimeoutError`, `ForbiddenError`, `RateLimitError`, `ValidationError`)
    - Pattern for handling each error type (inline vs error boundary)
    - Anti-patterns (never `try/catch` around hooks, never call `fetch` directly)
  - [ ] 3.3 Document the Zod schema integration pattern:
    - Schema defines type + runtime validation
    - `type T = z.infer<typeof TSchema>` for type derivation
    - Schema passed to `useQuery` for automatic response validation
    - Schema naming convention: `PascalCase + Schema` suffix (e.g., `TenantViewSchema`)

- [ ] **Task 4: Document @hexalith/ui component catalog** (AC: #1)
  - [ ] 4.1 Create `docs/ai-knowledge-bundle/ui-components.md` documenting every exported component from `packages/ui/src/index.ts`:
    - **Layout:** PageLayout, Stack, Inline, Divider
    - **Forms:** Button, Input, Select, TextArea, Checkbox, Form, FormField, DatePicker
    - **Feedback:** ToastProvider/useToast, Skeleton, EmptyState, ErrorDisplay, ErrorBoundary
    - **Navigation:** Sidebar, Tabs
    - **Overlay:** Tooltip, Modal, AlertDialog, DropdownMenu, Popover
    - **Data Display:** Table, DetailView
    - **Source truth:** Read each component's `.tsx` file for the actual prop interface. Do NOT guess or hallucinate props — read the source.
  - [ ] 4.2 For each component, document:
    - Component name and import path (`import { Table } from '@hexalith/ui'`)
    - Props interface with types, required/optional, defaults
    - 1-2 usage examples (minimal + realistic)
    - Density/variant options if applicable
    - Accessibility notes (WCAG AA compliance via Radix primitives)
    - **Key rule:** All components wrap Radix UI primitives internally — modules MUST import from `@hexalith/ui`, NEVER from `@radix-ui/*` directly (ESLint enforces this)
  - [ ] 4.3 Document the `useFormStatus` hook and Form/Zod integration pattern:
    - `<Form>` wraps React Hook Form + Zod resolver internally
    - Module developer provides Zod schema to `<Form schema={MySchema}>`
    - `<FormField>` handles validation display automatically
    - Anti-patterns: don't duplicate Zod validation in component code, don't use `useState` for form state

- [ ] **Task 5: Document naming conventions and file organization** (AC: #2)
  - [ ] 5.1 Create `docs/ai-knowledge-bundle/conventions.md` documenting:
    - **File naming table** — PascalCase.tsx (components), camelCase.ts (hooks, utils, types), PascalCase.module.css (CSS modules), .test.ts(x) (Vitest), .spec.ts(x) (Playwright), .contract.test.ts (contracts), .stories.tsx (Storybook)
    - **Code naming table** — PascalCase (components, types, Zod schemas), camelCase with `use` prefix (hooks), `I` prefix (interfaces/contracts), descriptive prefix (implementations: `DaprCommandBus`, `MockCommandBus`), UPPER_SNAKE_CASE (constants), union types (NEVER TypeScript enums), `on` prefix (event handler props), `handle` prefix (internal handlers), `is`/`has`/`should` prefix (booleans), `--hx-` prefix (CSS custom properties)
    - **File organization rules:**
      - Co-located tests — `.test.ts(x)` next to source file, never in `__tests__/` dirs
      - Simple component: `Component.tsx` + `Component.module.css` + `Component.test.tsx`
      - Complex component (3+ files): use folder with `index.ts` re-export
      - Barrel exports only at package root `src/index.ts` — no sub-folder barrels
      - `internal/` folder for shared utilities not in public API (2+ consumers required)
    - **Import ordering:** React → external libraries → `@hexalith/*` → relative imports → CSS modules. Type-only imports separated. ESLint `import/order` enforces this.
    - **Storybook title convention:** `@hexalith/{package}/{Category}/{ComponentName}`
    - Source: architecture.md naming tables

- [ ] **Task 6: Document scaffold structure and patterns** (AC: #3)
  - [ ] 6.1 Create `docs/ai-knowledge-bundle/scaffold-structure.md` documenting:
    - **Expected module directory structure** with purpose of each file/directory:
      ```
      hexalith-{module-name}/
      ├── src/
      │   ├── index.ts           # Module entry point (default export: root component)
      │   ├── manifest.ts        # ModuleManifest definition
      │   ├── routes.tsx         # Module route definitions
      │   ├── schemas/           # Zod schemas for projections and commands
      │   ├── pages/             # Route-level page components
      │   ├── components/        # Module-specific reusable components
      │   └── hooks/             # Module-specific hooks (beyond platform hooks)
      ├── dev-host/              # Standalone dev server (MockShellProvider)
      ├── tsconfig.json
      ├── vitest.config.ts
      └── package.json           # @hexalith/* as peerDependencies
      ```
    - **State handling patterns** (CRITICAL for AI generation quality):
      - Loading: always `<Skeleton variant="...">` from `@hexalith/ui`, never spinners, never blank screens
      - Error: business errors (`CommandRejectedError`) → inline `<Alert>`. Infrastructure errors → bubble to `<ErrorBoundary>`
      - Empty: `<EmptyState>` component with action suggestion
      - Pattern: `if (isLoading) return <Skeleton />; if (error) return <ErrorDisplay />; if (!data.length) return <EmptyState />; return <Table />;`
    - **Page component pattern** — complete example of a list page using useQuery + Table + loading/error/empty states
    - **Form page pattern** — complete example using useCommandPipeline + Form + Zod schema + success/error handling
    - **Detail page pattern** — complete example using useQuery + DetailView + loading/error states
    - **Source truth:** Read the actual template files in `tools/create-hexalith-module/templates/module/src/` for canonical examples. Also read `modules/hexalith-tenants/src/` for the reference implementation.
  - [ ] 6.2 Document the `peerDependencies` pattern:
    - Modules declare `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui` as peerDependencies
    - Version ranges should match the current platform version
    - pnpm workspaces resolve to local versions automatically when consumed by the shell

- [ ] **Task 7: Document test fixture APIs** (AC: #1, #3)
  - [ ] 7.1 Create `docs/ai-knowledge-bundle/test-fixtures.md` documenting:
    - **MockCommandBus** — constructor, `configureNextSend()` for FIFO behavior control, default 50ms delay
    - **MockQueryBus** — constructor, `setResponse(key, data)` for query mocking, default 30ms delay
    - **MockSignalRHub** — constructor, mock signal broadcasting
    - **MockShellProvider** — wraps all mock contexts for tests and Storybook. Single import: `import { MockShellProvider } from '@hexalith/shell-api'`
    - **createMockAuthContext** — configurable: authenticated/unauthenticated/expired
    - **createMockTenantContext** — configurable: single/multi-tenant, active tenant
    - **Source truth:** Read actual mock files in `packages/cqrs-client/src/mocks/` and `packages/shell-api/src/testing/`
  - [ ] 7.2 Include complete test setup example:
    - How to wrap components with `MockShellProvider` for Vitest tests
    - How to configure mock command responses (success, rejection, timeout)
    - How to configure mock query responses with realistic data
    - AC marker convention: `// AC: story-id#criterion` at file level
    - Reference: `docs/testing-strategy.md` for full testing conventions

- [ ] **Task 8: Add bundle version tracking** (AC: #4)
  - [ ] 8.1 Add a `version` field to `docs/ai-knowledge-bundle/index.md` header that MUST match the version in `packages/shell-api/package.json`.
  - [ ] 8.2 Create `scripts/check-bundle-freshness.ts` — a TypeScript script (run via `tsx`) that:
    - Reads `packages/shell-api/package.json` version
    - Reads `docs/ai-knowledge-bundle/index.md` and extracts bundle version
    - Compares them — if mismatched, exit 1 with clear error message
    - Also checks `last_synced` date — warn if older than 30 days
    - **Additionally:** Verify that the manifest JSON Schema (`manifest-schema.json`) matches the actual TypeScript types by:
      - Reading `packages/shell-api/src/manifest/manifestTypes.ts`
      - Checking that every field in `ModuleManifestV1` has a corresponding property in the JSON Schema
      - Checking that every required field in the interface is in the JSON Schema `required` array
    - **Additionally:** Verify hook API completeness by:
      - Reading `packages/cqrs-client/src/index.ts` exports
      - Checking that every exported hook is documented in `cqrs-hooks.md`
    - **Additionally:** Verify component catalog completeness by:
      - Reading `packages/ui/src/index.ts` exports
      - Checking that every exported component is documented in `ui-components.md`
    - Output: PASS (all checks green), WARN (date stale but versions match), FAIL (version mismatch or missing docs)
    - Exit code: 0 for PASS/WARN, 1 for FAIL
  - [ ] 8.3 Add `check:bundle-freshness` script to root `package.json`:
    ```json
    "check:bundle-freshness": "tsx scripts/check-bundle-freshness.ts"
    ```
  - [ ] 8.4 Add CI step to `.github/workflows/ci.yml`:
    ```yaml
    # ─── Knowledge Bundle Freshness ───
    # Verifies AI knowledge bundle matches current platform API
    - name: Knowledge Bundle Freshness
      run: pnpm check:bundle-freshness
    ```
    Place AFTER `Build` (needs compiled types), BEFORE `Test with Coverage`.
    Runs on ALL builds (fast check, no path-scoping needed).

- [ ] **Task 9: Reference bundle from project documentation** (AC: #1, #3)
  - [ ] 9.1 Add knowledge bundle reference to `CLAUDE.md`:
    ```
    - AI knowledge bundle: see `docs/ai-knowledge-bundle/index.md` for manifest schema, hook APIs, component catalog, and conventions for AI-assisted module generation.
    ```
  - [ ] 9.2 Add knowledge bundle reference to `docs/index.md` (if it exists) under a new "AI Module Generation" section.
  - [ ] 9.3 Cross-reference from `docs/module-development.md` and `docs/api-reference.md` to the knowledge bundle for AI-specific usage patterns.

- [ ] **Task 10: Final verification** (AC: #1-#4)
  - [ ] 10.1 Run `pnpm check:bundle-freshness` — verify PASS
  - [ ] 10.2 Run `pnpm turbo build` — verify full workspace builds cleanly
  - [ ] 10.3 Run `pnpm turbo test` — verify all existing tests pass (no regressions)
  - [ ] 10.4 Run `pnpm turbo lint` — verify no lint errors
  - [ ] 10.5 Verify every field in `ModuleManifestV1` interface appears in `manifest-schema.json`
  - [ ] 10.6 Verify every hook exported from `@hexalith/cqrs-client` is documented in `cqrs-hooks.md`
  - [ ] 10.7 Verify every component exported from `@hexalith/ui` is documented in `ui-components.md`
  - [ ] 10.8 Manually review one complete section (e.g., manifest schema) against the source code to verify accuracy

## Dev Notes

### What Already Exists — DO NOT Recreate

**Developer Documentation (`docs/`):**
- `docs/api-reference.md` — export catalog for all `@hexalith/*` packages. The knowledge bundle extends this with AI-specific usage patterns and structured data, it does NOT replace it.
- `docs/module-development.md` — full module lifecycle reference (scaffold, develop, test, publish). The knowledge bundle references this for narrative context.
- `docs/getting-started.md` — quickstart guide. Not duplicated in knowledge bundle.
- `docs/cqrs-frontend-guide.md` — CQRS pattern explanation. The knowledge bundle references this for conceptual background but provides its own structured hook API reference with examples optimized for AI consumption.
- `docs/testing-strategy.md` — test pyramid, quality standards, AC markers, contract testing. Referenced from test fixtures section, not duplicated.

**Scaffold Tool (`tools/create-hexalith-module/`):**
- Fully functional CLI with template-based scaffolding
- Templates are real TypeScript files, compiled by the monorepo's TypeScript
- Scaffold smoke test in CI validates template drift
- The knowledge bundle describes what the scaffold produces — it does NOT modify the scaffold tool itself.

**Module System:**
- `packages/shell-api/src/manifest/manifestTypes.ts` — the source of truth for `ModuleManifestV1` type (23 lines). Knowledge bundle creates a JSON Schema representation of this.
- `packages/shell-api/src/manifest/validateManifest.ts` — validation rules (155 lines). Knowledge bundle documents these rules.
- `modules/hexalith-tenants/` — reference module implementation. Knowledge bundle references this as the canonical example.

**CQRS Client:**
- Hooks are in `packages/cqrs-client/src/commands/`, `queries/`, `validation/`, `notifications/`, `connection/`
- The hook names in the epics file (`useCommand`, `useProjection`) differ from actual implementation names:
  - `useCommand` → `useSubmitCommand` + `useCommandStatus` + `useCommandPipeline`
  - `useProjection` → `useQuery` (with Zod schema integration) + `useProjectionSubscription` (SignalR)
- **CRITICAL:** Document the ACTUAL hook names, not the epics shorthand. The dev agent must read the source files and use real API signatures.

**UI Component Library:**
- All components in `packages/ui/src/` wrap Radix UI primitives internally
- Module boundary rule: modules MUST import from `@hexalith/ui`, NEVER from `@radix-ui/*` directly
- Components use CSS Modules with design tokens (`--hx-*` custom properties)
- `packages/ui/src/index.ts` is the definitive list of public components

**Test Infrastructure:**
- Mock implementations: `MockCommandBus`, `MockQueryBus`, `MockSignalRHub` in `packages/cqrs-client/src/mocks/`
- Test utilities: `MockShellProvider`, `createMockAuthContext`, `createMockTenantContext`, `createMockConnectionHealthContext`, `createMockFormDirtyContext` in `packages/shell-api/src/testing/`
- Contract tests: bus-level in `mocks/__contracts__/`, API-level in `contracts/`

### Architecture Compliance

**Knowledge Bundle Location:** `docs/ai-knowledge-bundle/`
- `docs/` is the standard location for documentation (per architecture)
- Architecture says: "AI Module Generation (FR42-FR46) → `tools/create-hexalith-module/` + docs → `templates/`, knowledge bundle"
- The bundle serves both human reference and AI consumption (per PRD), so `docs/` is appropriate

**Bundle Format:**
- JSON Schema for manifest (standard, tooling-compatible, validates against JSON Schema validators)
- Structured Markdown for hook APIs, component catalog, conventions (LLMs parse Markdown excellently, humans can read it too)
- Each section in its own file (maintainability, selective loading)
- Index file as single entry point

**File Naming:**
- `manifest-schema.json` — JSON Schema file
- `*.md` — all other bundle files (kebab-case, per project conventions)
- Scripts: `check-bundle-freshness.ts` in `scripts/` (consistent with existing `check-atdd-compliance.sh`, `check-test-quality.ts`)

**CI Step Conventions:**
- Runs on ALL builds (fast check, Turborepo caching)
- Uses `tsx` for TypeScript script execution (already in devDependencies)
- Follows existing output format: PASS/WARN/FAIL with specific details

### Project Structure Notes

**Files to CREATE:**
```
docs/ai-knowledge-bundle/
├── index.md                    # Bundle index with version and section listing
├── manifest-schema.json        # JSON Schema for ModuleManifestV1
├── manifest-guide.md           # Manifest field documentation and examples
├── cqrs-hooks.md               # CQRS hook API reference with examples
├── ui-components.md            # Component catalog with props and examples
├── conventions.md              # Naming and file organization rules
├── scaffold-structure.md       # Module directory structure and patterns
└── test-fixtures.md            # Mock implementations and test setup patterns

scripts/
└── check-bundle-freshness.ts   # Bundle version and completeness verification
```

**Files to MODIFY:**
```
CLAUDE.md                       # Add knowledge bundle reference
docs/index.md                   # Add AI Module Generation section (if exists)
package.json                    # Add check:bundle-freshness script
.github/workflows/ci.yml        # Add Knowledge Bundle Freshness CI step
```

**Files to NOT TOUCH:**
- `tools/create-hexalith-module/` — scaffold tool is complete; bundle describes what it produces
- `packages/shell-api/src/manifest/` — source of truth; bundle documents it, doesn't modify it
- `packages/cqrs-client/src/` — hook implementations; bundle documents them
- `packages/ui/src/` — component implementations; bundle documents them
- `modules/hexalith-tenants/` — reference module; bundle references it
- `docs/api-reference.md` — existing docs; bundle adds AI-specific layer, not a replacement
- `docs/module-development.md` — existing docs; cross-reference only
- `docs/testing-strategy.md` — existing docs; cross-reference only
- Any existing test files or test logic

### Library/Framework Requirements

- **tsx** — already in devDependencies for TypeScript script execution
- **No new dependencies required.** This story creates documentation files and one validation script. The JSON Schema is a static `.json` file — no runtime schema validator needed (the freshness check uses string matching, not JSON Schema validation).

### Testing Requirements

**No new test files needed.** This story produces documentation and a CI validation script.

**Script Testing:**
- `check-bundle-freshness.ts` — test locally with `pnpm check:bundle-freshness` after creating all bundle files
- Self-test: temporarily change the version in `index.md` to a wrong value, verify the script fails, then revert

**Existing Tests:**
- ALL existing tests must continue to pass (zero regressions)
- No source code changes in this story — only docs, scripts, and CI config

### Previous Story Intelligence

**Story 6-6 (review) — Testing Strategy & Quality Gates CI Formalization:**
- **Script pattern established:** `scripts/check-atdd-compliance.sh` (bash) and `scripts/check-test-quality.ts` (TypeScript via tsx). The bundle freshness script should follow the same TypeScript pattern.
- **CI step pattern:** New CI steps added with descriptive comments, placed in logical order, using `run:` commands (not custom actions).
- **CLAUDE.md pattern:** Story 6-6 created CLAUDE.md with project conventions. Story 7-1 extends it.
- **`package.json` script pattern:** Added `"check:test-quality": "tsx scripts/check-test-quality.ts"`. Follow same naming convention: `"check:bundle-freshness": "tsx scripts/check-bundle-freshness.ts"`.
- **CI YAML structure:** Current pipeline has 22 steps. The Knowledge Bundle Freshness step should slot after Build, before Test with Coverage (same area as other validation checks).
- **Key lesson from 6-6:** The contract tests had to adapt from ky-based mocking to fetch-based mocking because the architecture described ky but the actual codebase uses `createFetchClient` with native fetch. **Always read the actual source code, never trust architecture descriptions alone.** The knowledge bundle MUST be generated from actual source, not from architecture docs.
- **Debug pattern:** Vitest v3 uses positional arguments for path filtering, not `--testPathPattern` (Jest syntax). CI steps should use Vitest v3 syntax.

### Git Intelligence

Recent commit: `5640b26 feat(errors): implement error monitoring system with context and global handlers` — error monitoring patterns established. Limited git history available (shallow clone).

Key patterns from codebase analysis:
- Provider pattern: React Context with optional null fallback for tests
- Error hierarchy: `HexalithError` base class with typed subclasses
- Deterministic testing: inject `now()` parameter instead of mocking global Date
- Contract test pattern: parameterized suites validating interface parity

### Critical Anti-Patterns to Avoid

1. **DO NOT copy from architecture.md blindly** — Story 6-6 proved that architecture descriptions can differ from actual implementations (ky vs fetch, hook naming). Always read actual source files as the single source of truth.
2. **DO NOT create a massive single-file bundle** — split into focused files per topic for maintainability and selective loading by AI agents.
3. **DO NOT hallucinate component props** — read each component's actual `.tsx` file. The UI library is large; missing or wrong props will cause generation failures.
4. **DO NOT add runtime schema validation** — the freshness check uses simple string matching and regex. No need for `ajv` or any JSON Schema validator library.
5. **DO NOT modify existing source code** — this story creates documentation alongside existing code. The code IS the source of truth; the bundle DOCUMENTS it.
6. **DO NOT duplicate existing docs** — the knowledge bundle adds AI-optimized structured references. It cross-references `docs/api-reference.md`, `docs/module-development.md`, etc. for narrative context.
7. **DO NOT use TypeScript `enum`** in any new code — use union types per project convention.
8. **DO NOT add dependencies** — the freshness script uses only Node.js built-ins (`fs`, `path`) and `tsx` for execution.
9. **DO NOT create overly verbose descriptions** — AI agents need dense, actionable content. Every sentence should guide module generation. Cut prose that doesn't directly help an AI generate correct code.
10. **DO NOT forget to verify hook names** — the epics use `useCommand`/`useProjection` shorthand, but the actual hooks are `useSubmitCommand`, `useCommandPipeline`, `useQuery`, etc. Document the REAL names.

### Key Implementation Notes

**Bundle Content Priority:**
The most critical sections for AI generation quality (in order):
1. **Manifest schema** — wrong manifest = module won't load
2. **Hook API signatures** — wrong hook usage = runtime errors
3. **State handling patterns** — missing loading/error/empty = visual bugs
4. **Component props** — wrong props = compilation errors
5. **Naming conventions** — wrong names = lint failures
6. **Scaffold structure** — wrong file layout = build failures

**JSON Schema Quality:**
The manifest JSON Schema should be complete enough to validate a manifest with a standard JSON Schema validator (e.g., `ajv`). Include:
- `$schema: "https://json-schema.org/draft/2020-12/schema"`
- `examples` array with a realistic manifest
- `description` for every property
- `pattern` for regex-validated fields (name, version)
- `minItems` for routes array (at least 1 route required)

**Freshness Check Design:**
The freshness script should be fast (<2 seconds) and have zero dependencies beyond `tsx`. It performs:
1. Version comparison (package.json vs index.md) — FAIL if mismatch
2. Date staleness (last_synced in index.md) — WARN if >30 days
3. Manifest field completeness (TypeScript interface vs JSON Schema) — FAIL if missing fields
4. Hook export completeness (cqrs-client exports vs cqrs-hooks.md) — FAIL if undocumented hooks
5. Component export completeness (ui exports vs ui-components.md) — FAIL if undocumented components

### References

- [Source: epics.md, Epic 7, Story 7.1] Complete acceptance criteria and BDD scenarios
- [Source: prd.md, FR42] Platform knowledge bundle requirement
- [Source: prd.md, Journey 3] Claude generates a module using knowledge bundle
- [Source: architecture.md, FR Category table] Knowledge bundle location: tools/ + docs
- [Source: architecture.md, AI Agent Guidelines] All agents must follow documented patterns
- [Source: architecture.md, Module Internal Organization] Canonical module directory structure
- [Source: architecture.md, Naming Patterns] File and code naming conventions
- [Source: architecture.md, CI Pipeline] Quality gate sequence for CI step placement
- [Source: packages/shell-api/src/manifest/manifestTypes.ts] ModuleManifestV1 type definition (23 lines)
- [Source: packages/shell-api/src/manifest/validateManifest.ts] Manifest validation rules (155 lines)
- [Source: packages/cqrs-client/src/index.ts] All exported hooks and types
- [Source: packages/ui/src/index.ts] All exported components
- [Source: _bmad-output/implementation-artifacts/6-6-testing-strategy-and-quality-gates-ci-formalization.md] Script and CI patterns from previous story
- [Source: docs/testing-strategy.md] Testing conventions referenced by test fixtures section
- [Source: docs/api-reference.md] Existing export catalog (knowledge bundle extends, not replaces)
- [Source: docs/module-development.md] Module lifecycle reference (cross-referenced)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List
