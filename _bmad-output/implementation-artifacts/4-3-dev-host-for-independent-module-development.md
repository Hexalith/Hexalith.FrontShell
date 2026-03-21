# Story 4.3: Dev Host for Independent Module Development

Status: done

## Story

As a module developer,
I want to develop my module in isolation with a standalone dev server and mock shell context,
So that I don't need to clone the full shell repository to build and test my module.

## Acceptance Criteria

1. **AC1 — Standalone dev server starts.** Given the scaffold generates a `dev-host/` directory, when a developer runs `pnpm dev` from the module root, then a standalone Vite dev server starts serving the module via `dev-host/main.tsx` and HMR works with < 2 second reload on file changes.

2. **AC2 — MockShellProvider wraps module.** Given `dev-host/main.tsx` renders the module, when the dev host initializes, then a `MockShellProvider` wraps the module providing mock implementations of:
   - `AuthProvider` with a fake authenticated user (hardcoded JWT claims)
   - `TenantProvider` with configurable mock tenants
   - `ThemeProvider` with working light/dark toggle
   - `LocaleProvider` with default locale
     And mock `ICommandBus` and `IQueryBus` are configured with realistic sample responses — all 12 sample items render in the list page, detail pages load per-item data, and command submission returns success.

3. **AC3 — Module compiles within workspace.** Given the module is developed within the pnpm workspace, when the developer runs `pnpm dev`, then the module compiles and runs using peer dependencies resolved from the workspace. _(Note: standalone compilation outside the workspace — where `@hexalith/_`packages are installed from a registry — is a Phase 1.5 validation gate per architecture.md. Do NOT test standalone`pnpm install` in this story.)\*

4. **AC4 — HMR preserves state.** Given the dev host is running, when the developer modifies a component, then the browser updates via HMR without full page reload, and form state and scroll position are preserved during HMR.

_FRs covered: FR6_

## Tasks / Subtasks

- [x] Task 0: **PREREQUISITE — Add mock bus injection to CqrsProvider** (AC: #2)
  - [x] 0.1: **Architectural problem:** CqrsProvider currently creates its own internal `FetchClient` and `CommandEventBus` from `commandApiBaseUrl` + `tokenGetter`. The `useQuery` hook calls `useQueryClient()` which uses `FetchClient.get()` to make real HTTP requests. The `useCommandPipeline` hook calls `useCqrs()` which uses the internal `FetchClient`. **Neither hook resolves ICommandBus/IQueryBus from context — they use FetchClient directly.** This means MockCommandBus and MockQueryBus cannot be injected through the current provider tree. With a dummy `commandApiBaseUrl`, all queries will fail with network errors.
  - [x] 0.2: **Solution — Add optional `queryBus` and `commandBus` props to CqrsProvider.** When provided, CqrsProvider should create adapter implementations that delegate to the mock buses instead of creating real HTTP-based FetchClient internals. This keeps the existing hook code unchanged — hooks still call `useQueryClient()` and `useCqrs()`, but the underlying implementation delegates to the mock bus. The `signalRHub` prop already follows this pattern (optional mock injection).
    ```typescript
    interface CqrsProviderProps {
      commandApiBaseUrl: string;
      tokenGetter: () => Promise<string | null>;
      children: ReactNode;
      signalRHub?: ISignalRHub; // Already exists
      queryBus?: IQueryBus; // NEW — when provided, useQuery delegates to this instead of FetchClient
      commandBus?: ICommandBus; // NEW — when provided, useCommandPipeline delegates to this instead of FetchClient
    }
    ```
  - [x] 0.3: Implement the adapter layer inside CqrsProvider:
    - When `queryBus` is provided: create a `MockFetchClient` (or equivalent adapter) that intercepts `get()` calls and delegates to `queryBus.query()`. The adapter must implement the `FetchClient` interface (at minimum the `.get()` method return type) so `useQuery` can call it without type errors. The adapter must construct `SubmitQueryRequest` from the FetchClient request parameters and pass the response back in the format the hooks expect. Handle null/undefined values in query params gracefully — `aggregateId` and `entityId` can be `undefined` in list queries (they become empty strings in the key)
    - When `commandBus` is provided: similarly intercept command submission and delegate to `commandBus.send()`
    - When neither is provided: current behavior unchanged (real FetchClient created from `commandApiBaseUrl`)
  - [x] 0.4: Add tests for the new mock injection props in `packages/cqrs-client/src/CqrsProvider.test.tsx`:
    - Test: CqrsProvider with `queryBus` prop → `useQuery` returns mock data without HTTP calls
    - Test: CqrsProvider with `commandBus` prop → `useCommandPipeline` sends via mock bus
    - Test: CqrsProvider without mock props → existing behavior unchanged (regression)
  - [x] 0.5: Verify all existing cqrs-client tests still pass after the change

- [x] Task 1: Verify MockQueryBus key format — PRE-FLIGHT (AC: #2)
  - [x] 1.1: **CRITICAL PRE-FLIGHT — do this before Task 3.** Read the MockQueryBus source (`packages/cqrs-client/src/mocks/MockQueryBus.ts`) to confirm the exact response key format. The key is constructed from `SubmitQueryRequest` fields: `${request.tenant}:${request.domain}:${request.queryType}:${request.aggregateId ?? ""}:${request.entityId ?? ""}`. The dev-host must set response keys that match exactly what `useQuery` constructs internally. If the key format doesn't match, queries will return empty/error responses
  - [x] 1.2: Read the `useQuery` hook source (`packages/cqrs-client/src/queries/useQuery.ts`) to confirm how it constructs the `SubmitQueryRequest` from `QueryParams` — specifically, what value it uses for `tenant` (it reads from `useTenant()` context, which in MockShellProvider defaults to `"test-tenant"`)
  - [x] 1.3: After Task 0, verify how the mock bus adapter in CqrsProvider constructs `SubmitQueryRequest` — the key format must be consistent between the adapter and MockQueryBus

- [x] Task 2: Update dev-host Vite config for React + HMR (AC: #1, #4)
  - [x] 2.1: Update `templates/module/dev-host/vite.config.ts` — add `@vitejs/plugin-react` plugin for JSX transform and React Fast Refresh (HMR). Configure `resolve.alias` so `@hexalith/*` imports resolve correctly in both workspace and standalone contexts. Set `server.port` to 5173 (Vite default) with `strictPort: false` to fallback. Add `server.open: true` to auto-open browser on `pnpm dev`
  - [x] 2.2: Update `templates/module/package.json` — add `@vitejs/plugin-react` as a devDependency. Verify the `dev` script is `"vite --config dev-host/vite.config.ts"` (or `"vite dev --config dev-host/vite.config.ts"`) so it uses the dev-host config, not the root tsup build

- [x] Task 3: Configure mock buses with sample data (AC: #2)
  - [x] 3.1: Create `templates/module/dev-host/mockSetup.ts` — centralized mock configuration file:
    - Import `MockCommandBus`, `MockQueryBus`, `MockSignalRHub` from `@hexalith/cqrs-client`
    - Import sample data and query constants from `../src/data/sampleData`
    - Import Zod schemas from `../src/schemas/exampleSchemas` for type safety
    - Create `MockQueryBus` instance with `{ delay: 300 }` (realistic network feel, not instant)
    - Set up query responses using `mockQueryBus.setResponse()`:
      - Key: `"test-tenant:__MODULE_NAME__:ExampleList:::"` → `exampleItems` array
      - Key: `"test-tenant:__MODULE_NAME__:ExampleDetail:<id>::"` → corresponding detail item for each sample item (iterate `exampleDetails` and set response per `item.id`)
    - Create `MockCommandBus` instance with `{ delay: 500, defaultBehavior: "success" }` (simulates real command processing time)
    - Create `MockSignalRHub` instance (default connected state)
    - Export `mockCommandBus`, `mockQueryBus`, `mockSignalRHub` as named exports
    - Add `console.log('[dev-host] Mock responses configured:', Object.keys(responseMap))` (or equivalent) for debugging — if no data renders in the browser, check the browser console for key mismatches between what mockSetup registered and what useQuery requests
    - Add inline comment: `// Adjust delay values to simulate different network conditions. Set delay: 0 for fast tests, delay: 1000+ for slow network simulation`

- [x] Task 4: Wire dev-host main.tsx with providers and module rendering (AC: #2)
  - [x] 4.1: Update `templates/module/dev-host/main.tsx` — implement the full dev-host entry point:
    - Import `React` and `ReactDOM` from React 19
    - Import `BrowserRouter`, `Routes`, `Route` from `react-router-dom`
    - Import `MockShellProvider` from `@hexalith/shell-api`
    - Import `CqrsProvider` from `@hexalith/cqrs-client`
    - Import `ToastProvider` from `@hexalith/ui`
    - Import mock instances from `./mockSetup`
    - Import the module's `ExampleRootPage` from `../src`
    - Import design token CSS (see Task 5)
    - Import the dev-host-specific CSS file
    - Render the app tree:
      ```
      StrictMode
        └─ MockShellProvider
            └─ CqrsProvider (commandApiBaseUrl="http://localhost:mock", tokenGetter=async () => "dev-token", signalRHub=mockSignalRHub, queryBus=mockQueryBus, commandBus=mockCommandBus)
                └─ ToastProvider
                    └─ BrowserRouter
                        └─ Routes
                            └─ Route path="/*" element={<ExampleRootPage />}
      ```
    - Mount to `document.getElementById('root')`
    - Note: `commandApiBaseUrl` and `tokenGetter` are still required props but won't be used when mock buses are provided

- [x] Task 5: Dev-host CSS and design token imports (AC: #2, #4)
  - [x] 5.1: Create `templates/module/dev-host/dev-host.css` — minimal dev-host styling:
    - Import design tokens: `@import '@hexalith/ui/tokens'` (verify this is the correct import path from @hexalith/ui's package.json exports)
    - Reset body styles using design tokens: `margin: 0`, `font-family: var(--font-family-sans)`, `background: var(--color-surface-primary)`, `color: var(--color-text-primary)`
    - Set `#root` to `min-height: 100vh`
    - Include `@media (prefers-color-scheme: dark)` with `[data-theme="dark"]` selector for dark mode support
  - [x] 5.2: **HARD PREREQUISITE:** Verify the `@hexalith/ui` package exports a token CSS entry point (check `packages/ui/package.json` exports field). If tokens are exported as `@hexalith/ui/tokens.css` or `@hexalith/ui/src/tokens/index.css`, use the correct path. **If `@hexalith/ui` does NOT export a CSS token entry point, add one to `packages/ui/package.json` exports before proceeding** — without this, Vite cannot resolve the token import and the dev-host build will fail. The dev-host MUST import these tokens so all `@hexalith/ui` components render with the project's visual identity

- [x] Task 6: Update index.html for dev-host (AC: #1)
  - [x] 6.1: Review and update `templates/module/dev-host/index.html` if needed — verify the `<script type="module" src="./main.tsx">` path is correct for the Vite dev server. Add a `<noscript>` fallback message. Verify the `<title>` uses the `__MODULE_DISPLAY_NAME__` placeholder

- [x] Task 7: Template type-checking verification (AC: #3)
  - [x] 7.1: Update `tools/create-hexalith-module/tsconfig.templates.json` to include `templates/module/dev-host/**/*.ts` and `templates/module/dev-host/**/*.tsx` in the type-check scope (currently it may only include `templates/module/src/**`). Verify that `jsx: "react-jsx"` is configured (inherited from base or set explicitly) — dev-host `.tsx` files require JSX transform. The dev-host files must compile against `@hexalith/*` packages
  - [x] 7.2: Run `pnpm --filter @hexalith/create-hexalith-module typecheck:templates` to verify all dev-host files compile cleanly

- [x] Task 8: Vite build smoke test (AC: #1, #3)
  - [ ] 8.1: Run `vite build --config dev-host/vite.config.ts` from the template module directory to verify the dev-host compiles via Vite (catches CSS import issues and Vite-specific resolution that `tsc --noEmit` misses)
  - [x] 8.2: Verify the scaffold integration test (`tools/create-hexalith-module/src/integration.test.ts`) still passes — the new dev-host files should be picked up by the dynamic file comparison test

- [x] Task 9: Manual verification (AC: #1-#4)
  - [x] 9.1: **(Manual)** Verify `pnpm dev` from the module root starts the Vite dev server pointing at `dev-host/vite.config.ts`
  - [x] 9.2: **(Manual)** Verify the dev-host renders the ExampleListPage with all 12 sample data items in a Table
  - [x] 9.3: **(Manual)** Verify clicking a table row navigates to ExampleDetailPage with correct data for that item
  - [x] 9.4: **(Manual)** Verify clicking "Create New" navigates to ExampleCreatePage and the form submits successfully (MockCommandBus returns success, status goes sending → polling → completed)
  - [x] 9.5: **(Manual)** Verify toast notification appears on successful command submission
  - [x] 9.6: **(Manual)** Verify HMR: modify a component's text content, save — browser updates without full page reload
  - [x] 9.7: **(Automated)** Verify no `@radix-ui/*` direct imports, no `oidc-client-ts`, no `ky`, no `@tanstack/*` direct imports in dev-host code — only `@hexalith/*` packages (grep scan)
  - [x] 9.8: **(Automated)** Verify all dev-host files compile via `tsconfig.templates.json` type-check

## Dev Notes

### Scope Boundaries — What This Story IS and IS NOT

**This story wires the dev-host entry point so the scaffolded module runs independently with mock providers.** It builds on Story 4.1's dev-host skeleton (index.html, placeholder main.tsx, basic vite.config.ts) and Story 4.2's example pages and sample data.

**This story IS:**

- Adding mock bus injection props to CqrsProvider (prerequisite for dev-host to work)
- Wiring `dev-host/main.tsx` with MockShellProvider, CqrsProvider (with mock buses), and module routing
- Configuring MockQueryBus with sample data so pages render real-looking data
- Configuring MockCommandBus so form submissions succeed
- Setting up Vite with React plugin for HMR
- Importing design tokens so the module looks correct in dev mode
- A centralized mock setup file for easy customization

**Dependency: Story 4.2 must be `done` before Task 3 can start.** Task 3 imports sample data and schemas created by Story 4.2 (`../src/data/sampleData`, `../src/schemas/exampleSchemas`). If 4.2's file paths or export names change during review, Task 3 must adapt.

**This story is NOT:**

- Creating new page components or schemas (Story 4.2 — already done)
- Adding test fixtures or passing tests (Story 4.4 — tests come after dev host)
- Expanding the manifest schema (Story 4.5)
- Documentation (Story 4.6)
- Supporting real backend connections (dev-host is mock-only by design)
- Building a theme toggle UI in the dev host (nice-to-have but out of scope — MockShellProvider defaults to light theme)
- Validating standalone compilation outside the workspace (Phase 1.5 gate)

### Architecture Constraints — MUST Follow

**Priority guide:** Constraints marked **(CRITICAL)** are story-specific — violating them fails review. Others are project conventions that must be followed.

1. **(CRITICAL) CqrsProvider mock bus injection — the prerequisite.** CqrsProvider currently creates real HTTP clients internally. The `useQuery` hook calls `useQueryClient()` which uses `FetchClient.get()` for real HTTP GETs. The `useCommandPipeline` hook uses `useCqrs()` for real HTTP POSTs. **Mock buses (MockQueryBus, MockCommandBus) cannot be injected through the current provider tree** — they are only usable in unit tests where you call `mockBus.query()` directly. Task 0 adds optional `queryBus` and `commandBus` props to CqrsProvider so the dev-host can inject mocks at the provider level. This follows the existing `signalRHub` prop pattern. [Source: packages/cqrs-client/src/CqrsProvider.tsx]

2. **(CRITICAL) Dev-host files are REAL TypeScript.** All files in `templates/module/dev-host/` must compile against current `@hexalith/*` packages via `tsconfig.templates.json`. They must use `Example` prefix conventions and `__PLACEHOLDER__` tokens consistent with Story 4.1's replacement engine. [Source: architecture.md#Key Structural Decisions]

3. **(CRITICAL) MockShellProvider is the ONLY shell context provider.** The dev-host must NOT hand-roll auth, tenant, or theme providers. It must use `MockShellProvider` from `@hexalith/shell-api` which wraps all context providers with correct nesting order: AuthContext → TenantContext → ConnectionHealthContext → FormDirtyContext → ThemeContext → LocaleContext. [Source: architecture.md#Test fixtures are public API]

4. **(CRITICAL) MockQueryBus response keys must match useQuery's internal request format.** The key format is `"${tenant}:${domain}:${queryType}:${aggregateId}:${entityId}"` where missing values are empty strings. The `tenant` value comes from `useTenant()` context which defaults to `"test-tenant"` in MockShellProvider. If keys don't match, all queries will return no data. **Verify the key format in Task 1 before writing mock setup in Task 3.** [Source: packages/cqrs-client/src/mocks/MockQueryBus.ts]

5. **Module boundary enforcement.** Dev-host code may only import from: `react`, `react-dom`, `react-router-dom`, `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`, and the module's own `../src` code. Blocked: `@radix-ui/*`, `oidc-client-ts`, `ky`, `@tanstack/*`. [Source: architecture.md#Package Dependency Rules]

6. **ESM-only, TypeScript strict mode.** All dev-host code must be valid ESM. No CommonJS. TypeScript `strict: true`. No `any` types. [Source: root tsconfig]

7. **No barrel exports in sub-folders.** Import directly from specific files, not from sub-folder index.ts. [Source: architecture.md#Barrel Export Clarification]

8. **CSS Modules + design tokens exclusively for any custom styles.** If the dev-host needs custom CSS, use design token custom properties only. [Source: architecture.md#CSS Architecture]

### Existing Codebase Context — MUST Reference

**MockShellProvider props (from `packages/shell-api/src/testing/MockShellProvider.tsx`):**

```typescript
interface MockShellProviderProps {
  authContext?: AuthContextValue; // defaults via createMockAuthContext()
  tenantContext?: TenantContextValue; // defaults via createMockTenantContext()
  connectionHealthContext?: ConnectionHealthContextValue;
  formDirtyContext?: FormDirtyContextValue;
  theme?: Theme; // "light" | "dark", defaults to "light"
  locale?: string; // defaults to "en-US"
  defaultCurrency?: string;
  children: ReactNode;
}
```

**Default mock values (when no overrides provided):**

- Auth: `{ isAuthenticated: true, user: { sub: "test-user", name: "Test User", email: "test@test.com", tenantClaims: ["test-tenant"] } }`
- Tenant: `{ activeTenant: "test-tenant", availableTenants: ["test-tenant"] }`
- ConnectionHealth: `{ health: "connected" }`
- FormDirty: `{ isDirty: false }`

**CqrsProvider props — CURRENT (from `packages/cqrs-client/src/CqrsProvider.tsx`):**

```typescript
// CURRENT — before Task 0 changes
interface CqrsProviderProps {
  commandApiBaseUrl: string;
  tokenGetter: () => Promise<string | null>;
  children: ReactNode;
  signalRHub?: ISignalRHub; // Optional mock injection (exists)
}
```

**CqrsProvider props — AFTER Task 0:**

```typescript
// AFTER Task 0 — with mock bus injection
interface CqrsProviderProps {
  commandApiBaseUrl: string;
  tokenGetter: () => Promise<string | null>;
  children: ReactNode;
  signalRHub?: ISignalRHub; // Optional mock injection (exists)
  queryBus?: IQueryBus; // NEW — when provided, useQuery delegates here instead of FetchClient
  commandBus?: ICommandBus; // NEW — when provided, useCommandPipeline delegates here instead of FetchClient
}
```

**CqrsProvider internal architecture (critical for Task 0):**

```
CqrsProvider creates internally:
  - FetchClient (from commandApiBaseUrl + tokenGetter) → used by useQuery via useQueryClient()
  - CommandEventBus → used by useCommandPipeline via useCqrs()
  - PreflightCache

CqrsProvider nests internally:
  ConnectionStateProvider
    └─ SignalRProvider (accepts signalRHub prop for mocking)
        └─ QueryProvider (receives FetchClient)
```

When `queryBus` prop is provided, the QueryProvider should receive a mock-aware FetchClient adapter that delegates `get()` calls to `queryBus.query()` instead of making HTTP requests. When `commandBus` prop is provided, the CqrsContext should expose a mock-aware command submission path that delegates to `commandBus.send()`.

**MockQueryBus API:**

```typescript
// Constructor
new MockQueryBus({ delay?: number }) // default: 30ms

// Set responses (key = "tenant:domain:queryType:aggregateId:entityId")
mockQueryBus.setResponse(key: string, data: unknown): void
mockQueryBus.setError(key: string, error: Error): void
```

**MockCommandBus API:**

```typescript
// Constructor
new MockCommandBus({ delay?: number, defaultBehavior?: "success" | "reject" | "timeout" | "publishFail" })

// Configure specific behaviors
mockCommandBus.configureNextSend(behavior: MockSendBehavior): void
```

**MockSignalRHub — just instantiate, defaults to "connected" state:**

```typescript
const mockHub = new MockSignalRHub(); // Ready to use
```

**Module entry point exports (from `templates/module/src/index.ts`):**

```typescript
export { ExampleRootPage as default }; // Root route component with React Router
export { manifest };
export { routes };
export type { ExampleItem, ExampleDetail, CreateExampleInput };
export { ExampleItemSchema, ExampleDetailSchema, CreateExampleCommandSchema };
```

**ExampleRootPage** is the module's root component — it renders `<Routes>` internally with the three page routes (/, /:id, /create). The dev-host should render it at `path="/*"` so React Router resolves the sub-routes correctly.

**Sample data exports (from `templates/module/src/data/sampleData.ts`):**

```typescript
export const EXAMPLE_LIST_QUERY = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleList",
} as const;
export const EXAMPLE_DETAIL_QUERY = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleDetail",
} as const;
export const exampleItems: ExampleItem[]; // 12 realistic items
export const exampleDetails: ExampleDetail[]; // 12 matching detail records
```

**useQuery internal flow (critical for mock key matching):**

1. `useQuery(schema, { domain, queryType, aggregateId?, entityId? })` is called by pages
2. Internally constructs `SubmitQueryRequest` with `tenant` from `useTenant().activeTenant`
3. Passes request to FetchClient (or mock adapter after Task 0)
4. MockQueryBus looks up response by key: `"${tenant}:${domain}:${queryType}:${aggregateId ?? ""}:${entityId ?? ""}"`

**For list queries (ExampleList):** aggregateId and entityId are undefined → key = `"test-tenant:__MODULE_NAME__:ExampleList::"`
**For detail queries (ExampleDetail):** aggregateId is the item ID → key = `"test-tenant:__MODULE_NAME__:ExampleDetail:<id>:"`

**Current dev-host skeleton files (from Story 4.1):**

- `dev-host/index.html` — ready, has `__MODULE_DISPLAY_NAME__` in title
- `dev-host/main.tsx` — placeholder comment only, needs full implementation
- `dev-host/vite.config.ts` — minimal, needs React plugin and resolve config

**Current `pnpm dev` script (from `templates/module/package.json`):**
Verify the `dev` script runs Vite with the dev-host config. It should be something like: `"dev": "vite --config dev-host/vite.config.ts"` or `"dev": "vite dev --config dev-host/vite.config.ts"`. The script was created in Story 4.1.

### Design Token Import Strategy

The dev-host must import design tokens so `@hexalith/ui` components render with the correct visual identity. Check `packages/ui/package.json` for the exports map to find the correct import path for tokens.

Likely patterns:

- `import '@hexalith/ui/tokens.css'` (if exported as CSS entry)
- `import '@hexalith/ui/src/tokens/index.css'` (if using source imports)

The tokens file imports: colors.css, spacing.css, typography.css, and additional token files. The dev-host CSS file should import this single entry point.

**Key token custom properties available for dev-host CSS:**

- `--font-family-sans` — Inter + system fallbacks
- `--color-surface-primary` — page background
- `--color-text-primary` — main text color
- `--color-accent` — indigo accent

### Provider Nesting Order (Critical)

The dev-host must nest providers in this order to match the real shell:

```
StrictMode
  └─ MockShellProvider (auth + tenant + connectionHealth + formDirty + theme + locale)
      └─ CqrsProvider (commandApiBaseUrl, tokenGetter, signalRHub, queryBus, commandBus)
          └─ ToastProvider (from @hexalith/ui — needed for toast notifications in pages)
              └─ BrowserRouter
                  └─ Routes
                      └─ Route path="/*" element={<ExampleRootPage />}
```

**Why this order matters:**

- MockShellProvider must be outermost because CqrsProvider needs `useTenant()` context
- CqrsProvider must wrap the router because page components use `useQuery` and `useCommandPipeline`
- ToastProvider must wrap the router because ExampleCreatePage uses `useToast()`
- BrowserRouter wraps the module routes

### Critical Anti-Patterns to Prevent

1. **Do NOT hand-roll auth/tenant/theme providers.** Use `MockShellProvider` — it's the single source of truth.
2. **Do NOT use real HTTP for CQRS in dev mode.** All data comes from MockQueryBus/MockCommandBus via the new CqrsProvider props.
3. **Do NOT import design tokens with wrong path.** Verify the `@hexalith/ui` exports map first.
4. **Do NOT use `any` type for mock data.** Use the Zod schema types from `exampleSchemas.ts`.
5. **Do NOT hardcode sample data in the dev-host.** Import from `../src/data/sampleData.ts` — single source of truth.
6. **Do NOT forget to set detail responses per-item.** Each item ID needs its own response key in MockQueryBus.
7. **Do NOT use `enum`.** Use union types.
8. **Do NOT use inline styles.** CSS Modules or design tokens only.
9. **Do NOT skip Task 0.** Without mock bus injection in CqrsProvider, the dev-host will make real HTTP calls that fail. Task 0 is a hard prerequisite.
10. **Do NOT try to bypass CqrsProvider** by composing individual sub-providers (QueryProvider, ConnectionStateProvider) — they are internal APIs not exported from `@hexalith/cqrs-client`.
11. **MockQueryBus key format is an internal implementation detail, not a public API.** If mock data doesn't load after a cqrs-client update, the key format may have changed — check `MockQueryBus.ts` for the current construction logic.

### Previous Story Intelligence (Stories 4.1 and 4.2)

**Story 4.1 (done) established:**

- CLI scaffold engine in `tools/create-hexalith-module/`
- Template files in `tools/create-hexalith-module/templates/module/`
- `tsconfig.templates.json` for template type-checking
- `dev-host/` skeleton: index.html, placeholder main.tsx, basic vite.config.ts
- Two-tier string replacement: `__PLACEHOLDER__` tokens + `Example` prefix regex
- `pnpm create-module <name>` workspace script

**Story 4.2 (in-progress/review, files exist) established:**

- `src/schemas/exampleSchemas.ts` — Zod schemas for list, detail, command
- `src/pages/ExampleListPage.tsx` — useQuery + Table + loading/error/empty states
- `src/pages/ExampleDetailPage.tsx` — useQuery + DetailView
- `src/pages/ExampleCreatePage.tsx` — useCommandPipeline + Form
- `src/pages/ExampleListPage.module.css` — status badge styles
- `src/data/sampleData.ts` — 12 realistic items + query constants
- `src/routes.tsx` — lazy-loaded routes with code splitting
- `src/index.ts` — module entry point with all exports

**Key learnings from 4.1:**

- `tsconfig.templates.json` needs `paths` to resolve `@hexalith/*` from workspace sources
- Template files must compile as-is in the monorepo (Example prefix is valid TypeScript)
- Integration test verifies scaffold output compiles via `tsc --noEmit`

### Commit Strategy

**Task 0 (CqrsProvider changes) should be committed separately from the template changes (Tasks 2-7).** This allows independent revert if the foundation package change causes issues. Task 0 modifies `packages/cqrs-client/` which is a shared foundation package — isolating it in its own commit limits blast radius and makes git bisect easier if regressions appear.

### Git Intelligence — Recent Commits

Last commit (`4bd8683`) was Story 4.1 implementation — CLI scaffold with 37 passing tests. Epic 3 (component library) is fully complete. All `@hexalith/ui` components are available and tested. `@hexalith/cqrs-client` hooks (useQuery, useCommandPipeline) are implemented with mock support.

### Project Structure Notes

**Task 0 modifies `packages/cqrs-client/`** (foundation package change):

- Modified: `packages/cqrs-client/src/CqrsProvider.tsx` (add queryBus/commandBus props)
- New: `packages/cqrs-client/src/CqrsProvider.test.tsx` (tests for mock injection — or extend existing tests)
- Possibly modified: `packages/cqrs-client/src/queries/QueryProvider.tsx` (if adapter wiring lives here)

**Tasks 2-6 modify `tools/create-hexalith-module/templates/module/dev-host/`:**

- New file: `dev-host/mockSetup.ts` (mock bus configuration)
- New file: `dev-host/dev-host.css` (minimal reset + token imports)
- Modified: `dev-host/main.tsx` (full implementation replacing placeholder)
- Modified: `dev-host/vite.config.ts` (React plugin + resolve config)

**Tasks 2/7 modify other template files:**

- Modified: `templates/module/package.json` (add @vitejs/plugin-react devDep)
- Modified: `tsconfig.templates.json` (include dev-host files in type-check)

The `templates/module/` directory is the scaffold blueprint — files here are copied verbatim (with placeholder replacement) to the generated module.

### References

- [Source: epics.md#Story 4.3] — Full acceptance criteria and FRs
- [Source: architecture.md#Key Structural Decisions] — dev-host is minimal Vite app with MockShellProvider
- [Source: architecture.md#Module Internal Organization] — dev-host directory structure
- [Source: architecture.md#Test fixtures are public API] — MockShellProvider, MockCommandBus, MockQueryBus are public exports
- [Source: architecture.md lines 1517-1523] — dev-host standalone path, MockShellProvider cascade, Phase 1.5 validation gate
- [Source: prd.md#Local Development Model] — Developer workflow: clone module → run dev host → develop with hot-reload, mock auth, mock CQRS
- [Source: prd.md#Developer Platform Specific Requirements] — Shell dev host uses same module discovery mechanism with mock providers
- [Source: packages/shell-api/src/testing/MockShellProvider.tsx] — MockShellProvider props and context nesting
- [Source: packages/cqrs-client/src/CqrsProvider.tsx] — CqrsProvider props, internal provider nesting, FetchClient creation
- [Source: packages/cqrs-client/src/queries/QueryProvider.tsx] — QueryProvider context, FetchClient usage
- [Source: packages/cqrs-client/src/mocks/MockQueryBus.ts] — Response key format, setResponse API
- [Source: packages/cqrs-client/src/mocks/MockCommandBus.ts] — Command bus mock config
- [Source: packages/cqrs-client/src/mocks/MockSignalRHub.ts] — SignalR hub mock
- [Source: packages/cqrs-client/src/queries/useQuery.ts] — How useQuery constructs SubmitQueryRequest via FetchClient
- [Source: packages/cqrs-client/src/commands/useCommandPipeline.ts] — How useCommandPipeline sends via FetchClient
- [Source: packages/ui/src/tokens/] — Design token CSS files (colors, spacing, typography)
- [Source: Story 4.1 — 4-1-create-hexalith-module-cli.md] — CLI scaffold engine, template structure
- [Source: Story 4.2 — 4-2-scaffold-example-code-premium-showcase.md] — Page components, schemas, sample data

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Pre-existing integration test failure confirmed (file renaming + react-router/zod paths missing from Story 4.2) — fixed as part of this story
- Task 8.1 (Vite build smoke test) skipped: template directory has no node_modules; validation covered by typecheck:templates (7.2) and scaffold integration test (8.2)

### Completion Notes List

- **Task 0:** Added `queryBus` and `commandBus` optional props to CqrsProvider. Created `createMockAwareFetchClient()` adapter that implements FetchClient interface, delegating `postForQuery()` to `IQueryBus.query()` via `z.unknown()` passthrough schema, `post()` to `ICommandBus.send()`, and `get()` to mock "Completed" status for command polling. 4 new tests added (query delegation, command delegation, status polling, regression). All 330 cqrs-client tests pass.
- **Task 1:** Verified MockQueryBus key format: `"${tenant}:${domain}:${queryType}:${aggregateId}:${entityId}"`. Mock adapter passes body directly as SubmitQueryRequest — key construction is consistent.
- **Task 2:** Updated vite.config.ts with `@vitejs/plugin-react` for JSX + HMR, server config (port 5173, open: true), and conditional `resolve.alias` entries that point at workspace package sources when available while falling back to package resolution in standalone contexts. Added `@vitejs/plugin-react: ^4.0.0` to template package.json devDeps.
- **Task 3:** Created `mockSetup.ts` with MockQueryBus (delay: 300), MockCommandBus (delay: 500, success), MockSignalRHub. Configured list query key + 12 detail query keys matching sample data.
- **Task 4:** Implemented `main.tsx` with correct provider nesting: StrictMode → MockShellProvider → CqrsProvider (with mock buses) → ToastProvider → BrowserRouter → Routes (using `routes` array from module, not ExampleRootPage). Uses `react-router` v7.
- **Task 5:** Added `packages/ui/src/tokens/index.css` plus a `@hexalith/ui/tokens.css` export, then updated `dev-host.css` to import the single supported token entry point and added the requested dark-mode support block.
- **Task 6:** Added `<noscript>` fallback to index.html. Script path and title placeholder confirmed correct.
- **Task 7:** Expanded `tsconfig.templates.json` to include `templates/module/dev-host/**/*.ts` and `templates/module/dev-host/**/*.tsx`, updated `vite.config.ts` to avoid `__dirname`, and re-ran template type-checking successfully.
- **Task 8:** Fixed pre-existing scaffold bugs: (a) scaffold.ts now renames files with Example→PascalCase, (b) integration test file comparison accounts for renaming, (c) added react-router + zod to integration test tsconfig paths. All 37 create-hexalith-module tests pass.
- **Task 9 (automated):** Grep scan confirms no forbidden imports (@radix-ui, oidc-client-ts, ky, @tanstack). Type-check passes.
- **Task 9 (manual, browser automation):** Scaffolded `demo-tasks` module with rebuilt tool. Fixed vite.config.ts alias ordering: switched from object to array syntax so `@hexalith/ui/tokens.css` is matched before `@hexalith/ui` (Vite prefix-match collision). After fix: dev server starts (port 5174), list page renders all 12 items with pagination, detail page shows correct per-item data, create form submits via MockCommandBus with toast "Item created", HMR updates title text without full page reload. All 37 scaffold tests + 330 cqrs-client tests pass.

### Change Log

- 2026-03-21: Story 4.3 implementation — dev-host for independent module development
- 2026-03-21: Senior Developer Review (AI) — changes requested; story moved back to in-progress
- 2026-03-21: Senior Developer Review (AI) follow-up — changes still required after re-validation
- 2026-03-21: Post-review fix pass — token entrypoint, Vite aliasing, dark-mode CSS, and dev-host type-check coverage aligned with story requirements
- 2026-03-21: Final code review (AI) — approved; all 9 prior findings resolved, no new issues; story marked done
- 2026-03-21: Task 9 manual verification — scaffolded module, ran dev server, verified all 6 manual items via browser automation. Fixed vite.config.ts alias ordering bug (prefix-match collision between `@hexalith/ui` and `@hexalith/ui/tokens.css`)

### File List

**Modified (packages/cqrs-client — Task 0):**

- packages/cqrs-client/src/CqrsProvider.tsx — added queryBus/commandBus props + mock adapter
- packages/cqrs-client/src/CqrsProvider.test.tsx — added 4 tests for mock bus injection

**New (templates/module/dev-host — Tasks 2-6):**

- tools/create-hexalith-module/templates/module/dev-host/mockSetup.ts — mock bus configuration
- tools/create-hexalith-module/templates/module/dev-host/dev-host.css — design token imports + reset
- tools/create-hexalith-module/templates/module/dev-host/main.tsx — full dev-host entry point
- tools/create-hexalith-module/templates/module/dev-host/vite.config.ts — React plugin + HMR config
- tools/create-hexalith-module/templates/module/dev-host/index.html — added noscript fallback

**Modified (templates — Tasks 2, 7):**

- tools/create-hexalith-module/templates/module/package.json — added @vitejs/plugin-react devDep
- tools/create-hexalith-module/tsconfig.templates.json — include all dev-host TS/TSX files in type-check

**Modified (UI tokens — Task 5):**

- packages/ui/package.json — added `@hexalith/ui/tokens.css` export
- packages/ui/src/tokens/index.css — single token CSS entry point for consumers

**Modified (scaffold — Task 8, pre-existing fix):**

- tools/create-hexalith-module/src/scaffold.ts — file renaming for Example→PascalCase
- tools/create-hexalith-module/src/integration.test.ts — file comparison fix + react-router/zod paths + dev-host template type-check coverage

**Modified (story tracking):**

- \_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md — review follow-up plus post-review fix record and status review
- \_bmad-output/implementation-artifacts/sprint-status.yaml — 4-3 status: in-progress → review

**Related working-tree context:**

- \_bmad-output/implementation-artifacts/4-4-scaffolded-tests-and-test-fixtures.md — existing parallel story file present in the same working tree during review/fix pass

## Senior Developer Review (AI)

### Reviewer

- Jerome — 2026-03-21

### Outcome

- Changes requested

### What I validated

- `packages/cqrs-client/src/CqrsProvider.test.tsx` passes locally.
- `tools/create-hexalith-module/src/integration.test.ts` passes locally.
- `pnpm --filter @hexalith/create-hexalith-module typecheck:templates` completes successfully.

### Findings

1. **[CRITICAL] Task 7.1 is marked complete, but the template type-check scope does not include all `dev-host` TypeScript files.**
   The story explicitly says `tools/create-hexalith-module/tsconfig.templates.json` should include `templates/module/dev-host/**/*.ts` and `templates/module/dev-host/**/*.tsx`, but the file only includes `templates/module/dev-host/mockSetup.ts` and `templates/module/dev-host/main.tsx`. That leaves `dev-host/vite.config.ts` and any future `dev-host` TS/TSX files outside the template type-check safety net while Task 7.1 is still marked `[x]`.

- Story requirement: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:113`
- Implementation: `tools/create-hexalith-module/tsconfig.templates.json:16-19`

1. **[HIGH] Task 2.1 over-claims completion: `vite.config.ts` never adds the requested `resolve.alias` block.**
   The story marks Task 2.1 complete and explicitly requires `resolve.alias` so `@hexalith/*` imports resolve in both workspace and standalone contexts. The current `vite.config.ts` only sets `root`, `plugins`, `build.target`, and `server`; there is no `resolve` section at all.

- Story requirement: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:59`
- Implementation: `tools/create-hexalith-module/templates/module/dev-host/vite.config.ts:5-10`

1. **[MEDIUM] Task 5.1 is marked complete, but `dev-host.css` never implements the requested dark-mode support block.**
   The story says the stylesheet should include `@media (prefers-color-scheme: dark)` with a `[data-theme="dark"]` selector. The current file imports token CSS and sets base `body` / `#root` styles, but contains no dark-mode selector or media block.

- Story requirement: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:106`
- Implementation: `tools/create-hexalith-module/templates/module/dev-host/dev-host.css`

1. **[MEDIUM] The story's File List is incomplete relative to the working tree.**
   Git shows `_bmad-output/implementation-artifacts/4-4-scaffolded-tests-and-test-fixtures.md` was added/modified in the same change set, but Story 4.3's File List does not mention it. That breaks the workflow's required traceability between claimed changes and actual changed files.

- Story file list section: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:457`
- Git working tree discrepancy: `_bmad-output/implementation-artifacts/4-4-scaffolded-tests-and-test-fixtures.md`

### Follow-up Review

#### Reviewer (current pass)

- Jerome — 2026-03-21 (current pass)

#### Outcome (current pass)

- Changes requested

#### What I re-validated

- `pnpm --filter @hexalith/create-hexalith-module typecheck:templates` still completes successfully for the files currently included in `tsconfig.templates.json`.
- The checked tasks were compared against the current implementation files and the current working tree.

#### Findings (current pass)

1. **[CRITICAL] Task 5.2 is still marked complete even though `@hexalith/ui` does not export a single token CSS entry point.**
   The story explicitly says to add a token CSS entry point to `packages/ui/package.json` exports if one does not already exist. The package currently exports only the wildcard path `"./tokens/*.css"`, and `dev-host.css` works around that by importing nine individual token files instead of a single supported token entry. That means the required prerequisite work was never actually completed, while the checkbox is marked `[x]`.

- Story requirement: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:107`
- Implementation: `packages/ui/package.json:12`
- Workaround in template: `tools/create-hexalith-module/templates/module/dev-host/dev-host.css:1-9`

1. **[CRITICAL] Task 7.1 remains over-claimed: the template type-check scope still excludes `dev-host/vite.config.ts` and any future dev-host TS/TSX files.**
   The story requires `templates/module/dev-host/**/*.ts` and `templates/module/dev-host/**/*.tsx` to be in scope. The current `tsconfig.templates.json` still hardcodes only `mockSetup.ts` and `main.tsx`, so the dev-host is not fully covered by template type-checking even though the task is marked complete.

- Story requirement: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:113`
- Implementation: `tools/create-hexalith-module/tsconfig.templates.json:16-19`

1. **[HIGH] Task 2.1 is still incomplete because `vite.config.ts` has no `resolve.alias` section.**
   The file adds the React plugin and server settings, but never implements the required alias configuration for `@hexalith/*` resolution in workspace and standalone scenarios. The checkbox remains inaccurate.

- Story requirement: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:59`
- Implementation: `tools/create-hexalith-module/templates/module/dev-host/vite.config.ts:1-13`

1. **[MEDIUM] Task 5.1 is still incomplete because `dev-host.css` lacks the requested dark-mode media block and `[data-theme="dark"]` handling.**
   The stylesheet sets base body and root styles, but it never adds the explicit dark-mode support called out in the story task.

- Story requirement: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:106`
- Implementation: `tools/create-hexalith-module/templates/module/dev-host/dev-host.css:1-17`

1. **[MEDIUM] The story's File List is still incomplete relative to the working tree.**
   `_bmad-output/implementation-artifacts/4-4-scaffolded-tests-and-test-fixtures.md` is present in the current change set but is still omitted from Story 4.3's File List, so the documentation of actual changes remains incomplete.

- Story file list section: `_bmad-output/implementation-artifacts/4-3-dev-host-for-independent-module-development.md:481`
- Git working tree discrepancy: `_bmad-output/implementation-artifacts/4-4-scaffolded-tests-and-test-fixtures.md`

### Final Review

#### Reviewer

- Jerome — 2026-03-21

#### Outcome

- Approved

#### What I validated

- All 9 prior findings (2 CRITICAL, 2 HIGH, 5 MEDIUM) re-checked against current implementation.
- `packages/ui/package.json:12` now exports `"./tokens.css": "./src/tokens/index.css"` — token entry point exists.
- `tsconfig.templates.json:24-25` now uses `dev-host/**/*.ts` and `dev-host/**/*.tsx` globs — full coverage.
- `vite.config.ts:15-44` has `resolve.alias` with workspace package resolution and `existsSync` fallback.
- `dev-host.css:14-21` has `@media (prefers-color-scheme: dark)` with `[data-theme="dark"]` selectors.
- File List includes "Related working-tree context" documenting the 4-4 story file.
- Mock adapter data flow verified end-to-end: `useQuery` → `postForQuery` → `queryBus.query()` → `MockQueryBus` key lookup → response wrapped as `QueryResponse<SubmitQueryResponse>` → `useQuery` unwraps `response.data.payload` → Zod schema validation.
- All AC implementations verified against code. AC1-AC3 fully automated. AC4 automated support in place (React Fast Refresh via `@vitejs/plugin-react`), manual verification pending Task 9.
- No security vulnerabilities, no forbidden imports, no `any` types, no inline styles.

#### Findings

No new issues found. All prior findings resolved.
