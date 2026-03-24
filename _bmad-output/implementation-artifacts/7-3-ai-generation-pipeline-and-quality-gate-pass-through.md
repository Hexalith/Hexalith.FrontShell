# Story 7.3: AI Generation Pipeline & Quality Gate Pass-Through

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a module developer,
I want AI-generated modules to pass all quality gates without manual correction,
so that AI generation is a reliable, production-ready workflow — not a starting point that needs extensive fixing.

## Acceptance Criteria

1. **AC1 — Generated Module Compiles and Passes All Local Gates** — Given an AI agent generates a module using the knowledge bundle and prompt templates, when the generated module is placed in the `modules/` directory, then `pnpm install` resolves all dependencies without errors, `pnpm build` compiles the module without TypeScript errors, `pnpm lint` passes all ESLint and Stylelint rules (import boundaries, naming, token compliance), and `pnpm test` passes all generated Vitest tests.

2. **AC2 — Full CI Pipeline Quality Gates** — Given the generated module is integrated into the shell, when the full CI pipeline runs, then the module passes all quality gates: coverage >= 80%, token compliance 100%, axe-core 0 violations, manifest validation passes, and the scaffold smoke test still passes.

3. **AC3 — Domain-Specific Generation Output** — Given an AI generates a module from a domain description like "Order management with order list, order detail, and create order form", when the generation completes, then the module includes: `OrderListPage` with `<Table>`, `OrderDetailPage` with `<DetailView>`, `CreateOrderPage` with `<Form>`. Zod schemas define `OrderItemSchema`, `OrderDetailSchema`, `CreateOrderCommandSchema`. `useQuery` and `useCommandPipeline` are correctly integrated. Realistic domain data is used in tests and sample data (not placeholder text).

4. **AC4 — Quality Gate Parity** — Given AI-generated and human-authored modules exist in the same shell, when both are built and tested, then the same quality gates apply to both — no special exceptions for AI-generated modules. The visual output of AI-generated modules is indistinguishable from human-authored ones (both use `@hexalith/ui` exclusively).

## Tasks / Subtasks

- [ ] Task 1: Create module validation script (AC: #1, #2)
  - [ ] Create `scripts/validate-module.ts` — TypeScript script (tsx runner) that validates a single module against all quality gates
  - [ ] Accept module path as CLI argument: `tsx scripts/validate-module.ts modules/hexalith-orders`
  - [ ] Gate 1 — Dependency check: verify `package.json` has correct peerDependencies on `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui` with compatible version ranges
  - [ ] Prerequisite: verify workspace is built (`turbo build`) before running gates — `@hexalith/*` type declarations live in `dist/` and are needed for `tsc --noEmit`
  - [ ] Gate 2 — TypeScript compilation: run `tsc --noEmit` in the module directory, report any type errors
  - [ ] Gate 3 — ESLint: run `eslint` on the module's `src/` directory, report violations
  - [ ] Gate 4 — Stylelint: run `stylelint` on the module's CSS files, report token compliance violations
  - [ ] Gate 5 — Vitest: run tests with `--coverage`, check coverage >= 80% for all metrics
  - [ ] Gate 6 — Manifest validation: import `validateManifest` from `@hexalith/shell-api` and validate the module's manifest
  - [ ] Output format: structured text with PASS/FAIL per gate, file:line details on failures
  - [ ] Exit code: 0 (all gates pass) or 1 (any gate fails)
  - [ ] Follow existing script patterns from `check-bundle-freshness.ts` and `check-test-quality.ts`
  - [ ] Use `execFile` (not `exec`) for running external tools to prevent command injection — follow the `execFileNoThrow` pattern from `src/utils/execFileNoThrow.ts` if available
  - [ ] Add `"check:validate-module"` script to root `package.json`: `"tsx scripts/validate-module.ts"`

- [ ] Task 2: Generate AI reference module — orders domain (AC: #3)
  - [ ] Use `docs/ai-knowledge-bundle/prompts/new-module.md` template with domain description: "Order management with order list, order detail, and create order form"
  - [ ] Input parameters: module name = "orders", entities = [Order], commands = [CreateOrder], projections = [OrderList, OrderDetail]
  - [ ] Generate `modules/hexalith-orders/package.json` — private workspace package; scripts: `build` (tsup), `dev` (vite --config dev-host/vite.config.ts), `lint` (eslint src), `test` (vitest run), `test:watch` (vitest); peerDependencies matching workspace versions: `@hexalith/shell-api` ^0.1.0, `@hexalith/cqrs-client` ^0.2.0, `@hexalith/ui` ^0.1.0, `react` ^19.0.0, `react-dom` ^19.0.0, `react-router` ^7.6.0, `zod` ^3.0.0; devDependencies: vitest, @testing-library/react, @testing-library/jest-dom, jsdom, tsup, tsx, typescript, eslint + eslint configs, stylelint — **copy exact devDependencies from `modules/hexalith-tenants/package.json`**
  - [ ] Generate `modules/hexalith-orders/tsconfig.json` — extends `@hexalith/tsconfig/base.json`, jsx: `react-jsx`, lib: `["ES2022", "DOM", "DOM.Iterable"]`, outDir: `dist`, rootDir: `src`, include: `["src"]` — **match `modules/hexalith-tenants/tsconfig.json` exactly**
  - [ ] Generate `modules/hexalith-orders/tsup.config.ts` — `defineConfig({ entry: ["src/index.ts"], format: ["esm"], dts: true, clean: true })` — **required for `pnpm build` to work**
  - [ ] Generate `modules/hexalith-orders/vitest.config.ts` — module test config with 80% coverage thresholds for lines/functions/statements/branches; separate unit test project (.test.ts) and component test project (.test.tsx with jsdom); CSS modules classNameStrategy: `non-scoped` — **match `modules/hexalith-tenants/vitest.config.ts` pattern**
  - [ ] Generate `modules/hexalith-orders/eslint.config.js` — extends `@hexalith/eslint-config/base`, `@hexalith/eslint-config/react`, `@hexalith/eslint-config/module-isolation` (3 configs, module-isolation enforces import boundaries)
  - [ ] Generate `modules/hexalith-orders/.gitignore` — `node_modules/`, `dist/`, `coverage/`, `.turbo/`, `*.tsbuildinfo` (matches scaffold template)
  - [ ] Generate `modules/hexalith-orders/src/manifest.ts` — ModuleManifestV1 with routes: `/`, `/detail/:id`, `/create`; navigation with label "Orders", icon "package", category "Modules"
  - [ ] Generate `modules/hexalith-orders/src/index.ts` — default export (root page), named exports: manifest, routes, types, schemas
  - [ ] Generate `modules/hexalith-orders/src/routes.tsx` — lazy-loaded routes with Suspense + Skeleton fallback
  - [ ] Generate `modules/hexalith-orders/src/css-modules.d.ts` — type declaration: `declare module "*.module.css" { const classes: Record<string, string>; export default classes; }` (matches tenants module)
  - [ ] Generate `modules/hexalith-orders/src/test-setup.ts` — **copy from `modules/hexalith-tenants/src/test-setup.ts`**: polyfills for Radix UI pointer capture, scrollIntoView, ResizeObserver, window.matchMedia, crypto.randomUUID, vitest cleanup afterEach

- [ ] Task 3: Generate domain schemas (AC: #3)
  - [ ] Generate `modules/hexalith-orders/src/schemas/orderSchemas.ts`
  - [ ] `OrderItemSchema` — z.object: id (uuid), orderNumber (string), customerName (string), status (union: "draft" | "confirmed" | "shipped" | "delivered" | "cancelled"), totalAmount (number), itemCount (number), createdAt (datetime)
  - [ ] `OrderDetailSchema` — extends OrderItemSchema: shippingAddress (string), billingAddress (string), notes (string optional), items (array of OrderLineItemSchema), updatedAt (datetime)
  - [ ] `OrderLineItemSchema` — z.object: id (uuid), productName (string), quantity (number), unitPrice (number), lineTotal (number)
  - [ ] `CreateOrderCommandSchema` — z.object: customerName (string min 1), shippingAddress (string min 1), billingAddress (string min 1), notes (string optional) — **static fields only, matching scaffold ExampleCreatePage pattern; no dynamic arrays**
  - [ ] Inferred types: `type OrderItem = z.infer<typeof OrderItemSchema>`, `type OrderDetail = z.infer<typeof OrderDetailSchema>`, `type OrderLineItem = z.infer<typeof OrderLineItemSchema>`, `type CreateOrderCommand = z.infer<typeof CreateOrderCommandSchema>`, etc.

- [ ] Task 4: Generate page components (AC: #3, #4)
  - [ ] Generate `modules/hexalith-orders/src/pages/OrderListPage.tsx`
    - Import order: react, react-router, zod, @hexalith/cqrs-client, @hexalith/ui, relative CSS, relative schemas
    - `const ListSchema = z.array(OrderItemSchema)` at module scope
    - Query params as `const` at module scope for referential stability
    - Column definitions with `satisfies TableColumn<OrderItem>[]` — include: orderNumber, customerName, status, totalAmount, createdAt
    - Three-state rendering: `isLoading` then Skeleton, `error` then ErrorDisplay, `!data.length` then EmptyState, then Table
    - Table props: `sorting`, `pagination={{ pageSize: 10 }}`, `globalSearch`, `onRowClick={handleRowClick}`, `caption="Order items"`
    - `useCallback` for handleRowClick with navigate dependency
    - Status column with domain-specific badge styling via CSS module
  - [ ] Generate `modules/hexalith-orders/src/pages/OrderListPage.module.css`
    - CSS Module with `--hx-*` design tokens only, no hardcoded colors
    - camelCase class names (e.g., `.statusBadge`, `.orderNumber`)
  - [ ] Generate `modules/hexalith-orders/src/pages/OrderDetailPage.tsx`
    - `useParams` for route parameter extraction
    - Query params builder function (not const — aggregateId varies)
    - `{ enabled: !!id }` option on useQuery
    - `DetailView` with sections array — **match `TenantDetailPage.tsx` pattern exactly**:
      - "Order Information" section: orderNumber, customerName, status (with styled `<span>` + CSS module classes like tenants status badge), totalAmount (formatted as currency), itemCount
      - "Shipping" section: shippingAddress (span: 2), billingAddress (span: 2), notes (span: 2, optional — show "—" if empty)
      - "Audit Trail" section: createdAt (formatted date), updatedAt (formatted date)
    - **DO NOT render the `items` array in DetailView** — DetailView renders label/value pairs, not nested arrays. The `itemCount` field is sufficient for the detail view. Complex line item rendering is out of scope (no existing pattern).
    - Three-state rendering: loading/error/null-data guards
  - [ ] Generate `modules/hexalith-orders/src/pages/OrderCreatePage.tsx`
    - **Match scaffold `ExampleCreatePage.tsx` pattern exactly — static fields only, no dynamic arrays**
    - `useCommandPipeline` for command lifecycle
    - `useEffect` watching `status === "completed"` for success toast + `navigate("..")`
    - `Form` wrapping `FormField` for: customerName (Input), shippingAddress (TextArea rows={2}), billingAddress (TextArea rows={2}), notes (TextArea rows={3}, optional)
    - `handleSubmit` with `send()`: commandType = "CreateOrder", domain = "Orders", aggregateId = crypto.randomUUID(), payload from form data
    - Status message display for sending/polling/rejected/failed/timedOut
    - `isBusy` derived from status for button disable
    - All user-facing text uses domain-specific language: "Create Order", "Order created successfully", "No orders yet"
    - **NO dynamic line items** — the scaffold pattern uses static fields; dynamic form arrays have no existing pattern and would introduce untested complexity

- [ ] Task 5: Generate tests (AC: #1, #2)
  - [ ] Generate `modules/hexalith-orders/src/pages/OrderListPage.test.tsx`
    - Test cases: loading state (Skeleton visible), data rendering (table with order data), empty state (EmptyState component), error state (ErrorDisplay component), row click navigation
    - MockQueryBus with realistic order data that validates against OrderItemSchema
    - `renderWithProviders` helper from testing/ directory
    - AC markers: `// AC: 7-3#1, 7-3#3`
  - [ ] Generate `modules/hexalith-orders/src/pages/OrderDetailPage.test.tsx`
    - Test cases: loading state, detail rendering with all sections, error state, missing ID handling
    - MockQueryBus with detailed order data validating against OrderDetailSchema
    - AC markers: `// AC: 7-3#1, 7-3#3`
  - [ ] Generate `modules/hexalith-orders/src/pages/OrderCreatePage.test.tsx`
    - Test cases: form rendering, successful submission flow (send then completed then toast then navigate), validation errors, command rejection handling
    - MockCommandBus with configurable success/failure
    - AC markers: `// AC: 7-3#1, 7-3#3`
  - [ ] Generate `modules/hexalith-orders/src/routes.test.tsx`
    - Validate routes match manifest routes (manifest-to-routes consistency)
    - AC markers: `// AC: 7-3#1`
  - [ ] Generate `modules/hexalith-orders/src/testing/renderWithProviders.tsx`
    - Copy verbatim from scaffold: `tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx`, only changing entity-specific imports
  - [ ] Verify all mock data validates against corresponding Zod schemas

- [ ] Task 6: Generate dev-host and sample data (AC: #3)
  - [ ] Generate `modules/hexalith-orders/src/data/sampleData.ts`
    - Realistic order domain data: customer names, order numbers (ORD-001, ORD-002...), statuses, realistic amounts, timestamps
    - Query response constants matching MockQueryBus key format: `{tenant}:{domain}:{queryType}:{aggregateId}:{entityId}`
    - All sample data validates against OrderItemSchema / OrderDetailSchema
  - [ ] Generate `modules/hexalith-orders/dev-host/vite.config.ts` — standalone Vite dev server config
  - [ ] Generate `modules/hexalith-orders/dev-host/main.tsx` — entry point with MockShellProvider
  - [ ] Generate `modules/hexalith-orders/dev-host/mockSetup.ts` — MockCommandBus + MockQueryBus setup with sample data

- [ ] Task 7: Integrate into shell and verify discovery (AC: #2, #4)
  - [ ] Verify `apps/shell/src/modules/registry.ts` Vite glob discovers `modules/hexalith-orders/src/manifest.ts` automatically
  - [ ] Run `pnpm install` — verify dependency resolution succeeds
  - [ ] Run `pnpm build` — verify full workspace builds including orders module
  - [ ] Run `pnpm lint` — verify ESLint passes (import boundaries, no direct Radix, no cross-module imports)
  - [ ] Run `pnpm lint:styles` — verify Stylelint passes (token compliance 100%)
  - [ ] Run `pnpm test` — verify all tests pass including orders module
  - [ ] Verify orders module achieves >= 80% test coverage
  - [ ] Verify both hexalith-tenants AND hexalith-orders pass identical quality gates
  - [ ] Run `pnpm check:bundle-freshness` — verify it still passes
  - [ ] Run `pnpm check:validate-module modules/hexalith-orders` — verify validation script passes

- [ ] Task 8: Add CI integration (AC: #2)
  - [ ] Add `"check:validate-module"` to root package.json scripts
  - [ ] Add CI step in `.github/workflows/ci.yml` after existing quality gates:
    ```yaml
    - name: AI Module Validation
      run: pnpm check:validate-module modules/hexalith-orders
    ```
  - [ ] Ensure scaffold smoke test still passes (orders module does not interfere)
  - [ ] Verify full CI pipeline YAML is valid

- [ ] Task 9: Update documentation (AC: #1, #4)
  - [ ] Update `docs/ai-knowledge-bundle/index.md` — add "Generation Pipeline" section entry
  - [ ] Create `docs/ai-knowledge-bundle/generation-pipeline.md` — document the end-to-end generation workflow: domain description, prompt template, AI generation, validate-module, CI pipeline, deployed module
  - [ ] Update `docs/module-development.md` — add AI generation path cross-reference
  - [ ] Update `CLAUDE.md` if needed for AI generation pipeline awareness

- [ ] Task 10: Final verification (AC: #1, #2, #3, #4)
  - [ ] Run full CI pipeline locally: `pnpm install && pnpm build && pnpm lint && pnpm lint:styles && pnpm test`
  - [ ] Verify hexalith-orders coverage >= 80%
  - [ ] Verify token compliance = 100% for hexalith-orders
  - [ ] Verify manifest validation passes
  - [ ] Verify both modules produce identical quality gate results (no special exceptions)
  - [ ] Verify `pnpm check:validate-module modules/hexalith-orders` outputs PASS for all gates
  - [ ] Verify no regressions in existing tests (hexalith-tenants, packages/*)
  - [ ] Verify scaffold smoke test passes

## Dev Notes

### Critical Dependency: Story 7-2 Must Be Complete First

This story depends on story 7-2 (AI Prompt Templates) being fully implemented. The prompt templates in `docs/ai-knowledge-bundle/prompts/` are the input to the generation process. If 7-2 is not complete, the dev agent must either:
1. Wait for 7-2 to be implemented first
2. Use the knowledge bundle directly (without templates) — less ideal but functional

Check `docs/ai-knowledge-bundle/prompts/new-module.md` exists before starting Task 2.

### What This Story Actually Proves

This story is the end-to-end proof that the AI generation pipeline works:
- Story 7-1 created the knowledge bundle (API contracts, conventions, patterns)
- Story 7-2 created prompt templates (generation instructions)
- Story 7-3 proves it all works: AI agent reads templates + bundle, generates module, module passes all gates, module integrates into shell

The generated orders module is not just an example — it is validation evidence that FR43 and FR44 are satisfied.

### Module Placement: Direct Directory (Not Git Submodule)

The hexalith-tenants module is a git submodule (separate repo). The AI-generated hexalith-orders module should be placed as a direct directory in `modules/` for this story. Reasons:
- Proves quality gate parity without submodule overhead
- Shell registry discovers modules via Vite glob (`modules/*/src/manifest.ts`) regardless of git structure
- A separate repo can be created later if needed
- Avoids introducing git submodule complexity into the AI generation workflow

Important: Verify `pnpm-workspace.yaml` includes `modules/*` in its packages pattern. If it does, the orders module is automatically recognized as a workspace package.

### Validate-Module Script Design

The validate-module script serves two purposes:
1. This story: Quick local verification that a generated module passes all gates
2. Story 7-4: Foundation for structured validation feedback (FR46)

Script pattern (follow `check-bundle-freshness.ts`):
- TypeScript via `tsx` runner
- Text output: PASS/FAIL per gate with details
- Exit code: 0 (all pass) or 1 (any fail)
- No new dependencies — use Node.js built-ins + `execFile` (not `exec`) for running build tools safely
- Each gate as a separate function for modularity

Gate execution order (fail-fast):
1. Dependency check (peerDependency ranges)
2. TypeScript compilation (`tsc --noEmit`)
3. ESLint
4. Stylelint (token compliance)
5. Vitest with coverage
6. Manifest validation

### Generated Module Must Match Scaffold Patterns Exactly

The AI-generated orders module MUST follow the exact same patterns as the scaffold template and the tenants reference module. Key patterns to match:

File structure:
```
modules/hexalith-orders/
├── .gitignore                      # node_modules/, dist/, coverage/, .turbo/, *.tsbuildinfo
├── package.json                    # Scripts, peerDeps, devDeps (copy devDeps from tenants)
├── tsconfig.json                   # Extends @hexalith/tsconfig/base.json, react-jsx
├── tsup.config.ts                  # ESM build: entry src/index.ts, dts: true
├── vitest.config.ts                # 80% coverage, unit + component projects
├── eslint.config.js                # base + react + module-isolation configs
├── src/
│   ├── index.ts                    # Default + named exports
│   ├── manifest.ts                 # ModuleManifestV1
│   ├── routes.tsx                  # Lazy-loaded routes with Suspense
│   ├── routes.test.tsx             # Route-manifest consistency
│   ├── css-modules.d.ts            # declare module "*.module.css"
│   ├── test-setup.ts               # Radix polyfills (copy from tenants)
│   ├── schemas/
│   │   └── orderSchemas.ts         # All Zod schemas + inferred types
│   ├── pages/
│   │   ├── OrderListPage.tsx
│   │   ├── OrderListPage.test.tsx
│   │   ├── OrderListPage.module.css
│   │   ├── OrderDetailPage.tsx
│   │   ├── OrderDetailPage.test.tsx
│   │   ├── OrderCreatePage.tsx
│   │   └── OrderCreatePage.test.tsx
│   ├── data/
│   │   └── sampleData.ts           # Realistic mock data + query constants
│   └── testing/
│       └── renderWithProviders.tsx  # Test wrapper (copy from scaffold)
└── dev-host/
    ├── vite.config.ts
    ├── main.tsx
    └── mockSetup.ts
```

### Scaffold Template Files to Read During Implementation

The dev agent MUST read these scaffold files to match patterns exactly:

| File | Purpose |
|------|---------|
| `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx` | List page pattern (Table, useQuery, 3-state rendering) |
| `tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.tsx` | Detail page pattern (DetailView, useParams, useQuery) |
| `tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx` | Create page pattern (Form, useCommandPipeline, useEffect) |
| `tools/create-hexalith-module/templates/module/src/schemas/exampleSchemas.ts` | Zod schema pattern |
| `tools/create-hexalith-module/templates/module/src/routes.tsx` | Routes with lazy + Suspense |
| `tools/create-hexalith-module/templates/module/src/index.ts` | Module entry exports |
| `tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx` | Test wrapper (copy verbatim) |
| `tools/create-hexalith-module/templates/module/src/data/sampleData.ts` | Mock data pattern |
| `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.module.css` | CSS module with tokens |
| `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.test.tsx` | Test pattern with MockQueryBus |

Also read the tenants reference module for real-world patterns:

| File | Purpose |
|------|---------|
| `modules/hexalith-tenants/src/manifest.ts` | Real manifest example |
| `modules/hexalith-tenants/src/schemas/tenantSchemas.ts` | Real Zod schemas |
| `modules/hexalith-tenants/src/pages/TenantListPage.tsx` | Production list page |
| `modules/hexalith-tenants/src/pages/TenantCreatePage.tsx` | Production create page |
| `modules/hexalith-tenants/package.json` | Production peerDependencies |
| `modules/hexalith-tenants/vitest.config.ts` | Production test config |
| `modules/hexalith-tenants/eslint.config.js` | Production lint config |

### Hook Name Mapping (Epic Shorthand vs Actual)

The epic acceptance criteria use shorthand names. Use the actual exported names:
- `useProjection` in epics maps to `useQuery` (with Zod schema validation)
- `useCommand` in epics maps to `useCommandPipeline` (recommended, full lifecycle with status tracking)
- Fire-and-forget alternative: `useSubmitCommand` (not recommended for forms)
- Status transitions: `idle` then `sending` then `polling` then `completed | rejected | failed | timedOut`

### Import Order Convention

Every generated file must follow this import order (ESLint enforces):
1. `react` / `react-dom`
2. External libraries (`react-router`, `zod`)
3. `@hexalith/*` packages (`@hexalith/cqrs-client`, `@hexalith/shell-api`, `@hexalith/ui`)
4. Relative imports (`./schemas/orderSchemas`)
5. CSS modules (`./OrderListPage.module.css`)
6. Type-only imports separated with `import type`

### Quality Gate Thresholds

| Gate | Threshold | Notes |
|------|-----------|-------|
| TypeScript | 0 errors | `tsc --noEmit` |
| ESLint | 0 violations | Import boundaries, no Radix direct imports, no cross-module |
| Stylelint | 100% token compliance | No hardcoded colors, spacing, typography |
| Test coverage | >= 80% branches/functions/lines/statements | Foundation packages use 95% but modules use 80% |
| Manifest validation | All fields valid | kebab-case name, semver version, valid routes, nav-route cross-ref |
| axe-core | 0 violations | Inherited from @hexalith/ui Radix primitives |

### Existing CI Pipeline Steps (For Reference)

The CI pipeline runs these gates in order (from `.github/workflows/ci.yml`):
1. Peer Dependency Validation
2. ATDD Compliance Check (PRs only)
3. Manifest Type Check
4. Build (Turborepo)
5. Knowledge Bundle Freshness
6. Lint (ESLint + Stylelint)
7. Test with Coverage
8. Test Quality Standards (PRs only)
9. Contract Verification
10. Scaffold Smoke Test
11. Storybook Build
12. Playwright Component Tests
13. Design System Health
14. Build Regression Detection (main only)

The AI Module Validation step should be added after Test Quality Standards (step 8) and before Contract Verification (step 9).

### Existing Script Patterns

**check-bundle-freshness.ts pattern:**
- Uses `fs.readFileSync` + regex for content extraction
- Separate functions per check
- Helper functions: `pass()`, `warn()`, `fail()` for output
- Tracks pass/fail counts
- Summary at end with exit code

**check-test-quality.ts pattern:**
- Uses `execFile`-style approach for running git commands
- File discovery via git diff or glob
- Separate check function per quality criterion
- Comment-based exemptions (`// quality-ignore`)
- CLI args: `--all`, `--changed-only`, `--help`

The validate-module script should combine both patterns: `execFile` for running build tools safely + structured pass/fail output.

### pnpm Workspace Configuration

Check `pnpm-workspace.yaml` — it likely has `packages: ["packages/*", "apps/*", "tools/*", "modules/*"]`. If `modules/*` is already included, the orders module will be automatically recognized. If not, add it.

### Anti-Patterns to Prevent

1. **DO NOT** generate placeholder text — use realistic order domain data: "Acme Corp", "ORD-2024-001", "$1,247.50", "123 Main Street"
2. **DO NOT** use TypeScript enums — use `z.union([z.literal("draft"), z.literal("confirmed"), ...])` for status fields
3. **DO NOT** import from `@radix-ui/*` — all UI components come from `@hexalith/ui`
4. **DO NOT** use inline styles — use CSS Modules with `--hx-*` design tokens
5. **DO NOT** use `useState` for form state — use `<Form schema={...}>` which wraps React Hook Form
6. **DO NOT** skip empty state handling — every list/detail page must handle loading, error, empty, and data states
7. **DO NOT** create barrel exports in subdirectories — only `src/index.ts` has barrel exports
8. **DO NOT** put tests in `__tests__/` directories — co-locate `.test.tsx` next to source files
9. **DO NOT** call toast during render — use `useEffect` watching status for side effects
10. **DO NOT** use generic text like "Item created" — use "Order created successfully", "No orders found", etc.
11. **DO NOT** skip manifest-to-routes consistency — every route in manifest.ts must have a matching lazy import in routes.tsx
12. **DO NOT** use `--testPathPattern` — Vitest v3 uses positional arguments for path filtering
13. **DO NOT** make the validate-module script depend on external packages — use Node.js built-ins + `execFile`
14. **DO NOT** modify the scaffold tool or existing packages — this story only adds a new module + validation script + docs
15. **DO NOT** use shell-injecting patterns (e.g., string concatenation in commands) — use `execFile` with argument arrays
16. **DO NOT** implement dynamic form arrays (add/remove line items) — no existing pattern in scaffold or tenants module; static fields only for CreatePage
17. **DO NOT** try to render arrays inside `DetailView` — it renders label/value pairs; use `itemCount` field instead of nested line item rendering
18. **DO NOT** forget `tsup.config.ts` — without it, `pnpm build` will silently skip the module or fail
19. **DO NOT** skip copying `test-setup.ts` polyfills from tenants — Radix UI components need them for jsdom tests
20. **DO NOT** guess devDependencies — copy exact versions from `modules/hexalith-tenants/package.json`

### Previous Story Intelligence

**From Story 7-1 (Machine-Readable Knowledge Bundle) — DONE:**
- Knowledge bundle: 8 files in `docs/ai-knowledge-bundle/`
- JSON Schema for ModuleManifestV1
- All 11 CQRS hooks documented with real signatures from source
- All 26 UI components documented with actual props
- Freshness script: check-bundle-freshness.ts (5 verification checks)
- Key lesson: always read actual source code, never trust architecture docs alone
- Provider-level hooks (useCqrs, useQueryClient, useSignalRHub) exist but should NOT be used in module code
- Pre-existing issues not caused by 7-1: CSS layer test timeout in @hexalith/ui, import ordering lint in tenants module
- Code review follow-up: EmptyState freshness check fix, useCommandPipeline toast example fix, detail page params fix

**From Story 7-2 (AI Prompt Templates) — READY-FOR-DEV:**
- Template structure: Purpose, Input Parameters, Clarifying Questions, Bundle References, Generation Instructions (code-first), Worked Example, Quality Checklist, Anti-Patterns
- Templates to be created in `docs/ai-knowledge-bundle/prompts/`: new-module.md, add-command.md, add-projection.md
- Template length target: ~2000 words
- Templates reference knowledge bundle (not architecture docs)
- Each template ends with quality checklist
- Code skeletons lead, prose explains variations
- Reserved module names: shell, shell-api, cqrs-client, ui, tsconfig, eslint-config
- Freshness script extended to verify template files exist and reference current hooks/components

**Codebase state:** Test fixtures (MockCommandBus, MockQueryBus, MockShellProvider) and error hierarchy are stable. Knowledge bundle freshness check passes. CI pipeline has 14+ quality gates.

### Git Intelligence

Recent commits:
- `b40d56f` — chore: update subproject commit reference for Hexalith.Tenants
- `021c2f8` — feat: add AI knowledge bundle documentation and freshness check script
- `6e3a3bd` — feat(tests): implement comprehensive testing strategy and contract tests
- `5640b26` — feat(errors): implement error monitoring system with context and global handlers

Key patterns: Provider pattern (React Context), error hierarchy (HexalithError base), deterministic testing (inject now()), contract tests (parameterized suites).

### Project Structure Notes

**New files to CREATE:**
```
scripts/validate-module.ts                              # Module validation script
docs/ai-knowledge-bundle/generation-pipeline.md         # Pipeline documentation
modules/hexalith-orders/                                # AI-generated reference module
├── .gitignore
├── package.json
├── tsconfig.json
├── tsup.config.ts                                      # REQUIRED for pnpm build
├── vitest.config.ts
├── eslint.config.js
├── src/
│   ├── index.ts
│   ├── manifest.ts
│   ├── routes.tsx
│   ├── routes.test.tsx
│   ├── css-modules.d.ts
│   ├── test-setup.ts
│   ├── schemas/orderSchemas.ts
│   ├── pages/OrderListPage.tsx
│   ├── pages/OrderListPage.test.tsx
│   ├── pages/OrderListPage.module.css
│   ├── pages/OrderDetailPage.tsx
│   ├── pages/OrderDetailPage.test.tsx
│   ├── pages/OrderCreatePage.tsx
│   ├── pages/OrderCreatePage.test.tsx
│   ├── data/sampleData.ts
│   └── testing/renderWithProviders.tsx
└── dev-host/
    ├── vite.config.ts
    ├── main.tsx
    └── mockSetup.ts
```

**Files to MODIFY:**
```
package.json                                    # Add check:validate-module script
.github/workflows/ci.yml                        # Add AI Module Validation CI step
docs/ai-knowledge-bundle/index.md               # Add generation pipeline section
docs/module-development.md                      # Add AI generation cross-reference
pnpm-workspace.yaml                             # Verify modules/* pattern exists
```

**Files to NOT TOUCH:**
- `packages/shell-api/`, `packages/cqrs-client/`, `packages/ui/` — platform packages are stable
- `tools/create-hexalith-module/` — scaffold tool is complete
- `modules/hexalith-tenants/` — reference module is done
- `apps/shell/src/modules/registry.ts` — auto-discovers modules via glob (no changes needed)
- Existing test files or CI gates — only add, never modify existing gates

### Library/Framework Requirements

- No new dependencies — the validation script uses Node.js built-ins + `execFile` (safe subprocess execution)
- `tsx` — already in devDependencies for TypeScript script execution
- Generated module uses only existing workspace dependencies as peerDependencies:
  - `@hexalith/shell-api` — ModuleManifest type
  - `@hexalith/cqrs-client` — useQuery, useCommandPipeline, MockCommandBus, MockQueryBus
  - `@hexalith/ui` — all UI components
  - `zod` — schema definitions
  - `react`, `react-dom`, `react-router` — React framework

### Testing Requirements

- **validate-module.ts** — test locally with `tsx scripts/validate-module.ts modules/hexalith-orders`
- **Generated module tests** — new Vitest test files in hexalith-orders covering all pages + routes
- **Coverage target** — >= 80% for the generated module
- **Existing tests** — ALL must continue to pass (zero regressions)
- **Scaffold smoke test** — must still pass (hexalith-orders does not interfere with scaffolding)
- **Self-test** — run validate-module against hexalith-tenants too (should also pass, proving parity)

### Scope Boundaries

- **Story 7-4 (Validation Feedback)** handles structured JSON output and AI self-correction feedback — this story produces text output only
- **Edit pages** are out of scope — generate list, detail, and create only
- **Non-CRUD patterns** (dashboards, wizards) are out of scope
- **Dynamic form arrays** (add/remove line items) are out of scope — no existing scaffold pattern; use static form fields matching ExampleCreatePage
- **Nested array rendering in DetailView** is out of scope — DetailView renders label/value pairs; use itemCount for orders
- **Automated re-generation** is out of scope — this story proves one generation cycle works
- **Production deployment** is out of scope — this story proves CI pipeline passes

### References

- [Source: _bmad-output/planning-artifacts/epics.md, lines 2237-2269] Epic 7 Story 7.3 acceptance criteria (FR43, FR44)
- [Source: _bmad-output/planning-artifacts/prd.md, FR43] AI generation passes all quality gates
- [Source: _bmad-output/planning-artifacts/prd.md, FR44] Same quality gates for AI and human modules
- [Source: _bmad-output/planning-artifacts/architecture.md, FR42-FR46] AI Module Generation mapping
- [Source: docs/ai-knowledge-bundle/index.md] Knowledge bundle master index
- [Source: docs/ai-knowledge-bundle/manifest-schema.json] ManifestV1 JSON Schema
- [Source: docs/ai-knowledge-bundle/cqrs-hooks.md] Hook API reference
- [Source: docs/ai-knowledge-bundle/ui-components.md] Component catalog
- [Source: docs/ai-knowledge-bundle/conventions.md] Naming conventions
- [Source: docs/ai-knowledge-bundle/scaffold-structure.md] Module directory structure
- [Source: docs/ai-knowledge-bundle/test-fixtures.md] Mock APIs and test patterns
- [Source: docs/ai-knowledge-bundle/prompts/new-module.md] New module prompt template (from 7-2)
- [Source: tools/create-hexalith-module/templates/module/] Scaffold template files (canonical patterns)
- [Source: modules/hexalith-tenants/] Reference module implementation
- [Source: apps/shell/src/modules/registry.ts] Shell module discovery via Vite glob
- [Source: .github/workflows/ci.yml] CI pipeline quality gates
- [Source: scripts/check-bundle-freshness.ts] Validation script pattern
- [Source: scripts/check-test-quality.ts] Test quality validation pattern
- [Source: scripts/scaffold-smoke-test.sh] Scaffold validation pattern
- [Source: scripts/check-peer-deps.sh] Peer dependency validation pattern
- [Source: _bmad-output/implementation-artifacts/7-1-machine-readable-knowledge-bundle.md] Story 7-1 learnings
- [Source: _bmad-output/implementation-artifacts/7-2-ai-prompt-templates.md] Story 7-2 context and patterns

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
