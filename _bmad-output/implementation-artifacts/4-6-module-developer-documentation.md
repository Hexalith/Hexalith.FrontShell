# Story 4.6: Module Developer Documentation

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a module developer,
I want a Getting Started guide and a module development lifecycle guide,
So that I can scaffold and ship my first module with clear, accurate instructions.

## Acceptance Criteria

1. **AC1 — Getting Started guide covers complete path.** Given a Getting Started guide exists, when a new module developer reads it, then it covers the complete path: prerequisites → registry access → scaffold command → run dev host → modify example → add domain types → write tests → integrate with shell. Prerequisites include how to request access to the `@hexalith` GitHub Packages scope, with a clear "request access" path for evaluators. The guide targets a ≤ 30 minute first-module experience (measured from "I have registry access" to "my module runs in the dev host"). All code examples in the guide are extracted from tested source (not hand-written snippets that may drift).

2. **AC2 — Module development lifecycle guide covers full workflow.** Given a module development lifecycle guide exists, when a developer references it during development, then it covers: manifest definition, CQRS hook usage (actual hook names: `useSubmitCommand`, `useCommandPipeline`, `useQuery` — the epic text uses simplified names `useCommand`/`useProjection` but the code uses these), UI component patterns, Zod schema creation, testing strategy, dev host usage, and shell integration via git submodule. The guide provides backend context where needed (CommandApi endpoints, projection query patterns, command lifecycle) without requiring backend expertise.

3. **AC3 — Frontend-focused CQRS examples.** Given the documentation is frontend-focused, when a developer reads about CQRS integration, then examples show the frontend hooks and types — not backend implementation details. The backend is described as "the existing REST API that your hooks talk to" with endpoint reference.

4. **AC4 — Code examples are tested.** Given the documentation includes code examples, when the examples are tested, then all code examples compile and run (stale examples are a P1 bug per the DX NFRs).

_FRs covered: FR58, FR59_

## Tasks / Subtasks

- [x] Task 1: Create Getting Started guide (AC: #1, #3, #4)
  - [x] 1.1: Create `docs/getting-started.md` with these sections. **Structure note:** Lead with the scaffold command within the first 5 lines of the guide (before prerequisites) so developers see working code immediately. Then cover prerequisites for those who need setup. **Target length: ~2 pages (scannable, not a wall of text).**
    - **Quick start (first 5 lines):** Show `pnpm create hexalith-module my-orders && cd hexalith-my-orders && pnpm install && pnpm dev` — "have a working module in 2 minutes if you already have access"
    - **Prerequisites:** Node.js 22+, pnpm 9+, Git. Registry access: include the **exact `.npmrc` file content** as a copyable code block: `@hexalith:registry=https://npm.pkg.github.com` plus `//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}`. Explain how to create a GitHub personal access token with `read:packages` scope
    - **Scaffold your module:** `pnpm create hexalith-module my-orders` — show the interactive prompts and output directory structure
    - **Run the dev host:** `cd hexalith-my-orders && pnpm install && pnpm dev` — describe what appears in browser (mock auth, mock CQRS, three pages: list/detail/create)
    - **Modify the example:** Replace `Example` with domain-specific names, swap Zod schemas with domain types, modify pages to show domain data
    - **Add domain types:** Show how to create Zod schemas in `src/schemas/`, define command shapes and projection view models, use `z.infer<typeof Schema>` for type inference
    - **Write tests:** Show Vitest unit test pattern using `renderWithProviders` and `MockCommandBus`/`MockQueryBus`; mention Playwright CT for component tests
    - **Integrate with shell:** Separate **developer steps** (create GitHub repo, push module code) from **shell team steps** (run `git submodule add <repo-url>`, CI validates manifest, build includes module). Make the handoff point explicit
    - **Troubleshooting / Common Issues:** Include solutions for: registry auth failures (401 from npm — check `.npmrc` and `GITHUB_TOKEN`), Node version mismatch, `pnpm install` peer dependency warnings, dev host port conflicts
  - [x] 1.2: All code examples MUST be extracted from or match exactly the scaffold template files in `tools/create-hexalith-module/templates/module/` — no hand-written snippets

- [x] Task 2: Create Module Development Lifecycle guide (AC: #2, #3, #4)
  - [x] 2.1: Create `docs/module-development.md`. **Target length: ~5-7 pages.** This is the comprehensive reference — longer than Getting Started but still scannable with clear headings. Sections:
    - **Manifest definition:** Explain `ModuleManifest` type, `manifestVersion`, `name` (kebab-case), `displayName`, `version` (semver), `routes` (path declarations), `navigation` (label, path, icon, category). Show the scaffold-generated manifest from `templates/module/src/manifest.ts`
    - **CQRS hook usage:** Document `useSubmitCommand` (sends commands via `ICommandBus`), `useCommandPipeline` (full command lifecycle with status polling), `useQuery` (queries projections via `IQueryBus`). Show `SubmitCommandInput` shape: `{ commandType, domain, aggregateId, payload }`. Show `useQuery` with `QueryParams`: `{ queryType, domain, aggregateId }`. Explain the three-phase command lifecycle: submit → poll status → completed/rejected. Reference backend endpoints briefly: `POST /api/v1/commands` and `POST /api/v1/queries` — frontend hooks abstract these. **Include a "Which hook should I use?" decision tree:** `useSubmitCommand` = fire-and-forget (you handle the result yourself); `useCommandPipeline` = full lifecycle with automatic status polling and UI states (recommended for most cases); `useQuery` = read projection data; `useCommandStatus` = manually poll a command you already submitted; `useCanExecuteCommand`/`useCanExecuteQuery` = check authorization before showing a button/form
    - **UI component patterns:** Reference `@hexalith/ui` — `Table`, `DetailView`, `Form`, `PageLayout`, `Stack`, `Button`, `Input`, `Select`, `Skeleton`, `EmptyState`, `ErrorDisplay`. Show composition pattern from scaffold pages: list page (Table + useQuery), detail page (DetailView + useQuery), create page (Form + useSubmitCommand + Zod validation)
    - **Zod schema creation:** Show `schemas/exampleSchemas.ts` pattern — define schemas, infer types with `z.infer<>`. Explain that Zod schemas serve dual purpose: runtime validation + TypeScript type inference
    - **Testing strategy:** Document test runners (Vitest for `.test.tsx`, Playwright for `.spec.tsx`). Show `renderWithProviders` from `src/testing/renderWithProviders.tsx`. Explain `MockCommandBus` and `MockQueryBus` configuration. Show a test example from the scaffold
    - **Dev host usage:** Explain `dev-host/main.tsx` wraps module in `MockShellProvider` + `CqrsProvider` with mock buses. HMR, mock auth user, mock tenants
    - **Shell integration via git submodule:** Separate **developer steps** from **shell team steps**: (1) Developer: create GitHub repo, push module code, tag a release version. (2) Shell team: run `git submodule add <repo-url> modules/<module-name>`, update shell module registry import, run CI. (3) CI validates manifest, runs module tests, builds shell with module included. (4) Developer: verify module appears in shell navigation and routes work. Make the handoff point between developer and shell team explicit

- [x] Task 3: Create CQRS for Frontend Developers reference (AC: #2, #3)
  - [x] 3.1: Create `docs/cqrs-frontend-guide.md`. **Target length: ~2-3 pages.** Conceptual bridge for developers unfamiliar with CQRS — not a textbook, just enough to use the hooks confidently. Sections:
    - **What are commands?** A command tells the backend to _do_ something (create, update, delete). Frontend sends commands via `useSubmitCommand` or `useCommandPipeline`. The hook abstracts the HTTP POST, auth header injection, correlation ID, and status polling
    - **What are projections?** A projection is a read-optimized view of data. Frontend queries projections via `useQuery`. The hook abstracts the HTTP POST to query API, auth headers, ETag caching
    - **Command lifecycle:** Submit → Received → Processing → EventsStored → EventsPublished → Completed (or Rejected/Failed/TimedOut). Show `useCommandPipeline` status states. Frontend shows micro-indicator during processing, toast on completion, error display on rejection
    - **Error handling:** Show `HexalithError` hierarchy: `ApiError`, `AuthError`, `CommandRejectedError`, `CommandTimeoutError`, `ForbiddenError`, `RateLimitError`, `ValidationError`. Explain error boundary hierarchy: shell catches catastrophic errors, module error boundary catches module errors, hooks surface expected errors via return values
    - **Backend endpoint reference (read-only context):** Table showing the 6 endpoints (`POST /api/v1/commands`, `GET /api/v1/commands/status/{id}`, etc.) with purpose and response shapes. Explicitly note: "You never call these directly — the CQRS hooks handle everything"

- [x] Task 4: Create API Quick Reference (AC: #2, #3)
  - [x] 4.1: Create `docs/api-reference.md` — concise, dense reference. **Target length: ~3-4 pages (compact tables, minimal prose).** **Format:** grouped headings per package, with a table per category showing export name, type (component/hook/type/class), and one-line description. MUST list ALL exports from each package barrel (`src/index.ts`), not a curated subset:
    - **@hexalith/shell-api exports:** Auth (`AuthProvider`, `useAuth`), Tenant (`TenantProvider`, `useTenant`), Theme (`ThemeProvider`, `useTheme`), Locale (`LocaleProvider`, `useLocale`), Connection Health (`ConnectionHealthProvider`, `useConnectionHealth`), Form Dirty (`FormDirtyProvider`, `useFormDirty`), Manifest (`ModuleManifest` type, `ModuleManifestV1`, `ModuleRoute`, `ModuleNavigation`, `validateManifest`, `ManifestValidationResult`, `ManifestValidationError`), Types (`AuthContextValue`, `AuthUser`, `ConnectionHealth`, `TenantContextValue`, `ThemeContextValue`, `LocaleContextValue`, `Theme`), Testing (`MockShellProvider`, `createMockAuthContext`, `createMockTenantContext`, `createMockConnectionHealthContext`, `createMockFormDirtyContext`)
    - **@hexalith/cqrs-client exports:** Provider (`CqrsProvider`, `useCqrs`), Commands (`useSubmitCommand`, `useCommandPipeline`, `useCommandStatus`, `SubmitCommandInput`, `PipelineStatus`), Queries (`useQuery`, `QueryProvider`, `QueryParams`, `QueryOptions`, `UseQueryResult`), Connection (`useConnectionState`, `ConnectionState`, `TransportType`), SignalR (`SignalRHub`, `SignalRProvider`, `useSignalRHub`, `useProjectionSubscription`), Validation (`useCanExecuteCommand`, `useCanExecuteQuery`), Errors (`HexalithError`, `ApiError`, `AuthError`, `CommandRejectedError`, `CommandTimeoutError`, `ForbiddenError`, `RateLimitError`, `ValidationError`), Types (`CommandStatus`, `CommandStatusResponse`, `ProblemDetails`, `SubmitCommandRequest`, `SubmitCommandResponse`, `SubmitQueryRequest`, `SubmitQueryResponse`), Utilities (`generateCorrelationId`, `parseProblemDetails`), Mocks (`MockCommandBus`, `MockQueryBus`, `MockSignalRHub`)
    - **@hexalith/ui exports:** Layout (`PageLayout`, `Stack`, `Inline`, `Divider`), Forms (`Button`, `Input`, `Select`, `TextArea`, `Checkbox`, `Form`, `FormField`, `useFormStatus`, `DatePicker`), Feedback (`ToastProvider`, `useToast`, `Skeleton`, `EmptyState`, `ErrorDisplay`, `ErrorBoundary`), Navigation (`Sidebar`, `Tabs`), Overlay (`Tooltip`, `Modal`, `AlertDialog`, `DropdownMenu`, `Popover`), Data Display (`Table`, `DetailView`), Utilities (`computeComplianceScore`, contrast matrix functions)

- [x] Task 5: Create docs index / table of contents (AC: #1, #2)
  - [x] 5.1: Create `docs/index.md` — entry point with two sections:
    - **Document links with brief descriptions:**
      - Getting Started — scaffold to shipping in 30 minutes
      - Module Development — full lifecycle reference
      - CQRS for Frontend Developers — commands, projections, error handling
      - API Reference — complete package export catalog
      - Storybook — interactive component documentation (run `pnpm storybook` locally, or `pnpm -F @hexalith/ui storybook`)
    - **"I want to..." quick links** (task-oriented navigation for developers who know what they need):
      - "I want to create a new module" → getting-started.md
      - "I want to send a command" → cqrs-frontend-guide.md#commands
      - "I want to query data" → cqrs-frontend-guide.md#projections
      - "I want to add a table/form/page" → module-development.md#ui-component-patterns
      - "I want to write tests" → module-development.md#testing-strategy
      - "I want to publish my module" → module-development.md#shell-integration
      - "I want to look up a hook/component" → api-reference.md

- [x] **DEFINITION OF DONE GATE — All previous tasks must pass these verification checks before the story is complete.**

- [x] Task 6: Verification (AC: #1-#4)
  - [x] 6.1: All code examples in `docs/getting-started.md` match scaffold template files (diff check). Trimmed excerpts are acceptable — use `// ...` to indicate omitted lines and cite the source file (e.g., `// See full example: src/pages/ExampleListPage.tsx`). The shown code must be verbatim from the source, not rewritten.
  - [x] 6.2: All code examples in `docs/module-development.md` match actual source files or scaffold templates (same trimmed-excerpt policy)
  - [x] 6.3: All CQRS hook names, types, and parameters in `docs/cqrs-frontend-guide.md` match `packages/cqrs-client/src/index.ts` exports
  - [x] 6.4: All shell-api exports listed in `docs/api-reference.md` match `packages/shell-api/src/index.ts` — no missing exports, no fabricated exports
  - [x] 6.5: All cqrs-client exports listed in `docs/api-reference.md` match `packages/cqrs-client/src/index.ts` — no missing exports
  - [x] 6.6: All UI exports listed in `docs/api-reference.md` match `packages/ui/src/index.ts` — no missing exports
  - [x] 6.7: The Getting Started guide steps can be followed sequentially without gaps (manual walkthrough)
  - [x] 6.8: No documentation references `react-router-dom` — must use `react-router` (v7 unified package)
  - [x] 6.9: No documentation references `useCommand` or `useProjection` as hook names — actual names are `useSubmitCommand`/`useCommandPipeline` and `useQuery`
  - [x] 6.10: `SubmitCommandInput` shape uses `commandType`, `domain`, `payload` — NOT `commandName`, `aggregateName`, `body`
  - [x] 6.11: Verify `docs/` directory is created at project root with all 5 files (index.md + 4 guides)
  - [x] 6.12: `docs/index.md` links to all 4 documentation files with correct relative paths

## Dev Notes

### Scope Boundaries — What This Story IS and IS NOT

**This story creates developer-facing documentation for module developers.**

**This story IS:**

- Creating a docs index / table of contents (`docs/index.md`)
- Creating a Getting Started guide (`docs/getting-started.md`)
- Creating a Module Development Lifecycle guide (`docs/module-development.md`)
- Creating a CQRS for Frontend Developers guide (`docs/cqrs-frontend-guide.md`)
- Creating an API Quick Reference (`docs/api-reference.md`)

**This story is NOT:**

- Platform knowledge bundle for AI generation (Epic 7, Story 7.1)
- AI prompt templates (Story 7.2)
- Storybook showcase (Story 3.9 — already done)
- Shell team guide (deferred to Phase 2 documentation)
- Component library usage documentation beyond quick reference (Storybook serves this role)
- Architecture documentation (architecture.md already exists)

### Architecture Constraints — MUST Follow

1. **(CRITICAL) Code examples MUST be extracted from tested source.** The PRD and DX NFRs specify: "All code examples in docs are extracted from tested source. Stale examples are a P1 bug." This means examples should be copied from `tools/create-hexalith-module/templates/module/` or `packages/*/src/` — not hand-written. Trimmed excerpts are acceptable: use `// ...` to indicate omitted lines and cite the source file (e.g., `// See full example: src/pages/ExampleListPage.tsx`). The shown lines must be verbatim from the source, not rewritten or fabricated. **Max excerpt length: ~30 lines.** Focus on the key pattern (e.g., the hook call + the JSX that uses it), not the full file. If a file is 160 lines, show the 20-30 lines that demonstrate the pattern. [Source: prd.md#Developer Documentation, architecture.md#DX NFR]

2. **(CRITICAL) Frontend-focused — no backend implementation details.** The PRD specifies the documentation is "written from the module developer's perspective — backend architecture (EventStore, DAPR, .NET) is provided as context where needed, not as curriculum." CQRS concepts should be explained as "what the hooks do for you" — not how EventStore works internally. [Source: prd.md#Documentation Strategy]

3. **(CRITICAL) Use actual hook names from the codebase.** The PRD/epics use simplified names like `useCommand` and `useProjection`. The actual implemented hooks are:
   - `useSubmitCommand` — fire-and-forget command submission
   - `useCommandPipeline` — full command lifecycle with status polling
   - `useCommandStatus` — poll status of an existing command
   - `useQuery` — query projection data (NOT `useProjection`)
   - `useProjectionSubscription` — SignalR projection change subscription
   - `useConnectionState` — connection state indicator
   - `useCanExecuteCommand` / `useCanExecuteQuery` — pre-flight authorization
     Documentation MUST use these actual names, not the simplified PRD names.

4. **(CRITICAL) `SubmitCommandInput` uses `commandType`, `domain`, `payload`.** NOT `commandName`, `aggregateName`, `body`. This was established in Story 4.2. [Source: 4-2-scaffold-example-code-premium-showcase.md]

5. **(CRITICAL) Import from `react-router`, NOT `react-router-dom`.** The project uses react-router v7 unified package. [Source: Story 4.2 learnings]

6. **Documentation goes in `docs/` at project root.** The architecture maps FR58-FR59 to `packages/ui/.storybook/ + docs`. The `docs/` directory is the primary documentation location. Storybook serves as the living component catalog (already done in Story 3.9).

7. **No `enum` types in examples.** Use union types. [Source: architecture.md#Code Naming]

8. **File naming for docs:** Use kebab-case `.md` files. No spaces in filenames.

9. **(CRITICAL) Read actual barrel files at implementation time.** The export lists in this story are a snapshot — the codebase is the source of truth. When building the API reference, read the actual `packages/*/src/index.ts` files rather than relying solely on this story's static list, which may be stale by the time you implement.

10. **The scaffold IS the primary documentation.** The scaffold templates are working, tested code examples. These docs explain the _why_ behind the scaffold patterns — the scaffold shows the _how_. Every guide should explicitly tell developers: "The best reference is the scaffold itself. Read `ExampleListPage.tsx` for the list pattern, `ExampleCreatePage.tsx` for the form pattern."

11. **Known gap: no automated staleness detection.** There is currently no CI check that documentation code examples match their source files. AC4 makes stale examples a P1 bug, but enforcement is manual (verification tasks in this story). A future CI lint check to diff doc examples against source would close this gap — out of scope for this story but worth flagging.

### Existing Codebase Context — MUST Reference

**Scaffold template files (source of truth for code examples):**

- `tools/create-hexalith-module/templates/module/src/manifest.ts` — manifest with `manifestVersion: 1`, `name`, `displayName`, `version`, `routes`, `navigation` (includes `icon` and `category`)
- `tools/create-hexalith-module/templates/module/src/routes.tsx` — three routes: `/` (list), `/:id` (detail), `/create` (form), all `React.lazy()` with `Suspense` + `Skeleton`
- `tools/create-hexalith-module/templates/module/src/schemas/exampleSchemas.ts` — Zod schemas with `z.infer<>` type inference
- `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx` — `useQuery` + `Table`
- `tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.tsx` — `useQuery` + `DetailView`
- `tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx` — `useSubmitCommand` + `Form` + Zod
- `tools/create-hexalith-module/templates/module/dev-host/main.tsx` — `MockShellProvider` + `CqrsProvider` + mock buses
- `tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx` — test utility
- `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.test.tsx` — Vitest test example
- `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.spec.tsx` — Playwright CT test example
- `tools/create-hexalith-module/templates/module/dev-host/mockSetup.ts` — mock data setup

**Package public APIs (source of truth for API reference):**

- `packages/shell-api/src/index.ts` — all shell-api exports
- `packages/cqrs-client/src/index.ts` — all cqrs-client exports
- `packages/ui/src/index.ts` — all UI exports

**Backend API surface (for CQRS context):**

- `POST /api/v1/commands` → 202 + `{ correlationId }`
- `GET /api/v1/commands/status/{id}` → 200 + `CommandStatusResponse`
- `POST /api/v1/commands/validate` → 200 + `{ isAuthorized, reason? }`
- `POST /api/v1/queries` → 200 + `{ correlationId, payload }` + `ETag`
- `POST /api/v1/queries/validate` → 200 + `{ isAuthorized, reason? }`

**Command lifecycle states:** `Received` → `Processing` → `EventsStored` → `EventsPublished` → `Completed` (or `Rejected` / `PublishFailed` / `TimedOut`)

**Error hierarchy (from `packages/cqrs-client/src/errors.ts`):**

- `HexalithError` (abstract base)
- `ApiError` (HTTP errors)
- `AuthError` (401)
- `ForbiddenError` (403)
- `RateLimitError` (429)
- `ValidationError` (Zod validation failures)
- `CommandRejectedError` (domain rejection)
- `CommandTimeoutError` (polling timeout)

**`SubmitCommandInput` type (from `packages/cqrs-client/src/commands/types.ts`):**

```typescript
{
  commandType: string; // Fully qualified .NET type name
  domain: string; // Domain/aggregate root
  aggregateId: string; // Target aggregate
  payload: unknown; // Domain-specific command data
}
```

**Module directory structure (generated by scaffold CLI):**

```
hexalith-my-orders/
├── src/
│   ├── index.ts
│   ├── manifest.ts
│   ├── routes.tsx
│   ├── schemas/
│   ├── pages/
│   ├── components/
│   ├── hooks/
│   ├── data/
│   ├── css-modules.d.ts
│   └── test-setup.ts
├── dev-host/
│   ├── index.html
│   ├── main.tsx
│   ├── mockSetup.ts
│   ├── dev-host.css
│   └── vite.config.ts
├── playwright/
│   ├── index.html
│   └── index.tsx
├── tsconfig.json
├── vitest.config.ts
├── playwright-ct.config.ts
└── package.json
```

### Critical Anti-Patterns to Prevent

1. **Do NOT write code examples from memory.** Extract from actual template files or package source. Invented code examples WILL drift and become stale documentation bugs.
2. **Do NOT reference `useCommand` or `useProjection`.** These are simplified PRD names. Actual hooks: `useSubmitCommand`, `useCommandPipeline`, `useQuery`.
3. **Do NOT explain EventStore internals, DAPR sidecars, or .NET microservice architecture.** Documentation is frontend-focused. Backend is "the API your hooks talk to."
4. **Do NOT reference `react-router-dom`.** Use `react-router` (v7 unified).
5. **Do NOT reference `ky` as the HTTP client.** Module developers never interact with the HTTP layer — CQRS hooks abstract it entirely.
6. **Do NOT reference `@radix-ui/*` components.** Module developers use `@hexalith/ui` components. Radix is an internal implementation detail.
7. **Do NOT create a separate "hello world" example.** The scaffold itself IS the example — Tenants is simple enough to serve as reference.
8. **Do NOT over-document component props.** Storybook is the living component catalog (Story 3.9). The docs reference Storybook for detailed component documentation — reference it as `pnpm storybook` (or `pnpm -F @hexalith/ui storybook`), not a URL (there is no deployed Storybook URL yet).
9. **Do NOT include architecture diagrams or design decisions.** Architecture documentation exists separately. These docs are practical "how to" guides.

### Previous Story Intelligence (Stories 4.1-4.5)

**Story 4.1 (done):** CLI scaffold engine, `__PLACEHOLDER__` token replacement, template files type-checked against current `@hexalith/*` types.

**Story 4.2 (done):** Zod schemas, domain types, page components (list/detail/create), `react-router` v7 (NOT `react-router-dom`). `SubmitCommandInput` uses `commandType`, `domain`, `payload`. Scaffold produces a "premium showcase" — not a bare skeleton.

**Story 4.3 (done):** Dev-host with `MockShellProvider` + `CqrsProvider` + mock buses. HMR, mock auth, standalone development without cloning shell repo.

**Story 4.4 (done):** Vitest tests (`.test.tsx`) + Playwright CT tests (`.spec.tsx`), `renderWithProviders`, `MockCommandBus`/`MockQueryBus` fixtures, `test-setup.ts`.

**Story 4.5 (review):** `validateManifest` runtime validation, manifest type tests, scaffold manifest template with `icon` and `category`. Manifest routes are declarations (`{ path }`) — NOT runtime route objects.

### Git Intelligence — Recent Commits

```
e28db39 chore: update subproject commit reference for Hexalith.Tenants
b652bd3 feat: update scaffolded tests and manifest validation, enhance loading state assertions
1e94579 feat: implement typed manifest and module boundary with runtime validation
8627b8d feat: add CSS token imports and dev-host setup
8558a02 feat: add example module with CRUD functionality
```

Stories 4.1-4.4 are committed. Story 4.5 work is in the latest commits (manifest validation).

### Project Structure Notes

**Files to create:**

- `docs/index.md` — Documentation entry point / table of contents
- `docs/getting-started.md` — Getting Started guide
- `docs/module-development.md` — Module development lifecycle guide
- `docs/cqrs-frontend-guide.md` — CQRS for frontend developers
- `docs/api-reference.md` — API quick reference

**Files that are source of truth for code examples (DO NOT modify):**

- `tools/create-hexalith-module/templates/module/src/**/*` — scaffold templates
- `packages/shell-api/src/index.ts` — shell-api public API
- `packages/cqrs-client/src/index.ts` — cqrs-client public API
- `packages/ui/src/index.ts` — UI public API

### Commit Strategy

All five documentation files can be committed together as a single cohesive commit since they form one logical deliverable: developer documentation.

### References

- [Source: epics.md#Story 4.6] — Full acceptance criteria
- [Source: prd.md#Documentation Strategy] — Primary documentation artifact definition
- [Source: prd.md#Developer Platform Specific Requirements] — Documentation sections coverage
- [Source: prd.md#FR58] — Getting Started guide requirement
- [Source: prd.md#FR59] — Frontend-focused guide requirement
- [Source: architecture.md#FR58-FR59 mapping] — Documentation mapped to `packages/ui/.storybook/` + docs
- [Source: architecture.md#API & Communication Patterns] — Backend API surface and command lifecycle
- [Source: architecture.md#Naming Patterns] — File and code naming conventions
- [Source: architecture.md#Complete Project Directory Structure] — Module structure reference
- [Source: packages/shell-api/src/index.ts] — Shell-api public API exports
- [Source: packages/cqrs-client/src/index.ts] — CQRS-client public API exports
- [Source: packages/ui/src/index.ts] — UI public API exports
- [Source: tools/create-hexalith-module/templates/module/] — Scaffold template source of truth
- [Source: Story 4.1 — 4-1-create-hexalith-module-cli.md] — CLI scaffold engine
- [Source: Story 4.2 — 4-2-scaffold-example-code-premium-showcase.md] — Example code, hook names, import conventions
- [Source: Story 4.3 — 4-3-dev-host-for-independent-module-development.md] — Dev-host with MockShellProvider
- [Source: Story 4.4 — 4-4-scaffolded-tests-and-test-fixtures.md] — Test infrastructure
- [Source: Story 4.5 — 4-5-typed-manifest-and-module-boundary.md] — Manifest validation, module boundary

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — implementation completed without blockers.

### Completion Notes List

- Created 5 documentation files in `docs/` at project root
- All code examples extracted from scaffold templates (`tools/create-hexalith-module/templates/module/`) — no hand-written snippets
- API reference covers ALL exports from `packages/shell-api/src/index.ts`, `packages/cqrs-client/src/index.ts`, and `packages/ui/src/index.ts` — verified with no missing or fabricated exports
- Uses actual hook names (`useSubmitCommand`, `useCommandPipeline`, `useQuery`) — not simplified PRD names
- Uses `react-router` throughout — no `react-router-dom` references
- `SubmitCommandInput` documented with correct fields (`commandType`, `domain`, `aggregateId`, `payload`, `extensions?`)
- Getting Started guide leads with quick-start command, includes troubleshooting section
- Index includes "I want to..." task-oriented quick links
- Module Development includes "Which hook should I use?" decision table
- Shell integration sections separate developer steps from shell team steps with explicit handoff point

### Change Log

- 2026-03-21: Created all 5 documentation files — getting-started.md, module-development.md, cqrs-frontend-guide.md, api-reference.md, index.md
- 2026-03-21: All 12 verification checks passed (6.1-6.12)
- 2026-03-21: Senior developer review found 1 high-severity and 2 medium-severity issues; story returned to in-progress
- 2026-03-21: Fixed all review findings — verbatim source excerpts restored, Storybook references localized, and CQRS quick links aligned with the requested anchors

### File List

- `docs/index.md` (new) — Documentation entry point with guide links and "I want to..." quick links
- `docs/getting-started.md` (new) — Getting Started guide with quick-start, prerequisites, scaffold, dev host, testing, shell integration, troubleshooting
- `docs/module-development.md` (new) — Module Development Lifecycle guide with manifest, CQRS hooks, UI patterns, Zod schemas, testing, dev host, shell integration
- `docs/cqrs-frontend-guide.md` (new) — CQRS for Frontend Developers guide with commands, projections, lifecycle, errors, endpoint reference
- `docs/api-reference.md` (new) — API Quick Reference with complete export catalog for shell-api, cqrs-client, and ui packages

### Senior Developer Review (AI)

**Reviewer:** GitHub Copilot (GPT-5.4)
**Date:** 2026-03-21
**Outcome:** Approved after fixes

#### Summary

- High fixed: 1
- Medium fixed: 2
- Low: 0

#### Resolution

1. Restored source-aligned excerpts in `docs/getting-started.md` and `docs/module-development.md` so the documented code matches the tested scaffold source instead of paraphrased snippets.
1. Replaced Storybook localhost URLs with the required local command references in `docs/module-development.md`, `docs/api-reference.md`, and `docs/index.md`.
1. Aligned the CQRS guide headings and `docs/index.md` quick links to the required `#commands` and `#projections` anchors.

#### Git vs Story Notes

- The story file list correctly identifies the five new documentation files.
- Review findings were fixed in-place in the documentation set and story metadata.
