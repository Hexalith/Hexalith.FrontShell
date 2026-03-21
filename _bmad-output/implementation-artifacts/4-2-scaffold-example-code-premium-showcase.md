# Story 4.2: Scaffold Example Code — Premium Showcase

Status: ready-for-dev

## Story

As a module developer,
I want the scaffolded module to contain a premium-looking, working example with real CQRS hooks and UI components,
So that I see a beautiful, interactive page in the browser before writing any code — not a generic template.

## Acceptance Criteria

1. **AC1 — Example pages demonstrate full CQRS + UI integration.** Given the scaffold generates example code, when a developer inspects the generated pages, then:
   - `ExampleListPage.tsx` demonstrates `useQuery` with a `<Table>` component showing realistic sample data
   - `ExampleDetailPage.tsx` demonstrates `<DetailView>` with key-value sections and action buttons
   - A form page demonstrates `<Form>` with Zod schema validation and `useCommandPipeline` for submission
   - All pages handle loading (`<Skeleton>`), error (`<ErrorDisplay>`), and empty (`<EmptyState>`) states

2. **AC2 — Zod schemas with realistic validation.** Given the scaffold generates Zod schemas, when inspecting `src/schemas/`, then:
   - Example schemas define realistic domain types with proper validation rules
   - Types are inferred from schemas using `z.infer<typeof Schema>` (no manual type duplication)

3. **AC3 — Domain types within module boundary.** Given the scaffold generates domain types, when a developer inspects the module, then:
   - The module defines its own command shapes and projection view models in its boundary
   - Types match the pattern expected by `useCommandPipeline` and `useQuery`

4. **AC4 — Premium visual identity.** Given the scaffolded module runs in the dev host, when a developer opens the browser, then:
   - The page uses the project's distinctive design tokens (non-default typeface, warm neutral palette, indigo accent) — visually distinguishable from default MUI or Ant Design scaffolds
   - The example uses realistic domain data (names, dates, statuses) — not placeholder text
   - Token compliance scan passes at 100% on all scaffold-generated CSS
   - **(Manual validation gate):** the scaffold screenshot should pass the Slack test protocol defined in Story 3.9

5. **AC5 — Canonical page composition pattern.** The scaffold establishes the canonical page composition pattern (table list → detail → form → command) that future reference modules (including Tenants in Stories 6.3-6.4) SHOULD follow — the scaffold is the source of truth for this pattern.

6. **AC6 — Template compilation.** Given all template files are type-checked via `tsconfig.templates.json`, when the type-check runs, then all scaffold-generated `.ts` and `.tsx` files compile without errors against current `@hexalith/*` workspace package APIs.

*FRs covered: FR2, FR7*

## Tasks / Subtasks

- [ ] Task 1: Zod schemas and domain types (AC: #2, #3)
  - [ ] 1.1: Create `templates/module/src/schemas/exampleSchemas.ts` — define `ExampleItemSchema` (list view model with id, name, status, description, createdAt, updatedAt fields), `ExampleDetailSchema` (full detail model extending list with additional fields like notes, category, priority), `CreateExampleCommandSchema` (command input with name, description, category, priority validated fields). Use `z.infer<typeof Schema>` for all types. Include realistic Zod constraints: `.min()`, `.max()`, `.regex()`, `.optional()`, enum union types for status/priority

- [ ] Task 2: Example list page with useQuery + Table (AC: #1, #4)
  - [ ] 2.1: Create `templates/module/src/pages/ExampleListPage.tsx`:
    - Import `useQuery` from `@hexalith/cqrs-client` with `ExampleItemSchema` (array). Import `TableColumn` type from `@hexalith/ui`
    - Call `useQuery` with params: `{ domain: '__MODULE_NAME__', queryType: 'ExampleList' }` — add inline comment: `// Replace 'ExampleList' with your projection query type (e.g., 'OrderList') — check your backend's projection configuration for the correct name`
    - Define `columns: TableColumn<ExampleItem>[]` with realistic column definitions (name, status with badge styling, created date formatted, priority)
    - Render `<PageLayout title="__MODULE_DISPLAY_NAME__" actions={<Button variant="primary">Create New</Button>}>`
    - Handle loading: `<Skeleton variant="table" rows={5} />`
    - Handle error: `<ErrorDisplay error={error} title="Failed to load items" onRetry={refetch} />`
    - Handle empty: `<EmptyState title="No items yet" description="Create your first item to get started" action={{ label: "Create Item", onClick: handleCreate }} />`
    - Handle data: `<Table data={data} columns={columns} sorting pagination={{ pageSize: 10 }} globalSearch onRowClick={handleRowClick} caption="__MODULE_DISPLAY_NAME__ items" />`
    - Use `react-router-dom` `useNavigate` for row click navigation to detail page
  - [ ] 2.2: Create `templates/module/src/pages/ExampleListPage.module.css` — minimal styling using ONLY design token custom properties. Use `@layer components { }` wrapping. Status badge styles using `--color-status-*` tokens

- [ ] Task 3: Example detail page with DetailView (AC: #1, #4)
  - [ ] 3.1: Create `templates/module/src/pages/ExampleDetailPage.tsx`:
    - Import `useQuery` from `@hexalith/cqrs-client` with `ExampleDetailSchema`
    - Call `useQuery` with params: `{ domain: '__MODULE_NAME__', queryType: 'ExampleDetail', aggregateId: id }` — add inline comment: `// Replace 'ExampleDetail' with your projection query type — check your backend's projection configuration`
    - Use route param (`:id`) via `useParams` from `react-router-dom`
    - Render `<PageLayout title={data.name} subtitle="Item Details" actions={<Inline gap="sm"><Button variant="ghost">Edit</Button><Button variant="secondary">Delete</Button></Inline>}>`
    - Handle loading: `<Skeleton variant="detail" fields={6} />`
    - Handle error: `<ErrorDisplay error={error} title="Failed to load item" onRetry={refetch} />`
    - Handle data: `<DetailView sections={[...]} />` with at least 2 sections:
      - "General Information" (name, description, category, priority, status)
      - "Audit Trail" (created by, created at, updated at)
    - Back navigation button to list page

- [ ] Task 4: Example form page with Form + useCommandPipeline (AC: #1, #3, #4)
  - [ ] 4.1: Create `templates/module/src/pages/ExampleCreatePage.tsx`:
    - Import `useCommandPipeline` and `SubmitCommandInput` type from `@hexalith/cqrs-client`
    - Import `Form`, `FormField`, `Input`, `Select`, `TextArea`, `Button` from `@hexalith/ui`
    - Import `useToast` from `@hexalith/ui` for success/error notifications
    - Import `CreateExampleCommandSchema` from schemas
    - For aggregate ID generation: use `crypto.randomUUID()` (Node 19+ / all modern browsers). Do NOT add a `ulidx` dependency — `ulidx` is used internally by `@hexalith/cqrs-client` for correlation IDs, but modules should use standard `crypto.randomUUID()` for aggregate IDs
    - Use `useCommandPipeline` to send a `CreateExample` command:
      ```typescript
      const { send, status, error } = useCommandPipeline();
      // CQRS commands are async — you send a command to EventStore, then the hook
      // polls the backend for the result (accepted/rejected/timed out).
      // Status flow: idle → sending → polling → completed | rejected | failed | timedOut
      const handleSubmit = async (data: CreateExampleInput) => {
        await send({
          commandName: 'CreateExample', // Replace with your command name
          aggregateName: '__MODULE_NAME__', // Replace with your aggregate name
          aggregateId: crypto.randomUUID(),
          body: data,
        });
      };
      ```
    - Show command status feedback: idle → sending → polling → completed/rejected/failed
    - On success: use `useToast` from `@hexalith/ui` to show success toast, then navigate back to list
    - On error: show `<ErrorDisplay>` with the command error
    - Render `<PageLayout title="Create __MODULE_DISPLAY_NAME__">` wrapping `<Form schema={CreateExampleCommandSchema} onSubmit={handleSubmit}>`
    - Include `<FormField>` wrappers for: name (`<Input>`), description (`<TextArea>`), category (`<Select>` with options), priority (`<Select>` with options)
    - Form buttons: `<Button variant="ghost" type="reset">Cancel</Button>` + `<Button variant="primary" type="submit" disabled={status === 'sending' || status === 'polling'}>Create</Button>`

- [ ] Task 5: Route definitions and manifest update (AC: #1, #5)
  - [ ] 5.1: Update `templates/module/src/routes.tsx` — define routes for `ExampleListPage` (index route), `ExampleDetailPage` (`/:id`), and `ExampleCreatePage` (`/create`). Use `React.lazy()` for code-splitting each page
  - [ ] 5.2: Update `templates/module/src/manifest.ts` — update routes array with list/detail/create paths, update navigation with display name and icon

- [ ] Task 6: Module entry point and CSS (AC: #4)
  - [ ] 6.1: Update `templates/module/src/index.ts` — export manifest, route component, and re-export domain types from schemas
  - [ ] 6.2: Ensure all CSS in template files uses `@layer components { }` wrapping with design token custom properties exclusively — zero raw color/spacing/font values

- [ ] Task 7: Realistic sample data and template package.json update (AC: #4, #6)
  - [ ] 7.1: Create `templates/module/src/data/sampleData.ts` — realistic domain data arrays with proper dates, statuses, names (not "Test Item 1" or "Lorem Ipsum"). Use generic-but-professional domain vocabulary: project names, resource names, department names — NOT tenant-specific terms (the scaffold is domain-agnostic). Business-relevant statuses (Active/Inactive/Pending/Archived), dates spanning several months (ISO 8601), realistic descriptions. At least 8-12 items. This data is used by MockQueryBus responses in the dev host. Export query param constants (`EXAMPLE_LIST_QUERY = { domain: '__MODULE_NAME__', queryType: 'ExampleList' }`) so the dev host's MockQueryBus handler can match them
  - [ ] 7.2: Ensure sample data matches the Zod schemas exactly (type-safe, validated at import time)
  - [ ] 7.3: Update `templates/module/package.json` (from Story 4.1) — add `react-router-dom` as a peerDependency (version `^7.0.0` or matching shell's version). This is required because the example pages import `useNavigate` and `useParams` from `react-router-dom`. Verify the version matches what the shell app uses

- [ ] Task 8: Verification (AC: #1-#6)
  - [ ] 8.1: Verify all template files compile against `@hexalith/*` workspace packages via `tsconfig.templates.json` — the type-check must pass with current API surfaces (AC: #6)
  - [ ] 8.2: Verify the `Example` prefix naming convention is consistent: `ExampleListPage`, `ExampleDetailPage`, `ExampleCreatePage`, `ExampleItemSchema`, `ExampleDetailSchema`, `CreateExampleCommandSchema` — all must match the PascalCase-aware regex replacement pattern from Story 4.1 (`/\bExample(?=[A-Z])/g`)
  - [ ] 8.3: Verify no `@radix-ui/*` direct imports, no `oidc-client-ts`, no `ky`, no `@tanstack/*` direct imports in template code — only `@hexalith/*` packages
  - [ ] 8.4: Verify no inline styles (`style={{}}`) in any template component — CSS Modules only
  - [ ] 8.5: Verify all CSS files use only design token custom properties (e.g., `var(--color-*)`, `var(--spacing-*)`) — zero hard-coded colors, font sizes, or spacing values

## Dev Notes

### Scope Boundaries — What This Story IS and IS NOT

**This story creates the premium example pages, schemas, and sample data inside the scaffold template.** It builds on Story 4.1's CLI and template infrastructure. The generated code should be beautiful, realistic, and demonstrate the platform's core value proposition.

**This story IS:**
- Example page components (ExampleListPage, ExampleDetailPage, ExampleCreatePage)
- Zod schemas with realistic validation rules
- Sample data for mock query responses
- CSS Module files using design tokens
- Route definitions linking pages together

**This story is NOT:**
- MockShellProvider wiring in dev-host (Story 4.3 — the dev host renders these pages but the mock provider setup is 4.3's scope)
- Pre-built test fixtures or passing tests (Story 4.4 — tests come after the example code exists)
- Full typed manifest contract (Story 4.5 — expands the manifest schema beyond what 4.2 needs)
- Documentation (Story 4.6)

### Architecture Constraints — MUST Follow

**Priority guide:** Constraints marked **(CRITICAL)** are story-specific — violating them fails review. Others are project conventions that must be followed but are less likely to cause story-specific failures.

1. **(CRITICAL) Templates are REAL TypeScript files.** All files in `tools/create-hexalith-module/templates/module/` must compile against current `@hexalith/*` packages. They are type-checked via `tsconfig.templates.json` (from Story 4.1). Do NOT use template literals or EJS syntax — use the `Example` prefix naming convention and `__PLACEHOLDER__` tokens only. [Source: architecture.md#Key Structural Decisions]

2. **No barrel exports in sub-folders.** Only `src/index.ts` is a barrel. Sub-folders (`schemas/`, `pages/`, `components/`, `hooks/`, `data/`) must NOT have `index.ts` files. Import directly: `import { ExampleItemSchema } from '../schemas/exampleSchemas'`. [Source: architecture.md#Barrel Export Clarification]

3. **CSS Modules + @layer + design tokens exclusively.** All component styles use `ComponentName.module.css` with `@layer components { }` wrapping. Every visual value must reference design token custom properties. No inline styles (`style={{}}`), no CSS-in-JS, no raw color/spacing values. [Source: architecture.md#CSS Architecture]

4. **ESM-only, TypeScript strict mode.** All generated code must be valid ESM. No CommonJS. TypeScript `strict: true` inherited from `@hexalith/tsconfig/base.json`. No `any` types. [Source: root tsconfig]

5. **(CRITICAL) Module boundary enforcement.** Template code may only import from: `react`, `react-dom`, `react-router-dom` (for `useNavigate`, `useParams`, route components), `zod`, `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`. Blocked: `@radix-ui/*`, `oidc-client-ts`, `ky`, `@tanstack/react-query`, `@tanstack/react-table`, `styled-components`, `@emotion/*`. [Source: packages/eslint-config/module-boundaries.js]

6. **(CRITICAL) Example prefix naming convention.** All code identifiers use `Example` prefix: `ExampleListPage`, `ExampleDetailPage`, `ExampleCreatePage`, `ExampleItemSchema`, `ExampleDetailSchema`, `CreateExampleCommandSchema`, `ExampleItem`, `ExampleDetail`, `CreateExampleInput`. The prefix must always be followed by an uppercase letter to match the regex `/\bExample(?=[A-Z])/g`. Do NOT use `Example` standalone or followed by lowercase. [Source: Story 4.1 Task 5.5]

7. **Import order convention.** React first, external libraries, `@hexalith/*` packages, relative imports, CSS Modules last. No blank lines within groups, one blank line between groups. [Source: ESLint config]

8. **File names keep `Example` prefix — this is intentional.** Story 4.1's scaffold engine replaces `Example` in file *content* only (via PascalCase regex), NOT in file names. So `ExampleListPage.tsx` stays as `ExampleListPage.tsx` in the scaffolded output, but internal identifiers like `ExampleListPage` component name become `MyOrdersListPage`. The CSS Module import `'./ExampleListPage.module.css'` also stays unchanged since it's a string literal, not a PascalCase identifier. This is correct — developers rename files manually if desired. [Source: Story 4.1 Task 5.5]

9. **(CRITICAL) Example pages are teaching artifacts — include strategic inline comments.** Each page component should include brief inline comments explaining *why* (not *what*) at key CQRS integration points. Examples: `// useQuery validates the response against the Zod schema at runtime`, `// CQRS commands are async — the hook polls the backend for the command result (accepted/rejected)`, `// Replace 'ExampleList' with your projection query type (e.g., 'OrderList')`. These comments help developers understand the platform patterns, not just copy code. Keep comments sparse and high-value — do NOT over-comment obvious React patterns.

### Existing Codebase Context — MUST Reference

**@hexalith/cqrs-client hook signatures (actual API from codebase):**

```typescript
// Query hook — use this for projections (NOT useProjection)
useQuery<T>(schema: ZodSchema<T>, params: {
  domain: string,
  queryType: string,
  aggregateId?: string,
  entityId?: string,
}, options?: {
  enabled?: boolean,
  refetchInterval?: number,
  refetchOnWindowFocus?: boolean,
}) → { data: T | undefined, isLoading: boolean, error: HexalithError | null, refetch: () => void }

// Command pipeline hook — use this for commands (NOT useCommand)
useCommandPipeline() → {
  send: (command: SubmitCommandInput) => Promise<void>,
  status: 'idle' | 'sending' | 'polling' | 'completed' | 'rejected' | 'failed' | 'timedOut',
  error: HexalithError | null,
  correlationId: string | null,
  replay: (() => Promise<void>) | null,
}
```

**CRITICAL hook name mapping:**
- Epics file says `useProjection` → actual codebase export is `useQuery` (accepts Zod schema)
- Epics file says `useCommand` → actual codebase export is `useCommandPipeline` (three-phase lifecycle)
- The scaffold MUST use `useQuery` and `useCommandPipeline` — these are the real exported names

**Key type imports from `@hexalith/cqrs-client`:**
- `SubmitCommandInput` — the input shape for `useCommandPipeline().send()`. Import it for type annotations on the command payload
- `HexalithError` — base error type returned by `error` fields in hooks
- `CommandStatus`, `PipelineStatus` — status literal union types

**Key type imports from `@hexalith/ui`:**
- `TableColumn<T>` — column definition type for `<Table>` component. Import: `import type { TableColumn } from '@hexalith/ui'`

**@hexalith/ui component signatures (actual exports):**

| Component | Key Props |
|-----------|-----------|
| `PageLayout` | `title`, `subtitle`, `actions`, `children`, `className` |
| `Table` | `data`, `columns`, `sorting`, `pagination`, `globalSearch`, `onRowClick`, `caption` |
| `DetailView` | `sections` (array of `{title, fields}`), `actions`, `density`, `loading` |
| `Form` | `schema` (Zod), `onSubmit`, `density`, `children` (FormField + Button) |
| `FormField` | `name`, `children` (Input/Select/TextArea) |
| `Input` | `label`, `placeholder`, `required`, `disabled` |
| `Select` | `label`, `options`, `placeholder`, `required` |
| `TextArea` | `label`, `placeholder`, `required`, `rows` |
| `Button` | `variant` ('primary'/'secondary'/'ghost'), `size`, `type`, `disabled` |
| `Skeleton` | `variant` ('table'/'form'/'detail'/'card'), `rows`/`fields`, `isReady` |
| `EmptyState` | `title`, `description`, `action` (`{label, onClick}`), `illustration` |
| `ErrorDisplay` | `error` (string/Error), `title`, `onRetry` |
| `ErrorBoundary` | `fallback`, `onError`, `children` |
| `Stack` | `gap` ('xs'/'sm'/'md'/'lg'/'xl'), `justify`, `align` |
| `Inline` | `gap`, `justify`, `align` |

**@hexalith/shell-api testing:**
- `MockShellProvider` — wraps children with all mock providers
- `createMockAuthContext()`, `createMockTenantContext()`, `createMockConnectionHealthContext()`, `createMockFormDirtyContext()`

**Mock implementations from @hexalith/cqrs-client:**
- `MockCommandBus` — implements `ICommandBus`
- `MockQueryBus` — implements `IQueryBus`
- `MockSignalRHub` — implements SignalR hub interface

### Design Token Reference

**Key CSS custom properties for scaffold styling:**

```css
/* Colors */
--color-text-primary       /* Main text */
--color-text-secondary     /* Supporting text */
--color-text-tertiary      /* Muted text */
--color-surface-primary    /* Page background */
--color-surface-secondary  /* Card/section background */
--color-surface-elevated   /* Elevated surfaces (modals, dropdowns) */
--color-accent             /* Indigo accent for interactive elements */
--color-accent-hover       /* Accent hover state */
--color-border-default     /* Default border */
--color-status-success     /* Green for active/success */
--color-status-warning     /* Amber for pending/warning */
--color-status-danger      /* Red for error/danger */

/* Spacing (4px base grid) */
--spacing-xs, --spacing-sm, --spacing-md, --spacing-lg, --spacing-xl

/* Typography */
--font-family-body         /* Primary typeface */
--font-size-sm, --font-size-base, --font-size-lg, --font-size-xl
--font-weight-normal, --font-weight-medium, --font-weight-semibold

/* Radius */
--radius-sm, --radius-md, --radius-lg

/* Motion */
--transition-fast          /* ≤200ms for micro-interactions */
```

### Sample Data Guidelines

Sample data must be **realistic and domain-agnostic** (the scaffold is not tied to any specific domain):
- Use generic-but-professional entity names: project names ("Project Atlas", "Operation Horizon"), resource names ("Northern Distribution Hub"), department names — NOT tenant-specific terms like "Contoso" which imply a specific domain
- Use realistic statuses: `Active`, `Inactive`, `Pending`, `Archived`
- Use date strings spanning several months (ISO 8601 format)
- Include a mix of data states: some items active, some pending, some archived
- At least 8-12 sample items for a convincing table view
- Data must validate against the Zod schemas
- Export query param constants alongside data so MockQueryBus (Story 4.3) can match on the same `{ domain, queryType }` values the pages use

### Critical Anti-Patterns to Prevent

1. **Do NOT use spinners or loading indicators.** Use `<Skeleton>` components with appropriate `variant` prop (table, form, detail).
2. **Do NOT use `enum`.** Use union types (e.g., `'active' | 'inactive' | 'pending'`).
3. **Do NOT use `Date` objects in render paths.** Format ISO strings with `Intl.DateTimeFormat` or simple string formatting.
4. **Do NOT use `any` type.** Leverage Zod `z.infer<>` for all data types.
5. **Do NOT import `@radix-ui/*` directly.** Use `@hexalith/ui` components which wrap Radix internally.
6. **Do NOT use inline styles (`style={{}}`)** — CSS Modules only (see Constraint #3).

### Canonical Page Composition Pattern (Source of Truth)

The scaffold **establishes** the canonical page composition pattern that all future modules (including the Tenants reference module in Epic 6) SHOULD follow:
1. **List page** — Table with sorting, pagination, global search, row click to detail
2. **Detail page** — DetailView with sections, action buttons (edit, delete), back navigation
3. **Create page** — Form with Zod validation, command submission via `useCommandPipeline`, success/error feedback

The scaffold is the source of truth for this pattern. If the Tenants reference module later needs to diverge, that divergence must be justified and documented — not silently introduced.

**Expected demo flow (the developer's first 5-minute experience):**
List page auto-loads with realistic data in Table → developer clicks a row → detail page loads with DetailView sections → developer clicks "Back" → list page → developer clicks "Create New" → form page with validated inputs → developer fills form and submits → `useCommandPipeline` shows sending → polling → completed → toast notification → navigates back to list. This full loop demonstrates the complete CQRS read-write cycle.

### Git Intelligence — Established Patterns

Epic 3 (Component Library) is complete. Patterns confirmed from recent commits:
- Components follow `Component.tsx` + `Component.module.css` + `Component.test.tsx` + `Component.stories.tsx` co-located pattern
- All CSS uses `@layer components { }` wrapping with design token custom properties
- Tests: `@testing-library/react` + `vitest` (`.test.tsx`), Playwright CT (`.spec.tsx`)
- Radix primitives wrapped with own types (never re-exported directly)
- `tsup` ESM + DTS builds, flat config `eslint.config.js`

### Previous Story Intelligence (Story 4.1)

Story 4.1 (`4-1-create-hexalith-module-cli`) is currently `in-progress` and establishes:
- CLI entry point at `tools/create-hexalith-module/src/index.ts`
- Scaffold engine at `tools/create-hexalith-module/src/scaffold.ts`
- Template files in `tools/create-hexalith-module/templates/module/`
- Two-tier string replacement: `__PLACEHOLDER__` tokens for strings + `Example` prefix regex for code identifiers
- Version injection from monorepo into generated `package.json`
- Template type-checking via `tsconfig.templates.json`
- `pnpm create-module <name>` workspace script

**Key decisions from 4.1 that affect 4.2:**
- Template files must be real TypeScript that compiles in the monorepo
- `Example` prefix must always be followed by uppercase (regex: `/\bExample(?=[A-Z])/g`)
- Sub-folder structure: `src/schemas/`, `src/pages/`, `src/components/`, `src/hooks/`, `src/data/` — created as `.gitkeep` placeholders in 4.1, populated with real files in 4.2
- No barrel exports in sub-folders (only `src/index.ts`)
- `.stylelintrc.json` extends workspace config — already present from 4.1

**Dependency from 4.1:** Story 4.2 writes files INTO the template structure created by 4.1. If 4.1's scaffold engine or template directory layout changes, 4.2 must adapt.

**PRE-FLIGHT CHECK (do this before starting implementation):** Run `ls tools/create-hexalith-module/templates/module/src/` to verify the directory structure from Story 4.1 is in place. Expected: `schemas/`, `pages/`, `components/`, `hooks/` directories (with `.gitkeep` files), plus `index.ts`, `manifest.ts`, `routes.tsx`. If missing, Story 4.1 must be completed first.

### Project Structure Notes

- All new files go in `tools/create-hexalith-module/templates/module/src/`
- The `templates/module/` directory is the scaffold blueprint — files here are copied verbatim (with placeholder replacement) to the generated module
- Template files must compile against `@hexalith/*` packages resolved from the workspace
- The `tsconfig.templates.json` (from Story 4.1) handles type-checking
- CSS files should be in the same directory as their component (co-located pattern)

### References

- [Source: epics.md#Story 4.2] — Full acceptance criteria and FRs
- [Source: architecture.md#Key Structural Decisions] — Templates are real TypeScript, standalone git repos
- [Source: architecture.md#Naming Patterns] — File/code naming conventions
- [Source: architecture.md#CSS Architecture] — @layer, CSS Modules, token-only values
- [Source: architecture.md#Barrel Export Clarification] — No sub-folder barrels
- [Source: architecture.md#Module Internal Organization] — Standalone module directory structure
- [Source: prd.md#Module Development FRs] — FR2 (run scaffolded module immediately), FR7 (own domain types)
- [Source: prd.md#Developer Platform Specific Requirements] — Premium scaffold expectations
- [Source: ux-design-specification.md] — Design token system, premium visual identity, warm neutral palette
- [Source: Story 4.1 — 4-1-create-hexalith-module-cli.md] — CLI scaffold engine, template structure, placeholder conventions
- [Source: packages/cqrs-client/src/] — Actual hook exports: useQuery, useCommandPipeline, useSubmitCommand, useCommandStatus
- [Source: packages/ui/src/] — All component exports: Table, DetailView, Form, PageLayout, Skeleton, EmptyState, ErrorDisplay, etc.
- [Source: packages/shell-api/src/] — MockShellProvider, provider hooks, manifest types

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
