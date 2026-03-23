# Story 6.3: Tenants Reference Module — CQRS Integration

Status: ready-for-dev

## Story

As a shell team developer,
I want a complete Tenants module that validates the CQRS integration end-to-end,
So that we prove `useCommandPipeline` and `useQuery` work with real domain types against the actual backend API patterns.

## Acceptance Criteria

1. **AC1 — Domain Types & Zod Schemas**
   - **Given** the Tenants module exists in `modules/hexalith-tenants/`
   - **When** a developer inspects the module's domain types
   - **Then** Zod schemas define `TenantItemSchema` (list view) and `TenantDetailSchema` (detail view) with fields: id, name, code, status (Active|Inactive|Disabled), createdAt, updatedAt
   - **And** types are inferred from schemas via `z.infer<>` — no manual type duplication
   - **And** command schemas define `CreateTenantCommandSchema`, `UpdateTenantCommandSchema`, `DisableTenantCommandSchema`
   - **And** all schemas follow existing naming conventions: `PascalCase` + `Schema` suffix

2. **AC2 — Projection Query via useQuery**
   - **Given** the Tenants module uses `useQuery` from `@hexalith/cqrs-client`
   - **When** `TenantListPage` renders
   - **Then** `useQuery(TenantListSchema, { domain: 'Tenants', queryType: 'GetTenantList' })` fetches data
   - **And** loading state shows `<Skeleton variant="table" rows={8} />`
   - **And** error state shows `<ErrorDisplay error={error} onRetry={refetch} />`
   - **And** empty state shows `<EmptyState>` with "No tenants yet" message and Create action

3. **AC3 — Command Pipeline via useCommandPipeline**
   - **Given** the Tenants module uses `useCommandPipeline` from `@hexalith/cqrs-client`
   - **When** a user creates a new tenant via the form
   - **Then** `useCommandPipeline().send(createTenantCommand)` submits to the backend
   - **And** the pipeline status flow is visible: idle → sending → polling → completed|rejected
   - **And** on success, the toast confirms and the user navigates back to the list
   - **And** on rejection, a `CommandRejectedError` is displayed inline

4. **AC4 — Mock Implementations for Testing**
   - **Given** the Tenants module runs with mock implementations
   - **When** using `MockCommandBus` and `MockQueryBus` from `@hexalith/cqrs-client`
   - **Then** `renderWithProviders()` wraps MockShellProvider + CqrsProvider with mock buses
   - **And** mock data provides realistic tenant records
   - **And** all page components have co-located `.test.tsx` files with ≥80% coverage

## Tasks / Subtasks

- [ ] **Task 1: Create Tenants module directory and package structure** (AC: #1, #4)
  - [ ] 1.1 Create `modules/hexalith-tenants/` directory with standard module structure (mirroring the scaffold template at `tools/create-hexalith-module/templates/module/`)
  - [ ] 1.2 Create `modules/hexalith-tenants/package.json` with:
    - `"name": "@hexalith/tenants"`
    - `"private": true`
    - `"version": "0.1.0"`
    - `"type": "module"`
    - `"main": "./src/index.ts"`
    - peerDependencies: `@hexalith/shell-api ^0.1.0`, `@hexalith/cqrs-client ^0.2.0`, `@hexalith/ui ^0.1.0`, `react ^19.0.0`, `react-dom ^19.0.0`, `react-router ^7.6.0`, `zod ^3.0.0`
    - devDependencies: `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`, `@testing-library/react`, `@testing-library/jest-dom`, `vitest`, `jsdom`, `react`, `react-dom`, `react-router`, `zod`, `typescript`
    - scripts: `build`, `dev`, `lint`, `test`, `test:watch`
  - [ ] 1.3 Create `modules/hexalith-tenants/tsconfig.json` extending from `@hexalith/tsconfig/base.json` (with `jsx: react-jsx` configured inline, matching the scaffold template)
  - [ ] 1.4 Create `modules/hexalith-tenants/tsup.config.ts` with entry `['src/index.ts']`, ESM format, `.d.ts` generation
  - [ ] 1.5 Create `modules/hexalith-tenants/vitest.config.ts` with jsdom environment, coverage thresholds at 80%
  - [ ] 1.6 Create `modules/hexalith-tenants/eslint.config.js` extending `@hexalith/eslint-config`
  - [ ] 1.7 **Checkpoint:** Run `pnpm install` from workspace root — verify pnpm resolves the module's peerDependencies to local workspace packages. Run `pnpm turbo build --filter=@hexalith/tenants` — verify clean compilation. Fix any issues before proceeding.

- [ ] **Task 2: Create Zod schemas and domain types** (AC: #1)
  - [ ] 2.1 Create `modules/hexalith-tenants/src/schemas/tenantSchemas.ts`:
    - `TenantItemSchema` — `z.object({ id: z.string().uuid(), name: z.string().min(1).max(200), code: z.string().regex(/^[a-z0-9-]+$/), status: z.enum(['Active', 'Inactive', 'Disabled']), createdAt: z.string().datetime(), updatedAt: z.string().datetime() })`
    - `TenantListSchema` — `z.array(TenantItemSchema)` (response wrapper for the list query)
    - `TenantDetailSchema` — extends TenantItemSchema with `.extend({ description: z.string().optional(), contactEmail: z.string().email().optional(), createdBy: z.string(), notes: z.string().max(2000).optional() })`
    - Export inferred types: `type TenantItem = z.infer<typeof TenantItemSchema>`, etc.
  - [ ] 2.2 Create command input schemas in the same file:
    - `CreateTenantCommandSchema` — `z.object({ name: z.string().min(1, 'Tenant name is required').max(200), code: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase alphanumeric and hyphens only').min(1).max(50), description: z.string().max(500).optional(), contactEmail: z.string().email('Invalid email').optional() })`
    - `UpdateTenantCommandSchema` — `z.object({ name: z.string().min(1).max(200), description: z.string().max(500).optional(), contactEmail: z.string().email().optional() })` *(forward-compatibility for story 6-4 — not wired to UI in this story)*
    - `DisableTenantCommandSchema` — `z.object({ reason: z.string().min(1, 'Reason is required').max(500) })` *(forward-compatibility for story 6-4 — not wired to UI in this story)*
  - [ ] 2.3 Export all schemas and inferred types from the schemas file

- [ ] **Task 3: Create sample data and query parameters** (AC: #4)
  - [ ] 3.1 Create `modules/hexalith-tenants/src/data/sampleData.ts`:
    - `TENANT_LIST_QUERY` — `{ domain: 'Tenants', queryType: 'GetTenantList' }` (QueryParams shape)
    - `buildTenantDetailQuery(id: string)` — returns `{ domain: 'Tenants', queryType: 'GetTenantDetail', aggregateId: id }`
    - `sampleTenants` — array of 8-10 realistic `TenantItem` records with professional names (e.g., "Acme Corporation", "TechVentures Inc.", "GlobalTrade Solutions") and mixed statuses
    - `sampleTenantDetails` — mapped from sampleTenants with added description, contactEmail, createdBy, notes
    - All sample data must pass Zod schema validation — use `Schema.parse()` to verify at module level

- [ ] **Task 4: Create test utility (renderWithProviders)** (AC: #4)
  - [ ] 4.1 Create `modules/hexalith-tenants/src/testing/renderWithProviders.tsx`:
    - Follow the exact pattern from `tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx`
    - Provider stack: `MockShellProvider` → `CqrsProvider` (with mock buses AND `MockSignalRHub`) → `ToastProvider` → `MemoryRouter`
    - **CRITICAL:** Must pass `signalRHub={new MockSignalRHub()}` to `CqrsProvider` — omitting it causes connection state hooks to fail
    - Pre-configure `MockQueryBus` with sample tenant list and detail data
    - Return `{ ...renderResult, queryBus: MockQueryBus, commandBus: MockCommandBus }`
    - Provider wiring example:
      ```typescript
      const mockSignalRHub = new MockSignalRHub();
      <MockShellProvider>
        <CqrsProvider
          commandApiBaseUrl="http://localhost:mock"
          tokenGetter={async () => "dev-token"}
          signalRHub={mockSignalRHub}
          queryBus={queryBus}
          commandBus={commandBus}
        >
          <ToastProvider>
            <MemoryRouter initialEntries={[initialRoute]}>
              {children}
            </MemoryRouter>
          </ToastProvider>
        </CqrsProvider>
      </MockShellProvider>
      ```

- [ ] **Task 5: Create TenantListPage** (AC: #2)
  - [ ] 5.1 Create `modules/hexalith-tenants/src/pages/TenantListPage.tsx`:
    - Use `useQuery(TenantListSchema, TENANT_LIST_QUERY)` for data fetching
    - Render `<PageLayout>` with title "Tenants"
    - Render `<Table>` with columns: name, code, status (custom cell renderer — no Badge component exists), createdAt (formatted)
    - Column definition uses `TableColumn<TenantItem>[]`:
      ```typescript
      const columns: TableColumn<TenantItem>[] = [
        { id: 'name', header: 'Name', accessorKey: 'name' },
        { id: 'code', header: 'Code', accessorKey: 'code' },
        { id: 'status', header: 'Status', accessorKey: 'status',
          cell: ({ value }) => <span className={styles[`status${value}`]}>{value as string}</span> },
        { id: 'createdAt', header: 'Created', accessorKey: 'createdAt',
          cell: ({ value }) => new Intl.DateTimeFormat().format(new Date(value as string)) },
      ];
      ```
    - Table features: sorting, pagination (pageSize: 10), global search
    - Row click navigates to detail using relative path: `onRowClick={(row) => navigate(\`detail/${row.id}\`)}`
    - Loading: `<Skeleton variant="table" rows={8} />`
    - Error: `<ErrorDisplay error={error} onRetry={refetch} />`
    - Empty: `<EmptyState title="No tenants yet" description="Create your first tenant to get started." action={{ label: "Create Tenant", onClick: () => navigate('create') }} />`
    - "Create Tenant" button in `PageLayout` actions slot
    - **CRITICAL: All navigation must use relative paths** — `navigate('create')`, `navigate(\`detail/${id}\`)`, `navigate('..')` — never absolute `/` paths (module routes are prefixed by shell)
  - [ ] 5.2 Create `modules/hexalith-tenants/src/pages/TenantListPage.module.css` for any page-specific styles
  - [ ] 5.3 Create `modules/hexalith-tenants/src/pages/TenantListPage.test.tsx`:
    - Test loading state renders Skeleton
    - Test data renders table with correct columns
    - Test empty state renders EmptyState component
    - Test error state renders ErrorDisplay
    - Test row click triggers navigation
    - Test "Create Tenant" button navigates to /create
    - Use `renderWithProviders()` for all tests

- [ ] **Task 6: Create TenantDetailPage** (AC: #2)
  - [ ] 6.1 Create `modules/hexalith-tenants/src/pages/TenantDetailPage.tsx`:
    - Use `useParams<{ id: string }>()` to extract tenant ID
    - Use `useQuery(TenantDetailSchema, buildTenantDetailQuery(id), { enabled: !!id })` for data
    - Render `<DetailView>` with `DetailSection[]`:
      ```typescript
      const sections: DetailSection[] = [
        { title: 'General Information', fields: [
          { label: 'Name', value: data.name },
          { label: 'Code', value: data.code },
          { label: 'Status', value: <span className={styles[`status${data.status}`]}>{data.status}</span> },
          { label: 'Description', value: data.description ?? '—', span: 2 },
          { label: 'Contact Email', value: data.contactEmail ?? '—' },
        ]},
        { title: 'Audit Trail', fields: [
          { label: 'Created By', value: data.createdBy },
          { label: 'Created At', value: new Intl.DateTimeFormat().format(new Date(data.createdAt)) },
          { label: 'Updated At', value: new Intl.DateTimeFormat().format(new Date(data.updatedAt)) },
          { label: 'Notes', value: data.notes ?? '—', span: 2 },
        ]},
      ];
      ```
    - Action buttons: Back only (`navigate(-1)`). Do NOT render Edit or Disable buttons — those are story 6-4 scope. Adding visible-but-nonfunctional buttons creates confusing UX and unnecessary test overhead.
    - Loading: `<Skeleton variant="detail" />`
    - Error: `<ErrorDisplay error={error} onRetry={refetch} />`
  - [ ] 6.2 Create `modules/hexalith-tenants/src/pages/TenantDetailPage.module.css`
  - [ ] 6.3 Create `modules/hexalith-tenants/src/pages/TenantDetailPage.test.tsx`:
    - Test loading state
    - Test detail view renders all sections correctly
    - Test back button navigates
    - Test error state
    - Test with disabled: false — enable test when `id` is undefined

- [ ] **Task 7: Create TenantCreatePage** (AC: #3)
  - [ ] 7.1 Create `modules/hexalith-tenants/src/pages/TenantCreatePage.tsx`:
    - Use `useCommandPipeline()` for command submission
    - Render `<Form>` with `CreateTenantCommandSchema` for validation
    - Fields: name (Input), code (Input), description (TextArea, optional), contactEmail (Input, optional)
    - Submit handler:
      ```
      send({
        domain: 'Tenants',
        commandType: 'CreateTenant',
        aggregateId: generateUUID(),  // crypto.randomUUID()
        payload: formData,
      })
      ```
    - Show pipeline status feedback: sending → polling → completed/rejected
    - On `completed`: show success toast, navigate to tenant list
    - On `rejected`: show `CommandRejectedError` message inline via `<ErrorDisplay>`
    - On `failed`/`timedOut`: show error with retry option via `replay()`
    - Cancel button navigates back without submitting
  - [ ] 7.2 Create `modules/hexalith-tenants/src/pages/TenantCreatePage.test.tsx`:
    - Test form renders with correct fields
    - Test form validation (empty name, invalid code format, invalid email)
    - Test successful command submission (mock success behavior)
    - Test rejected command (mock reject behavior)
    - Test cancel navigates back
    - Configure `MockCommandBus` behaviors via `configureNextSend()`

- [ ] **Task 8: Create manifest, routes, and module entry** (AC: #1)
  - [ ] 8.1 Create `modules/hexalith-tenants/src/manifest.ts`:
    ```typescript
    export const manifest: ModuleManifest = {
      manifestVersion: 1,
      name: "tenants",
      displayName: "Tenants",
      version: "0.1.0",
      routes: [
        { path: "/" },
        { path: "/detail/:id" },
        { path: "/create" },
      ],
      navigation: [
        {
          label: "Tenants",
          path: "/",
          icon: "building",
          category: "Administration",
        },
      ],
    };
    ```
  - [ ] 8.2 Create `modules/hexalith-tenants/src/routes.tsx`:
    - Export `TenantRootPage` default component with Suspense boundary
    - Export `routes` array mapping paths to lazy-loaded page components:
      - `/` → `TenantListPage`
      - `/detail/:id` → `TenantDetailPage`
      - `/create` → `TenantCreatePage`
    - Use `React.lazy()` for page imports
    - Use `<Skeleton>` from `@hexalith/ui` as Suspense fallback
  - [ ] 8.3 Create `modules/hexalith-tenants/src/index.ts`:
    - Default export: `TenantRootPage` (from routes)
    - Named exports: `manifest`, `routes`
    - Type exports: `TenantItem`, `TenantDetail`, `CreateTenantInput`, `UpdateTenantInput`, `DisableTenantInput`
    - Schema exports: all Zod schemas

- [ ] **Task 9: Create dev-host for standalone development** (AC: #4)
  - [ ] 9.1 Create `modules/hexalith-tenants/dev-host/` directory with:
    - `index.html` — standard Vite HTML entry
    - `main.tsx` — renders module inside MockShellProvider + CqrsProvider (mock buses + `MockSignalRHub`) + ToastProvider + BrowserRouter (same provider stack as `renderWithProviders`)
    - `vite.config.ts` — extends from parent vitest config, resolves `@hexalith/*` imports
  - [ ] 9.2 Pre-configure mock data in dev-host main.tsx so the module renders with sample tenants

- [ ] **Task 10: Verify full integration** (AC: all)
  - [ ] 10.1 Run `pnpm install` — verify workspace resolution
  - [ ] 10.2 Run `pnpm turbo build --filter=@hexalith/tenants` — verify clean build
  - [ ] 10.3 Run `pnpm turbo test --filter=@hexalith/tenants` — verify all tests pass
  - [ ] 10.4 Run `pnpm turbo lint --filter=@hexalith/tenants` — verify no lint errors (including module isolation rules)
  - [ ] 10.5 Run `pnpm turbo build` (full workspace) — verify the shell discovers and validates the Tenants manifest
  - [ ] 10.6 Run `pnpm turbo test` (full workspace) — verify no regressions
  - [ ] 10.7 Run `pnpm turbo lint` (full workspace) — verify no boundary violations

## Dev Notes

### What Already Exists (DO NOT recreate)

**CQRS infrastructure is complete:**
- `@hexalith/cqrs-client` provides: `useQuery`, `useCommandPipeline`, `useSubmitCommand`, `useCommandStatus`, `useConnectionState`, `CqrsProvider`, `MockCommandBus`, `MockQueryBus`, `MockSignalRHub` (must be passed to CqrsProvider in tests)
- `@hexalith/shell-api` provides: `useAuth`, `useTenant`, `MockShellProvider`, `createMockAuthContext`, `createMockTenantContext`, manifest types
- `@hexalith/ui` provides: `Table` (+ `TableColumn` type), `DetailView` (+ `DetailSection`, `DetailField` types), `Form`, `FormField`, `Button`, `Input`, `Select`, `TextArea`, `Checkbox`, `DatePicker`, `PageLayout`, `Stack`, `Inline`, `Divider`, `Skeleton`, `EmptyState`, `ErrorDisplay`, `ErrorBoundary`, `Toast`, `ToastProvider`, `useToast` (returns `{ toast, dismiss }` — NOT `addToast`), `Modal`, `AlertDialog`, `Tooltip`, `DropdownMenu`, `Popover`, `Sidebar`, `Tabs`
- **No `Badge` component exists** — render status using CSS class-based `<span>` with CSS module styles (e.g., `.statusActive { color: var(--color-success); }`)


**Shell module loading is complete:**
- `apps/shell/src/modules/registry.ts` uses `import.meta.glob("../../../../modules/*/src/manifest.ts")` to discover modules
- `apps/shell/src/modules/routeBuilder.ts` wraps each module in `ModuleErrorBoundary → Suspense → ModuleRenderGuard`
- `apps/shell/src/modules/navigationBuilder.ts` builds sidebar items from manifests
- `apps/shell/src/build/manifestValidationPlugin.ts` validates manifests at build time

**Module scaffold template exists at `tools/create-hexalith-module/templates/module/`:**
- **PRIMARY IMPLEMENTATION METHOD: Copy and adapt from the template.** Open `ExampleCreatePage.tsx`, `ExampleListPage.tsx`, `ExampleDetailPage.tsx` and rename `Example` → `Tenant`, swap in tenant schemas/data. The template has `useCallback` wrapping, `PageLayout`, `<ErrorDisplay>` above form, `<Inline>` button layout, and status messages that the code patterns in this story simplify. **Follow the template conventions — the code patterns below are reference summaries, not complete implementations.**
- Also copy: `exampleSchemas.ts`, `sampleData.ts`, `renderWithProviders.tsx`, `routes.tsx`, `manifest.ts`, `index.ts`
- Template test files (`*.test.tsx`) show the exact testing patterns including MockQueryBus delay, empty response setup, and route wrapping

**Empty module directories already exist:**
- `modules/hexalith-demo-tasks/` (empty) and `modules/hexalith-test-orders/` (empty)
- Create the Tenants module as `modules/hexalith-tenants/` (NOT in the existing `modules/hexalith-demo-tasks/` or `modules/hexalith-test-orders/`)

**The Hexalith.Tenants .NET backend submodule:**
- EXISTS at repo root as `Hexalith.Tenants/` — this is the .NET backend project, NOT the frontend module
- `.gitmodules` references `https://github.com/Hexalith/Hexalith.Tenants.git` at path `Hexalith.Tenants`
- DO NOT modify this submodule — it is a separate concern from the frontend Tenants module

### Architecture Compliance

**Hook API — CRITICAL: Use the correct hook names:**
- `useQuery<T>()` — NOT `useProjection`. The epics file says "useProjection" but the actual codebase API is `useQuery` from `@hexalith/cqrs-client`
- `useCommandPipeline()` — NOT `useCommand`. The actual codebase API is `useCommandPipeline`
- These hooks internally use TanStack Query and the CQRS transport layer

**useQuery signature:**
```typescript
const { data, isLoading, isRefreshing, error, refetch } = useQuery<T>(
  schema: z.ZodType<T>,       // Zod schema — MUST be stable reference (define at module scope)
  queryParams: { domain: string; queryType: string; aggregateId?: string; entityId?: string },
  options?: { enabled?: boolean; refetchInterval?: number; refetchOnWindowFocus?: boolean }
);
```

**useCommandPipeline signature:**
```typescript
const { send, status, error, correlationId, replay } = useCommandPipeline();
// status: "idle" | "sending" | "polling" | "completed" | "rejected" | "failed" | "timedOut"
// send: (cmd: { domain: string; commandType: string; aggregateId: string; payload: unknown }) => Promise<void>
// replay: (() => Promise<void>) | null  — available only when failed/timedOut
```

**Module boundary rules** [Source: architecture.md, Lines 1538-1567]:
- Modules may ONLY import: `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`, `zod`
- Modules CANNOT import: `@radix-ui/*`, `oidc-client-ts`, `ky`, `@tanstack/react-query`, other `modules/*`
- No deep imports: `@hexalith/*/src/**` is blocked by ESLint

**Loading state pattern** (MANDATORY):
```typescript
if (isLoading) return <Skeleton variant="table" rows={8} />;
if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
// Never use spinners, never return null for loading
```

**Error handling pattern:**
- Business errors (`CommandRejectedError`) → handle inline with user message
- Infrastructure errors (network, auth, 500s) → let bubble to `ModuleErrorBoundary`
- Never `try/catch` around `useQuery`/`useCommandPipeline` — they surface errors via return value

**Date handling:**
- API dates are ISO 8601 strings — use `z.string().datetime()` in Zod schemas
- Display via `new Intl.DateTimeFormat().format(new Date(isoString))` in cell renderers and detail field values
- Avoid creating `Date` objects in reactive expressions or render bodies outside of cell/field renderers

**Import ordering:**
```typescript
// 1. React
// 2. External libraries (zod, react-router)
// 3. @hexalith packages (shell-api, cqrs-client, ui)
// 4. Relative imports (with .js extension for source files — ESM convention)
// 5. CSS modules (last)
```

**Import extension convention:**
- Source files (`.ts`, `.tsx`) use `.js` extension for relative imports: `from '../schemas/tenantSchemas.js'`
- Test files (`.test.tsx`) omit the extension: `from '../testing/renderWithProviders'`
- Package imports never have extensions: `from '@hexalith/cqrs-client'`
- This matches the scaffold template pattern exactly

### Library/Framework Requirements

- **@hexalith/cqrs-client** — `useQuery`, `useCommandPipeline`, `CqrsProvider`, `MockCommandBus`, `MockQueryBus`, `MockSignalRHub`
- **@hexalith/shell-api** — `useTenant`, `MockShellProvider`, `ModuleManifest`
- **@hexalith/ui** — `Table` (`TableColumn`), `DetailView` (`DetailSection`, `DetailField`), `Form`, `FormField` (wraps each input — connects to schema), `Button`, `Input`, `Select`, `TextArea`, `PageLayout`, `Skeleton`, `EmptyState`, `ErrorDisplay`, `ToastProvider`, `useToast` (`{ toast, dismiss }`), `Stack`
- **zod** v3.x — Schema definitions with `z.infer<>` for types
- **react-router** v7.x — `useNavigate`, `useParams`, `Routes`, `Route`, `MemoryRouter`
- **vitest** — Co-located `.test.tsx` files with `@testing-library/react`
- **tsup** — ESM build with type declarations

### File Structure Requirements

**Files to CREATE:**
```
modules/hexalith-tenants/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── eslint.config.js
├── dev-host/
│   ├── index.html
│   ├── main.tsx
│   └── vite.config.ts
└── src/
    ├── index.ts                         # Module entry — default export + named exports
    ├── manifest.ts                      # ModuleManifest declaration
    ├── routes.tsx                       # Route definitions with lazy loading
    ├── schemas/
    │   └── tenantSchemas.ts             # All Zod schemas + inferred types
    ├── data/
    │   └── sampleData.ts               # Query params + mock data
    ├── pages/
    │   ├── TenantListPage.tsx
    │   ├── TenantListPage.module.css
    │   ├── TenantListPage.test.tsx
    │   ├── TenantDetailPage.tsx
    │   ├── TenantDetailPage.module.css
    │   ├── TenantDetailPage.test.tsx
    │   ├── TenantCreatePage.tsx
    │   └── TenantCreatePage.test.tsx
    └── testing/
        └── renderWithProviders.tsx      # Test utility
```

**Files to NOT TOUCH:**
- `pnpm-workspace.yaml` — already includes `modules/*`
- `turbo.json` — no changes needed, module builds as part of workspace
- `.gitmodules` — the Hexalith.Tenants .NET backend entry is separate
- Any files in `packages/` — all APIs are already complete
- Any files in `apps/shell/` — module discovery is automatic via glob
- `modules/hexalith-demo-tasks/` or `modules/hexalith-test-orders/` — leave untouched

### Testing Requirements

- Co-located tests: every page component gets a `.test.tsx` sibling
- Use `renderWithProviders()` for all component tests — wraps MockShellProvider + CqrsProvider with mocks
- Pre-configure `MockQueryBus` with sample data matching query keys
- Use `MockCommandBus.configureNextSend()` to test command success/rejection/failure flows — behaviors are consumed in FIFO order (first configured = first send call consumed)
- Response key format for MockQueryBus: `"tenant:domain:queryType:aggregateId:entityId"` — use `MockQueryBus.setResponse(key, data)` to configure
- All tests use Vitest + `@testing-library/react` — `.test.tsx` files
- Do NOT write Playwright spec files in this story — E2E tests are story 6.4 scope
- Target ≥ 80% coverage for the module

**Critical test patterns (from scaffold template — follow these exactly):**

- **Loading state test:** Use `new MockQueryBus({ delay: 500 })` to slow the response so the loading skeleton is visible before data resolves
- **Empty state test:** You MUST explicitly set an empty array response via `queryBus.setResponse(key, [])`. If no response is configured, MockQueryBus returns a 404 error — NOT empty data. This is the most common test mistake.
- **Build mock keys using `createMockTenantContext()`:**
  ```typescript
  import { createMockTenantContext } from '@hexalith/shell-api';
  const TENANT = createMockTenantContext().activeTenant;
  const listKey = `${TENANT}:${TENANT_LIST_QUERY.domain}:${TENANT_LIST_QUERY.queryType}::`;
  ```
  Do NOT hardcode `"test-tenant"` — use `createMockTenantContext()` for robustness.
- **Navigation tests need route wrapping:** When testing components that call `navigate()`, wrap them in `<Routes><Route>` inside the MemoryRouter so relative navigation resolves correctly. See template test files for the exact pattern.
- **Error state test:** Use `queryBus.setError(key, new Error("message"))` to configure error responses

### Previous Story Intelligence (6-2)

**Story 6-2 is ready-for-dev** — Module publishing via git integration. Key context:
- Foundation packages (`shell-api`, `cqrs-client`, `ui`) are being prepared for publishing to GitHub Packages
- `pnpm-workspace.yaml` already includes `modules/*` — new modules are auto-discovered
- Module boundary rules and ESLint isolation are already configured
- The scaffold tool template is the canonical module pattern

**Story 6-1 is done** — CI pipeline with quality gates:
- Coverage gates: 80% modules, 95% foundation packages
- Scaffold smoke test validates template integrity
- Manifest validation runs at build time
- Design System Health gate checks token compliance

**Anti-patterns from 6-1:**
- Pre-existing test failure in `packages/ui/src/utils/CssLayerSmoke.test.ts` — ignore if encountered
- `@vitest/coverage-v8` was added as explicit dependency (Vitest v3 needs it)

### Git Intelligence

Recent commits show:
- Module isolation ESLint rules active (`module-isolation.js`)
- Connection recovery revalidation in `useQuery`
- Manifest validation plugin operational
- Module error boundaries working

**Patterns established:**
- Co-located tests (`.test.ts(x)` next to source)
- Scripts in `scripts/` at repo root
- Vitest for all unit/integration tests
- CSS Modules for component styling (`.module.css`)
- `@hexalith/ui` components used everywhere

### Critical Anti-Patterns to Avoid

1. **DO NOT use `useProjection` or `useCommand`** — the codebase uses `useQuery` and `useCommandPipeline`. The epics/PRD use different names than the actual implementation.
2. **DO NOT import from `@tanstack/react-query` directly** — use `useQuery` from `@hexalith/cqrs-client` which wraps TanStack Query internally. Direct TanStack imports are blocked by ESLint.
3. **DO NOT import from `@radix-ui/*` directly** — use `@hexalith/ui` components which wrap Radix internally.
4. **DO NOT define Zod schemas inside component bodies** — schemas must be stable references defined at module scope to prevent infinite re-render loops with `useQuery`.
5. **DO NOT create a git submodule** — this story creates the module as a regular directory in `modules/hexalith-tenants/`. The submodule workflow is NOT needed here because the Tenants module lives within the shell workspace during development.
6. **DO NOT modify the `Hexalith.Tenants` .NET backend submodule** at repo root — that is the backend, not the frontend module.
7. **DO NOT use spinners or return null for loading states** — always use `<Skeleton>` from `@hexalith/ui` with the appropriate variant.
8. **DO NOT use `try/catch` around hooks** — `useQuery` and `useCommandPipeline` surface errors via return values, not exceptions.
9. **DO NOT construct `Date` objects in reactive render bodies** — use `z.string().datetime()` in schemas. Formatting via `new Intl.DateTimeFormat().format(new Date(isoString))` inside Table cell renderers and DetailView field values is acceptable.
10. **DO NOT create barrel exports in subdirectories** — only `src/index.ts` is a barrel. Reference files directly.
11. **DO NOT write E2E/Playwright spec files** — those are story 6.4 scope. Only write Vitest `.test.tsx` unit tests.
12. **DO NOT use `workspace:*` in peerDependencies** — use versioned ranges (e.g., `^0.1.0`). pnpm workspace resolves them to local packages automatically.

### MockQueryBus Key Format

The `MockQueryBus` uses a composite key to look up responses:
```
"<tenantId>:<domain>:<queryType>:<aggregateId>:<entityId>"
```
- Default tenantId from MockShellProvider is `"test-tenant"`
- For list query: `"test-tenant:Tenants:GetTenantList::"`
- For detail query: `"test-tenant:Tenants:GetTenantDetail:<id>:"`

Use `queryBus.setResponse(key, data)` to configure mock responses in tests and in the `renderWithProviders` utility.

### Key Code Patterns to Follow

**TenantListPage pattern (from scaffold template ExampleListPage):**
```typescript
import { useNavigate } from 'react-router';
import { useQuery } from '@hexalith/cqrs-client';
import { Button, Table, Skeleton, ErrorDisplay, EmptyState, PageLayout, type TableColumn } from '@hexalith/ui';
import type { TenantItem } from '../schemas/tenantSchemas';
import { TenantListSchema } from '../schemas/tenantSchemas';
import { TENANT_LIST_QUERY } from '../data/sampleData';
import styles from './TenantListPage.module.css';

const columns: TableColumn<TenantItem>[] = [
  { id: 'name', header: 'Name', accessorKey: 'name' },
  { id: 'code', header: 'Code', accessorKey: 'code' },
  { id: 'status', header: 'Status', accessorKey: 'status',
    cell: ({ value }) => <span className={styles[`status${value}`]}>{value as string}</span> },
  { id: 'createdAt', header: 'Created', accessorKey: 'createdAt',
    cell: ({ value }) => new Intl.DateTimeFormat().format(new Date(value as string)) },
];

export function TenantListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(TenantListSchema, TENANT_LIST_QUERY);

  if (isLoading) return <Skeleton variant="table" rows={8} />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  if (!data || data.length === 0) return (
    <EmptyState
      title="No tenants yet"
      description="Create your first tenant to get started."
      action={{ label: 'Create Tenant', onClick: () => navigate('create') }}
    />
  );

  return (
    <PageLayout title="Tenants" actions={<Button onClick={() => navigate('create')}>Create Tenant</Button>}>
      <Table data={data} columns={columns} pagination={{ pageSize: 10 }} globalSearch onRowClick={(row) => navigate(`detail/${row.id}`)} />
    </PageLayout>
  );
}
```

**TenantCreatePage pattern (from scaffold template ExampleCreatePage):**
```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useCommandPipeline } from '@hexalith/cqrs-client';
import { Button, Form, FormField, Input, TextArea, useToast } from '@hexalith/ui';
import { CreateTenantCommandSchema, type CreateTenantInput } from '../schemas/tenantSchemas';

export function TenantCreatePage() {
  const { send, status, error, replay } = useCommandPipeline();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (data: CreateTenantInput) => {
    await send({
      domain: 'Tenants',
      commandType: 'CreateTenant',
      aggregateId: crypto.randomUUID(),
      payload: data,
    });
  };

  // Watch status for navigation on success
  // IMPORTANT: use relative path — absolute '/' goes to shell root, not module root
  useEffect(() => {
    if (status === 'completed') {
      toast({ title: 'Tenant created', variant: 'success' });
      navigate('..');
    }
  }, [status]);

  return (
    <Form schema={CreateTenantCommandSchema} onSubmit={handleSubmit}>
      <FormField name="name">
        <Input placeholder="Tenant name" />
      </FormField>
      <FormField name="code">
        <Input placeholder="tenant-code" />
      </FormField>
      <FormField name="description">
        <TextArea placeholder="Description (optional)" />
      </FormField>
      <FormField name="contactEmail">
        <Input placeholder="contact@example.com" />
      </FormField>
      <Button type="submit" disabled={status === 'sending' || status === 'polling'}>
        {status === 'sending' || status === 'polling' ? 'Creating...' : 'Create Tenant'}
      </Button>
      <Button variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
    </Form>
  );
}
```

### Project Structure Notes

- Module directory is `modules/hexalith-tenants/` — follows kebab-case naming convention
- The shell discovers modules via `import.meta.glob("../../../../modules/*/src/manifest.ts")` — placing the module in `modules/hexalith-tenants/` with a `src/manifest.ts` is sufficient for auto-discovery
- pnpm workspace resolves `@hexalith/*` peerDependencies to local packages automatically
- Turborepo builds modules in correct dependency order (packages first, then modules)
- **`basePath` is derived from `manifest.name`** (see `registry.ts` line 60: `basePath: manifest.name`), NOT from the directory name. With `manifest.name: "tenants"`, basePath = `"tenants"`
- Routes will be prefixed: `/tenants/`, `/tenants/detail/:id`, `/tenants/create`
- All internal navigation MUST use relative paths (`navigate('..')`, `navigate('create')`, `navigate(\`detail/${id}\`)`) — never absolute paths

### References

- [Source: architecture.md, Lines 796-1140] Module internal organization pattern and consistency rules
- [Source: architecture.md, Lines 1460-1490] Tenants module directory structure
- [Source: architecture.md, Lines 1538-1567] Module boundary rules
- [Source: architecture.md, Lines 1577-1583] Dependency type rules
- [Source: architecture.md, Lines 1103-1140] Complete module page example (TenantListPage)
- [Source: epics.md, Lines 1998-2029] Story 6.3 acceptance criteria
- [Source: epics.md, Lines 342-349] Epic 6 entry criteria and external dependencies
- [Source: prd.md, FR9-FR17] CQRS integration functional requirements
- [Source: prd.md, FR39-FR41] Component library functional requirements
- [Source: ux-design-specification.md] Tenant-aware empty states, compact table density, status bar tenant context
- [Source: tools/create-hexalith-module/templates/module/] Canonical module scaffold patterns

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
