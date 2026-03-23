# Story 6.4: Tenants Reference Module — UI & Shell Integration

Status: ready-for-dev

## Story

As an end user (Elena),
I want to manage tenants through the shell — list, view details, create, edit, and disable,
So that the complete platform stack is validated end-to-end with a real module.

## Acceptance Criteria

1. **AC1 — Shell Integration (Build-Time Discovery)**
   - **Given** the Tenants module is in `modules/hexalith-tenants/` (created by story 6-3)
   - **When** the shell builds (`pnpm turbo build`)
   - **Then** the Tenants manifest is discovered via `import.meta.glob("../../../../modules/*/src/manifest.ts")` in `apps/shell/src/modules/registry.ts`
   - **And** routes are registered under `/{manifest.name}/*` — the basePath is `tenants` (from `manifest.name`), NOT `hexalith-tenants`
   - **And** Tenants routes resolve to: `/tenants/`, `/tenants/detail/:id`, `/tenants/create`, `/tenants/edit/:id`
   - **And** Tenants appears in the sidebar under the "Administration" category group (from manifest.navigation)

   *Note: The epic's "Given Elena creates a new tenant" AC (create form, Zod validation, command submission, toast) is implemented by story 6-3's TenantCreatePage. This story (6-4) validates it works in the shell via E2E tests but does not re-implement it.*

2. **AC2 — Tenant List Page (Table)**
   - **Given** Elena navigates to the Tenants module
   - **When** the tenant list page loads
   - **Then** a `<Table>` displays tenants with sorting, filtering, and pagination (pageSize: 10)
   - **And** the table uses Linear-inspired compact density
   - **And** row click navigates to the tenant detail view
   - **And** empty state shows: "No tenants yet. Create your first tenant."

3. **AC3 — Tenant Detail Page (Edit & Disable Actions)**
   - **Given** Elena views a tenant detail page
   - **When** the detail page renders
   - **Then** `<DetailView>` shows tenant information in sections with key-value pairs
   - **And** action buttons (Edit, Disable) are available in the page header
   - **And** Edit navigates to `/tenants/edit/:id`
   - **And** Disable opens a `<Modal>` confirmation dialog requiring a reason
   - **And** the URL is deep-linkable: `/tenants/detail/{id}`

4. **AC4 — Tenant Edit Page**
   - **Given** Elena edits a tenant
   - **When** the edit form is submitted
   - **Then** `<Form>` validates input via `UpdateTenantCommandSchema` with field-level errors
   - **And** `useCommandPipeline` sends the update command
   - **And** feedback toast confirms success or shows rejection error
   - **And** on success, navigates back to detail page

5. **AC5 — Tenant Disable Flow**
   - **Given** Elena disables a tenant
   - **When** she clicks "Disable" on the detail page
   - **Then** a `<Modal>` opens with a reason field using `DisableTenantCommandSchema`
   - **And** on confirmation, `useCommandPipeline` sends the disable command
   - **And** feedback toast confirms success or shows rejection error
   - **And** on success, detail page refreshes showing "Disabled" status

6. **AC6 — Full @hexalith/ui Component Coverage**
   - **Given** the Tenants module exercises all @hexalith/ui components
   - **When** reviewing the module
   - **Then** it uses: `<Table>`, `<Form>`, `<FormField>`, `<DetailView>`, `<PageLayout>`, `<Stack>`, `<Button>`, `<Input>`, `<Select>`, `<TextArea>`, `<Skeleton>`, `<EmptyState>`, `<ErrorDisplay>`, `<Toast>`, `<Modal>`
   - **And** all components render correctly in both light and dark themes

7. **AC7 — E2E Tests**
   - **Given** E2E tests are created in `apps/shell/e2e/`
   - **When** Playwright E2E tests (`.spec.ts`) run against the shell with Tenants module
   - **Then** at least the following user flows are covered:
     1. Navigate to tenant list → see table → click row → see detail → navigate back
     2. Create tenant → form validation → submit → see confirmation toast → redirect to list
     3. Switch tenant via status bar → table data refreshes for new tenant
     4. Module error recovery → trigger error → see error boundary → retry → module recovers
   - **And** E2E tests include axe-core accessibility checks on key pages
   - **And** E2E tests run in CI as part of the main pipeline

8. **AC8 — End-to-End Stack Validation**
   - **Given** all stories in Epic 6 are complete
   - **When** the Tenants module is the validation artifact
   - **Then** the following is proven working: monorepo build, design tokens, shell-api providers, cqrs-client hooks, @hexalith/ui components, CLI scaffold (Tenants matches scaffold patterns), module discovery, unified navigation, error isolation, state preservation, CI quality gates

## Tasks / Subtasks

- [ ] **Task 1: Add TenantEditPage** (AC: #4, #6)
  - [ ] 1.1 Create `modules/hexalith-tenants/src/pages/TenantEditPage.tsx`:
    - Use `useParams<{ id: string }>()` to extract tenant ID
    - Use `useQuery(TenantDetailSchema, buildTenantDetailQuery(id), { enabled: !!id })` to load current data for pre-fill
    - Use `useCommandPipeline()` for command submission
    - Render `<PageLayout>` with title "Edit Tenant"
    - Render `<Form>` with `UpdateTenantCommandSchema` for validation
    - **Pre-fill via `defaultValues`:** `<Form>` wraps React Hook Form internally and may accept a `defaultValues` prop. Verify at implementation time by checking `FormProps` in `@hexalith/ui`. If `defaultValues` is NOT exposed or does not work (form renders empty), use the RHF `reset()` fallback pattern:
      ```typescript
      // Fallback: reset form when data FIRST loads (not on every re-render)
      const formRef = useRef<{ reset: (values: UpdateTenantInput) => void }>(null);
      const hasInitialized = useRef(false);
      useEffect(() => {
        if (data && formRef.current && !hasInitialized.current) {
          formRef.current.reset({ name: data.name, description: data.description, contactEmail: data.contactEmail });
          hasInitialized.current = true;
        }
      }, [data]);
      // CRITICAL: Guard with hasInitialized to prevent overwriting user edits
      // if useQuery re-fetches (e.g., window refocus, SignalR push).
      // If <Form> exposes a ref or provides useFormContext, use that to call reset()
      ```
      The scaffold template's `ExampleCreatePage` does NOT use `defaultValues` (it creates new records), so check `Form.tsx` source for the actual prop interface.
    - Fields: name (`<Input>`), description (`<TextArea>`), contactEmail (`<Input>`)
    - Pre-fill form fields from loaded tenant data
    - Submit handler:
      ```typescript
      await send({
        domain: 'Tenants',
        commandType: 'UpdateTenant',
        aggregateId: id,
        payload: formData,
      });
      ```
    - On `completed`: show success toast, navigate to detail page (`../detail/${id}`)
    - On `rejected`: show `CommandRejectedError` inline via `<ErrorDisplay>`
    - On `failed`/`timedOut`: show error with retry via `replay()`
    - Cancel button navigates back without submitting — use `navigate('..')` (NOT `navigate(-1)`). `navigate(-1)` is fragile when users deep-link directly to the edit page (it exits the app instead of going to the list). `navigate('..')` reliably goes to the module root (list page).
    - **Missing ID guard:** If `!id` (user navigates to `/tenants/edit/` with no ID param), render `<ErrorDisplay error={{ message: 'Tenant not found' }} />` immediately. Do NOT show `<Skeleton>` forever — `useQuery` with `enabled: false` never resolves, leaving the user stuck on a permanent loading state.
    - Loading state: `<Skeleton variant="detail" />` while initial data loads (only when `id` is present)
    - Error state: `<ErrorDisplay error={error} onRetry={refetch} />` if initial data fetch fails
  - [ ] 1.2 Create `modules/hexalith-tenants/src/pages/TenantEditPage.test.tsx`:
    - Test loading state renders Skeleton while data loads
    - Test form pre-fills with existing tenant data
    - Test form validation (empty name triggers error)
    - Test successful update command submission
    - Test rejected command shows error
    - Test cancel navigates back
    - Configure `MockQueryBus` with detail data and `MockCommandBus` for update behaviors

- [ ] **Task 2: Add Edit & Disable buttons to TenantDetailPage** (AC: #3, #5, #6)
  - [ ] 2.1 Modify `modules/hexalith-tenants/src/pages/TenantDetailPage.tsx`:
    - **FIRST:** Read the existing file created by story 6-3. The code snippets below show ADDITIONS to the page — do not blindly copy-paste. Understand the existing component structure (imports, hooks, JSX layout) and integrate the new functionality into it.
    - Add Edit button navigating to `/tenants/edit/${id}` (use `navigate(`../edit/${id}`)`)
    - Add Disable button that opens a confirmation Modal
    - Use `<Stack direction="horizontal" gap="sm">` to lay out action buttons (Back, Edit, Disable)
    - Import `Modal`, `Button`, `Stack`, `Form`, `FormField`, `Input` from `@hexalith/ui`
    - Use `useCommandPipeline()` for the disable command
    - **CRITICAL:** Modal uses `onClose` prop (NOT `onOpenChange`). The `ModalProps` interface is: `{ open: boolean; onClose: () => void; title?: string; children: ReactNode }`
    - Disable button opens `<Modal>`:
      ```tsx
      <Modal
        open={isDisableModalOpen}
        onClose={() => setIsDisableModalOpen(false)}
        title="Disable Tenant"
      >
        <Form schema={DisableTenantCommandSchema} onSubmit={handleDisable}>
          <FormField name="reason">
            <Input placeholder="Reason for disabling" />
          </FormField>
          <Stack direction="horizontal" gap="sm">
            <Button type="submit" variant="destructive" disabled={disableStatus === 'sending' || disableStatus === 'polling'}>
              {disableStatus === 'sending' || disableStatus === 'polling' ? 'Disabling...' : 'Confirm Disable'}
            </Button>
            <Button variant="ghost" onClick={() => setIsDisableModalOpen(false)}>Cancel</Button>
          </Stack>
        </Form>
      </Modal>
      ```
    - **UX pattern — optimistic modal close:** Close the modal immediately on submit (don't leave Elena staring at a frozen modal during command in-flight). Use toasts for async feedback:
      - On submit: close modal, show info toast "Disabling tenant..."
      - On `completed`: show success toast "Tenant disabled", call `refetch()` to refresh detail data
      - On `rejected`: show error toast "Failed to disable: {error.message}" — user can re-open modal to retry
      - On `failed`/`timedOut`: show error toast with retry guidance
    - Do NOT show Disable button if tenant status is already "Disabled"
  - [ ] 2.2 Update `modules/hexalith-tenants/src/pages/TenantDetailPage.test.tsx`:
    - Test Edit button navigates to edit page
    - Test Disable button opens Modal
    - Test disable form submit closes modal immediately (optimistic close) and triggers command
    - Test success toast appears after command completes
    - Test error toast appears on command rejection
    - Test Disable button hidden when status is "Disabled"
    - Test Modal cancel closes without action

- [ ] **Task 3: Update manifest and routes for edit page** (AC: #1, #3, #4)
  - [ ] 3.1 Update `modules/hexalith-tenants/src/manifest.ts`:
    - Add route: `{ path: "/edit/:id" }`
  - [ ] 3.2 Update `modules/hexalith-tenants/src/routes.tsx`:
    - Add lazy import for `TenantEditPage`
    - Add route entry: `{ path: "/edit/:id", element: <Suspense fallback={<Skeleton />}><TenantEditPage /></Suspense> }`
  - [ ] 3.3 Update `modules/hexalith-tenants/src/index.ts`:
    - Add type export: `UpdateTenantInput`, `DisableTenantInput` (if not already exported by 6-3)
  - [ ] 3.4 **Checkpoint:** Run `pnpm turbo build --filter=@hexalith/tenants` — verify clean compilation with new route. Run `pnpm turbo test --filter=@hexalith/tenants` — verify all existing + new tests pass.

- [ ] **Task 4: Verify shell integration** (AC: #1, #8)
  - [ ] 4.0 **PRE-CHECK (before any other task in 6-4):** Verify story 6-3 output matches 6-4's assumptions:
    - Confirm module directory is `modules/hexalith-tenants/` (architecture doc says `modules/tenants/` — if 6-3 used the shorter name, update ALL file paths in this story)
    - Confirm `manifest.name` is `"tenants"` (NOT `"hexalith-tenants"`). Open `modules/hexalith-tenants/src/manifest.ts` and check. The basePath in the shell derives from `manifest.name` — if it says `"hexalith-tenants"`, all routes (`/tenants/...`) and E2E URLs are wrong.
    - If either differs from expectations, update this story's paths and routes before proceeding with Tasks 1-3.
  - [ ] 4.1 Run `pnpm turbo build` (full workspace) — verify:
    - The shell discovers the Tenants manifest at build time
    - `apps/shell/src/build/manifestValidationPlugin.ts` validates the manifest
    - No build errors from the Tenants module
  - [ ] 4.2 Run `pnpm turbo lint` (full workspace) — verify:
    - No module boundary violations (ESLint module isolation rules pass)
    - No cross-module imports
    - No `@radix-ui/*` direct imports from the module
  - [ ] 4.3 Run `pnpm turbo test` (full workspace) — verify:
    - All existing tests pass (no regressions)
    - Tenants module tests pass
    - Coverage meets thresholds (≥ 80% module, ≥ 95% foundation)
  - [ ] 4.4 Verify sidebar integration by inspecting `navigationBuilder.ts` output:
    - Tenants navigation item exists with label "Tenants", path "/tenants", category "Administration"

- [ ] **Task 5: Set up E2E test infrastructure** (AC: #7)
  - [ ] 5.1 Add Playwright and axe-core dependencies to `apps/shell/package.json`:
    ```json
    "devDependencies": {
      "@playwright/test": "^1.50.0",
      "@axe-core/playwright": "^4.10.0"
    }
    ```
  - [ ] 5.2 Add `test:e2e` script to `apps/shell/package.json`:
    ```json
    "test:e2e": "playwright test --config=e2e/playwright.config.ts"
    ```
  - [ ] 5.3 Create `apps/shell/e2e/playwright.config.ts`:
    - Base URL: `http://localhost:4173`
    - Web server: `pnpm vite build --config vite.config.e2e.ts && pnpm vite preview --config vite.config.e2e.ts` — builds the E2E shell then serves from `dist/`. Same command works locally and in CI. No dual-config complexity.
    - Test directory: `.` (relative to e2e/)
    - Use Chromium only for MVP
    - Global setup: none (auth bypassed via provider alias swap — see Task 5.4)
    - Timeout: 30s per test
    - **Local dev tip:** The `webServer` command rebuilds on every `playwright test` run. For faster iteration when writing E2E tests, pre-build once (`pnpm vite build --config vite.config.e2e.ts`), then run `pnpm vite preview --config vite.config.e2e.ts` in one terminal and `playwright test --config=e2e/playwright.config.ts` in another. Only re-build when source code changes.
  - [ ] 5.4 Create E2E test mode for the shell:
    - The shell uses OIDC for authentication. For E2E tests, we need to bypass auth.
    - **CRITICAL: Use Vite alias swap, NOT runtime conditional.** A runtime `if (import.meta.env.VITE_E2E_MODE)` check will leak mock dependencies into the production bundle because Vite's tree-shaking cannot eliminate runtime branches. Instead:
      - Create `apps/shell/src/providers/ShellProviders.tsx` (production — real OIDC providers)
      - Create `apps/shell/src/providers/ShellProviders.e2e.tsx` (E2E — uses `MockShellProvider` + `MockQueryBus`/`MockCommandBus`/`MockSignalRHub` with seeded tenant data)
        - **CRITICAL:** Must pass `signalRHub={new MockSignalRHub()}` to `CqrsProvider`. Omitting it causes `useConnectionState` to throw, crashing the shell on load and breaking ALL E2E tests. This is the same requirement documented in story 6-3's `renderWithProviders.tsx` — the E2E provider must replicate the full provider stack:
          ```typescript
          const mockSignalRHub = new MockSignalRHub();
          <MockShellProvider>
            <CqrsProvider
              commandApiBaseUrl="http://localhost:mock"
              tokenGetter={async () => "e2e-token"}
              signalRHub={mockSignalRHub}
              queryBus={queryBus}
              commandBus={commandBus}
            >
              <ToastProvider>
                {children}
              </ToastProvider>
            </CqrsProvider>
          </MockShellProvider>
          ```
      - Create `apps/shell/vite.config.e2e.ts` that extends the main `vite.config.ts` and adds a `resolve.alias`:
        ```typescript
        // apps/shell/vite.config.e2e.ts
        import { defineConfig, mergeConfig } from 'vite';
        import baseConfig from './vite.config';
        import path from 'node:path';

        export default mergeConfig(baseConfig, defineConfig({
          resolve: {
            alias: {
              // Swap production providers with E2E mock providers
              [path.resolve(__dirname, 'src/providers/ShellProviders')]:
                path.resolve(__dirname, 'src/providers/ShellProviders.e2e'),
            },
          },
        }));
        ```
        The alias key must be an **absolute path** (not a module specifier) because the import in the shell app is a relative path (`./providers/ShellProviders`). Vite resolves aliases by matching the resolved file path, so `path.resolve` is required.
      - In `apps/shell/e2e/playwright.config.ts`, set the web server command to use the E2E vite config: `pnpm vite --config vite.config.e2e.ts`
    - This ensures mock code is NEVER included in production builds — no flag to forget, no runtime branch to leak.
    - **Mock data seeding for E2E:** In `ShellProviders.e2e.tsx`, configure `MockQueryBus` with sample tenant data. **DO NOT import from `modules/hexalith-tenants/src/data/sampleData.ts`** — this creates a hard shell→module dependency that breaks builds when the module isn't present (e.g., fresh clone without submodules). Instead, define a small set of inline mock tenant data directly in the E2E provider file (3-5 tenants with mixed statuses). This keeps the shell self-contained for E2E builds.
    - **LIMITATION:** These E2E tests validate UI integration (routing, component rendering, navigation, accessibility) against mock data. They do NOT validate real API calls, real OIDC auth, or real backend responses. True end-to-end backend integration testing requires a running Hexalith backend and is out of scope for this story.
  - [ ] 5.5 Create `apps/shell/e2e/fixtures/test-fixtures.ts`:
    - Re-export `test` and `expect` from `@playwright/test`
    - Configure axe-core helper targeting WCAG 2.x Level AA (per architecture.md):
      ```typescript
      import AxeBuilder from '@axe-core/playwright';
      import type { Page } from '@playwright/test';
      import { expect } from '@playwright/test';

      export async function checkAccessibility(page: Page) {
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();
        expect(results.violations).toEqual([]);
      }
      ```
  - [ ] 5.6 Run `pnpm install` to install Playwright deps. Run `npx playwright install chromium` to download browser.

- [ ] **Task 6: Write E2E test specs** (AC: #7)
  - [ ] 6.1 Create `apps/shell/e2e/tenants-navigation.spec.ts`:
    ```typescript
    // Flow 1: Navigate to tenant list → see table → click row → see detail → navigate back
    test('tenant list and detail navigation', async ({ page }) => {
      await page.goto('/tenants');
      // Verify table renders with tenant data
      await expect(page.getByRole('table')).toBeVisible();
      // Click a known tenant row (use name from E2E mock data, not nth() which is fragile)
      await page.getByRole('row').filter({ hasText: /Acme/ }).click();
      // Verify detail page
      await expect(page).toHaveURL(/\/tenants\/detail\//);
      await expect(page.getByText('General Information')).toBeVisible();
      // Navigate back
      await page.getByRole('button', { name: /back/i }).click();
      await expect(page).toHaveURL('/tenants');
      // Accessibility check
      await checkAccessibility(page);
    });
    ```
  - [ ] 6.2 Create `apps/shell/e2e/tenants-create.spec.ts`:
    ```typescript
    // Flow 2: Create tenant → form validation → submit → toast → redirect
    test('create tenant flow', async ({ page }) => {
      await page.goto('/tenants');
      await page.getByRole('button', { name: /create/i }).click();
      await expect(page).toHaveURL('/tenants/create');
      // Submit empty form — validation errors
      await page.getByRole('button', { name: /create tenant/i }).click();
      await expect(page.getByText(/required/i)).toBeVisible();
      // Fill form
      await page.getByPlaceholder('Tenant name').fill('Test Corp');
      await page.getByPlaceholder('tenant-code').fill('test-corp');
      await page.getByRole('button', { name: /create tenant/i }).click();
      // Verify toast
      await expect(page.getByText(/tenant created/i)).toBeVisible();
      // Verify redirect to list
      await expect(page).toHaveURL('/tenants');
      // NOTE: Do NOT assert that the new tenant appears in the list.
      // MockCommandBus does not auto-update MockQueryBus responses —
      // the list still shows pre-seeded data. Verifying toast + redirect
      // is sufficient for the E2E mock context.
      // Accessibility check
      await checkAccessibility(page);
    });
    ```
  - [ ] 6.3 Create `apps/shell/e2e/tenants-switching.spec.ts`:
    ```typescript
    // Flow 3: Switch tenant → table refreshes
    test('tenant switching refreshes data', async ({ page }) => {
      await page.goto('/tenants');
      await expect(page.getByRole('table')).toBeVisible();
      // Switch tenant via status bar
      // (implementation depends on status bar UI — locate tenant switcher)
      // Verify table data changes after switch
    });
    ```
  - [ ] 6.4 Create `apps/shell/e2e/tenants-error-recovery.spec.ts`:
    ```typescript
    // Flow 4: Module error → error boundary → retry → recover
    test('module error recovery', async ({ page }) => {
      // Navigate to a bad route or trigger error condition
      await page.goto('/tenants/detail/nonexistent-id');
      // Verify error boundary renders
      await expect(page.getByText(/error|something went wrong/i)).toBeVisible();
      // Click retry
      await page.getByRole('button', { name: /retry/i }).click();
      // Verify recovery (at least renders without crash)
    });
    ```
  - [ ] 6.5 Add accessibility checks to all E2E test files using `checkAccessibility(page)` from fixtures

- [ ] **Task 7: Add E2E step to CI pipeline** (AC: #7)
  - [ ] 7.1 Update `.github/workflows/ci.yml`:
    - Add E2E test step after the main Build step:
      ```yaml
      - name: E2E Tests
        run: |
          npx playwright install chromium --with-deps
          pnpm --filter @hexalith/shell test:e2e
      ```
    - Playwright config's `webServer` handles the E2E build + preview automatically (build → serve `dist/` → run tests) — no separate CI build step needed
    - The E2E build uses `vite.config.e2e.ts` which swaps in MockShellProvider via alias — no env vars needed

- [ ] **Task 8: Verify full component coverage and theme correctness** (AC: #6, #8)
  - [ ] 8.1 Audit the Tenants module code to confirm ALL required @hexalith/ui components are used:
    - `<Table>` — TenantListPage *(from 6-3)*
    - `<Form>` + `<FormField>` — TenantCreatePage *(from 6-3)*, TenantEditPage *(new)*, Disable Modal *(new)*
    - `<DetailView>` — TenantDetailPage *(from 6-3)*
    - `<PageLayout>` — all pages *(from 6-3)*
    - `<Stack>` — TenantDetailPage action buttons *(new)*
    - `<Button>` — all pages *(from 6-3)*
    - `<Input>` — TenantCreatePage *(from 6-3)*, TenantEditPage *(new)*
    - `<Select>` — TenantListPage status filter above the table *(new — see Task 8.3)*. **CRITICAL:** `<Select>` requires a `label` prop (for accessibility) and `options: Array<SelectOption>`. The Table's built-in `filterType: 'select'` is internal — the standalone `<Select>` component must also be exercised.
    - `<TextArea>` — TenantCreatePage *(from 6-3)*, TenantEditPage *(new)*
    - `<Skeleton>` — loading states *(from 6-3)*
    - `<EmptyState>` — TenantListPage *(from 6-3)*
    - `<ErrorDisplay>` — error states *(from 6-3)*
    - Toast via `useToast()` — TenantCreatePage *(from 6-3)*, TenantEditPage *(new)*, Disable flow *(new)*
    - `<Modal>` — Disable confirmation *(new)*
  - [ ] 8.2 Verify light and dark theme rendering:
    - All CSS module styles use design tokens (`--hx-*` custom properties) not raw values
    - Status colors use semantic tokens: `--color-status-success`, `--color-status-warning`, etc.
    - **Explicit dark mode check:** Run the dev-host or shell in dark mode (toggle via `useTheme().toggleTheme()` or browser DevTools `prefers-color-scheme: dark`) and visually verify:
      - TenantListPage: table rows, status badges, Select filter, empty state all readable
      - TenantDetailPage: section headings, field values, action buttons, Modal backdrop/content
      - TenantEditPage: form fields, labels, error messages
      - No hardcoded colors (e.g., `color: #333`, `background: white`) — grep module CSS files for hex/rgb values as a quick check
    - Add an E2E accessibility check in dark mode: in one test, set `prefers-color-scheme: dark` via `page.emulateMedia({ colorScheme: 'dark' })` before running `checkAccessibility(page)` — ensures contrast ratios hold in dark theme
  - [ ] 8.3 Add standalone `<Select>` component usage to TenantListPage — replace the table's built-in status filter:
    - **IMPORTANT:** Story 6-3 defines the status column with `filterType: 'select'` and `filterOptions`. REMOVE `filterType` and `filterOptions` from the status column definition to avoid two competing filter mechanisms for the same field (Table internal filter state vs external Select state will desync and confuse users).
    - Add a `<Select>` filter above the table for status filtering:
      ```tsx
      import { useState } from 'react';
      import { Select, type SelectOption } from '@hexalith/ui';

      const statusOptions: SelectOption[] = [
        { value: '', label: 'All Statuses' },
        { value: 'Active', label: 'Active' },
        { value: 'Inactive', label: 'Inactive' },
        { value: 'Disabled', label: 'Disabled' },
      ];

      // In component:
      const [statusFilter, setStatusFilter] = useState('');
      const filteredData = statusFilter ? data.filter(t => t.status === statusFilter) : data;

      // In JSX — above the Table:
      <Select
        label="Filter by Status"
        options={statusOptions}
        value={statusFilter}
        onChange={setStatusFilter}
      />
      <Table data={filteredData} ... />
      ```
    - **CRITICAL:** `<Select>` requires a `label` prop (string, for accessibility). Without it, the component will produce inaccessible output.
    - **CRITICAL:** Pass `filteredData` (not `data`) to `<Table>`. The Table's `globalSearch` operates on whatever `data` prop it receives — filtering must happen BEFORE the Table. This ensures globalSearch searches within the Select-filtered results, avoiding confusing empty states when search text matches a different status than the one selected.
    - Update `TenantListPage.test.tsx` to test the Select filter behavior (select "Active" → only active tenants shown)

- [ ] **Task 9: Final integration verification** (AC: #8)
  - [ ] 9.1 Run `pnpm install` — verify workspace resolution
  - [ ] 9.2 Run `pnpm turbo build` — verify full workspace builds cleanly
  - [ ] 9.3 Run `pnpm turbo test` — verify all tests pass (unit + component)
  - [ ] 9.4 Run `pnpm turbo lint` — verify no lint errors
  - [ ] 9.5 Run `pnpm --filter @hexalith/shell test:e2e` — verify E2E tests pass
  - [ ] 9.6 Verify the full validation chain:
    - Monorepo build (Turborepo parallel build with correct dependency order)
    - Design tokens (all module styles use `--hx-*` tokens)
    - Shell-api providers (auth, tenant, theme, locale contexts)
    - CQRS-client hooks (useQuery, useCommandPipeline work with Tenants domain)
    - @hexalith/ui components (all 15 required components exercised)
    - Module discovery (manifest auto-discovered from `modules/*/src/manifest.ts`)
    - Unified navigation (sidebar shows Tenants under Administration)
    - Error isolation (ModuleErrorBoundary catches Tenants errors without crashing shell)
    - CI quality gates (coverage, lint, manifest validation, design system health)

## Dev Notes

### What Already Exists (From Story 6-3 — PREREQUISITE)

**Story 6-3 MUST be completed before starting 6-4.** It creates:

- `modules/hexalith-tenants/` — complete module directory with:
  - `package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `eslint.config.js`
  - `src/schemas/tenantSchemas.ts` — All Zod schemas: `TenantItemSchema`, `TenantListSchema`, `TenantDetailSchema`, `CreateTenantCommandSchema`, `UpdateTenantCommandSchema`, `DisableTenantCommandSchema`
  - `src/data/sampleData.ts` — Query params + mock data
  - `src/pages/TenantListPage.tsx` — Table with sorting, filtering, pagination
  - `src/pages/TenantDetailPage.tsx` — DetailView with Back button only (Edit/Disable deferred to this story)
  - `src/pages/TenantCreatePage.tsx` — Form with CreateTenantCommandSchema
  - `src/testing/renderWithProviders.tsx` — Test utility with mock providers
  - `src/manifest.ts` — Routes: `/`, `/detail/:id`, `/create`
  - `src/routes.tsx` — Lazy-loaded route definitions
  - `src/index.ts` — Module entry point
  - `dev-host/` — Standalone dev server
  - Tests for all existing pages

**UpdateTenantCommandSchema (from 6-3, not yet wired to UI):**
```typescript
UpdateTenantCommandSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  contactEmail: z.string().email().optional(),
})
```

**DisableTenantCommandSchema (from 6-3, not yet wired to UI):**
```typescript
DisableTenantCommandSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(500),
})
```

**Shell module loading is complete:**
- `apps/shell/src/modules/registry.ts` — uses `import.meta.glob("../../../../modules/*/src/manifest.ts")` to discover modules
- `apps/shell/src/modules/routeBuilder.ts` — wraps each module in `ModuleErrorBoundary → Suspense → ModuleRenderGuard → mod.component`
- `apps/shell/src/modules/navigationBuilder.ts` — builds sidebar items from manifests; path = `item.path === "/" ? /${basePath} : /${basePath}${item.path}`
- `apps/shell/src/build/manifestValidationPlugin.ts` — validates manifests at build time
- `apps/shell/src/modules/lazyWithRetry.ts` — retry logic for chunk load failures

**CQRS infrastructure:**
- `@hexalith/cqrs-client`: `useQuery`, `useCommandPipeline`, `CqrsProvider`, `MockCommandBus`, `MockQueryBus`, `MockSignalRHub`
- `@hexalith/shell-api`: `useAuth`, `useTenant`, `MockShellProvider`, manifest types
- `@hexalith/ui`: `Table`, `DetailView`, `Form`, `FormField`, `Button`, `Input`, `Select`, `TextArea`, `PageLayout`, `Stack`, `Skeleton`, `EmptyState`, `ErrorDisplay`, `Toast`, `ToastProvider`, `useToast`, `Modal`, `AlertDialog`, `Tooltip`, `DropdownMenu`, `Popover`, `Sidebar`, `Tabs`, `Divider`, `Inline`, `Checkbox`, `DatePicker`

### Architecture Compliance

**Route basePath — CRITICAL CORRECTION from 6-3:**
- The 6-3 story incorrectly states routes are prefixed with `hexalith-tenants`. This is WRONG.
- `registry.ts` line 60: `basePath: manifest.name` — basePath comes from `manifest.name`, NOT the directory name
- Since `manifest.name = "tenants"`, the actual routes are: `/tenants/`, `/tenants/detail/:id`, `/tenants/create`, `/tenants/edit/:id`
- If the dev for 6-3 used `hexalith-tenants` as basePath, this needs to be verified and potentially corrected

**Hook API — Use correct names:**
- `useQuery<T>()` — NOT `useProjection`. The codebase uses `useQuery` from `@hexalith/cqrs-client`
- `useCommandPipeline()` — NOT `useCommand`. The codebase uses `useCommandPipeline`

**useQuery signature:**
```typescript
const { data, isLoading, isRefreshing, error, refetch } = useQuery<T>(
  schema: z.ZodType<T>,
  queryParams: { domain: string; queryType: string; aggregateId?: string; entityId?: string },
  options?: { enabled?: boolean; refetchInterval?: number; refetchOnWindowFocus?: boolean }
);
```

**useCommandPipeline signature:**
```typescript
const { send, status, error, correlationId, replay } = useCommandPipeline();
// status: "idle" | "sending" | "polling" | "completed" | "rejected" | "failed" | "timedOut"
// send: (cmd: { domain: string; commandType: string; aggregateId: string; payload: unknown }) => Promise<void>
// replay: (() => Promise<void>) | null
```

**Module boundary rules** [Source: architecture.md, Lines 1538-1567]:
- Modules may ONLY import: `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`, `zod`
- Modules CANNOT import: `@radix-ui/*`, `oidc-client-ts`, `ky`, `@tanstack/react-query`, other `modules/*`
- No deep imports: `@hexalith/*/src/**` is blocked by ESLint

**Loading state pattern (MANDATORY):**
```typescript
if (isLoading) return <Skeleton variant="table" rows={8} />;
if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
// Never use spinners, never return null for loading
```

**Error handling pattern:**
- Business errors (`CommandRejectedError`) → handle inline with user message
- Infrastructure errors (network, auth, 500s) → let bubble to `ModuleErrorBoundary`
- Never `try/catch` around `useQuery`/`useCommandPipeline` — they surface errors via return value

**Navigation pattern — Use relative paths:**
- `navigate('..')` to go back to parent route (module root = list)
- `navigate(`../detail/${id}`)` for detail page
- `navigate(`../edit/${id}`)` for edit page
- `navigate(-1)` for browser-style back — use ONLY on the detail page Back button where browser-history behavior is desired. DO NOT use for Cancel buttons (fragile on deep-link — user may exit the app). Use `navigate('..')` for Cancel buttons instead.
- IMPORTANT: absolute `/` goes to shell root, not module root

**Import ordering:**
```typescript
// 1. React
// 2. External libraries (zod)
// 3. @hexalith packages (shell-api, cqrs-client, ui)
// 4. Relative imports
// 5. CSS modules (last)
```

### Library/Framework Requirements

- **@hexalith/cqrs-client** — `useQuery`, `useCommandPipeline`, `CqrsProvider`, `MockCommandBus`, `MockQueryBus`, `MockSignalRHub`
- **@hexalith/shell-api** — `useTenant`, `MockShellProvider`, `ModuleManifest`
- **@hexalith/ui** — `Table` (`TableColumn`), `DetailView` (`DetailSection`, `DetailField`), `Form`, `FormField`, `Button` (verify `variant="destructive"` is a valid ButtonProps variant at impl time — if not available, use `variant="danger"` or style via className), `Input`, `Select` (`SelectOption`), `TextArea`, `PageLayout`, `Stack`, `Skeleton`, `EmptyState`, `ErrorDisplay`, `ToastProvider`, `useToast` (`{ toast, dismiss }`), `Modal`
- **zod** v3.x — Schema definitions with `z.infer<>` for types
- **react-router** v7.x — `useNavigate`, `useParams`, `Routes`, `Route`, `MemoryRouter`
- **@playwright/test** — E2E test runner (NEW dependency for shell)
- **@axe-core/playwright** — Accessibility testing in E2E (NEW dependency for shell)
- **vitest** — Co-located `.test.tsx` files with `@testing-library/react`

### File Structure Requirements

**Files to CREATE:**
```
modules/hexalith-tenants/src/pages/
├── TenantEditPage.tsx                    # Edit form with UpdateTenantCommandSchema
└── TenantEditPage.test.tsx               # Edit page tests

apps/shell/e2e/
├── playwright.config.ts                  # E2E test configuration
├── fixtures/
│   └── test-fixtures.ts                  # Shared test helpers (axe-core)
├── tenants-navigation.spec.ts            # Flow 1: List → Detail → Back
├── tenants-create.spec.ts                # Flow 2: Create → Validate → Submit → Toast
├── tenants-switching.spec.ts             # Flow 3: Tenant switching
└── tenants-error-recovery.spec.ts        # Flow 4: Error → Boundary → Retry

apps/shell/src/providers/
└── ShellProviders.e2e.tsx                # E2E provider swap (MockShellProvider + mock buses)
apps/shell/
└── vite.config.e2e.ts                    # E2E Vite config with resolve.alias for provider swap
```

**Files to MODIFY:**
```
modules/hexalith-tenants/src/pages/TenantDetailPage.tsx       # Add Edit/Disable buttons + Modal
modules/hexalith-tenants/src/pages/TenantDetailPage.test.tsx   # Add tests for new functionality
modules/hexalith-tenants/src/manifest.ts                       # Add /edit/:id route
modules/hexalith-tenants/src/routes.tsx                        # Add TenantEditPage route
modules/hexalith-tenants/src/index.ts                          # Export new types if needed
apps/shell/package.json                                        # Add Playwright + axe-core deps
.github/workflows/ci.yml                                       # Add E2E test step
```

**Files to NOT TOUCH:**
- `pnpm-workspace.yaml` — already includes `modules/*`
- `turbo.json` — no changes needed
- `.gitmodules` — the Hexalith.Tenants .NET backend entry is separate
- Any files in `packages/` — all APIs are already complete
- `modules/hexalith-demo-tasks/` or `modules/hexalith-test-orders/` — leave untouched
- The 6-3 created files (schemas, sample data, renderWithProviders, create page, CSS modules) — modify only what's explicitly listed above

### Testing Requirements

**Unit Tests (Vitest — `.test.tsx`):**
- TenantEditPage: form pre-fill, validation, command success/rejection/failure, cancel navigation
- TenantDetailPage updates: Edit button navigation, Disable button opens Modal, disable command flow, Disable hidden for disabled tenants
- Use `renderWithProviders()` for all component tests
- Pre-configure `MockQueryBus` with sample data matching query keys
- Use `MockCommandBus.configureNextSend()` to test command behaviors (FIFO order)
- MockQueryBus key format: `"test-tenant:Tenants:GetTenantDetail:<id>:"`
- Target ≥ 80% coverage for the module

**E2E Tests (Playwright — `.spec.ts`):**
- Run against the shell with mock providers (E2E mode)
- Test four user flows per AC7
- Include `@axe-core/playwright` accessibility checks
- Use `apps/shell/e2e/` directory (NOT in the module)
- Test naming: `*.spec.ts` (Playwright convention, NOT `.test.ts`)
- Tests must be deterministic — no hard waits, no flaky selectors
- Tests must be isolated — each test resets state independently
- Tests must be fast — < 1.5 minutes per test

### Previous Story Intelligence

**Story 6-3 (ready-for-dev):** Creates the Tenants module with all domain types, pages, and tests. Key items from 6-3:
- Schemas are defined with forward-compatibility for 6-4 (UpdateTenantCommandSchema, DisableTenantCommandSchema created but not wired to UI)
- TenantDetailPage has Back button ONLY — Edit/Disable deferred to 6-4
- No Playwright spec files — E2E tests are explicitly 6-4 scope
- The `renderWithProviders.tsx` utility wraps MockShellProvider + CqrsProvider + ToastProvider + MemoryRouter
- CSS module styles use design tokens for status colors

**Story 6-2 (in-progress):** Module publishing via git integration. Key context:
- Foundation packages prepared for GitHub Packages publishing
- `pnpm-workspace.yaml` already includes `modules/*`
- Module boundary rules and ESLint isolation configured
- Scaffold tool template is the canonical module pattern
- Code review found issues: broken @hexalith/ui exports, publish workflow error handling, peer dep validation

**Story 6-1 (done):** CI pipeline and quality gates:
- Coverage gates: 80% modules, 95% foundation packages
- Scaffold smoke test validates template integrity
- Manifest validation at build time
- Pre-existing: `CssLayerSmoke.test.ts` times out — ignore if encountered

### Git Intelligence

Recent commits show:
- Module isolation ESLint rules active
- Connection recovery revalidation in `useQuery`
- Manifest validation plugin operational
- Module error boundaries (`ShellErrorBoundary`, `ModuleErrorBoundary`) working
- Navigation state preservation implemented

### Critical Anti-Patterns to Avoid

1. **DO NOT use `useProjection` or `useCommand`** — the codebase uses `useQuery` and `useCommandPipeline`
2. **DO NOT import from `@tanstack/react-query` directly** — use `useQuery` from `@hexalith/cqrs-client`
3. **DO NOT import from `@radix-ui/*` directly** — use `@hexalith/ui` components
4. **DO NOT define Zod schemas inside component bodies** — schemas must be stable references at module scope
5. **DO NOT modify the `Hexalith.Tenants` .NET backend submodule** at repo root
6. **DO NOT use spinners or return null for loading states** — always use `<Skeleton>`
7. **DO NOT use `try/catch` around hooks** — `useQuery` and `useCommandPipeline` surface errors via return values
8. **DO NOT use absolute paths for navigation** — `navigate('/')` goes to shell root, use relative paths like `navigate('..')` or `navigate(`../edit/${id}`)`
9. **DO NOT create barrel exports in subdirectories** — only `src/index.ts` is a barrel
10. **DO NOT hardcode colors or spacing** — use design tokens (`--hx-*` CSS custom properties)
11. **DO NOT use `workspace:*` in peerDependencies** — use versioned ranges (e.g., `^0.1.0`)
12. **DO NOT add `vitest` to shell devDependencies** — it's already at workspace root level
13. **DO NOT use a runtime conditional (`if (import.meta.env.VITE_E2E_MODE)`) to swap providers** — Vite cannot tree-shake runtime branches, so mock code will leak into production bundles. Use `resolve.alias` in a separate `vite.config.e2e.ts` to swap the provider module at build time.
14. **DO NOT create auth.setup.spec.ts** — E2E mode bypasses OIDC auth entirely via MockShellProvider
15. **DO NOT put E2E test files in the module directory** — they go in `apps/shell/e2e/`
16. **DO NOT keep `filterType: 'select'` on the status Table column after adding the standalone `<Select>` filter** — two filter mechanisms for the same field will desync and confuse users. Remove the table's built-in filter; use the standalone `<Select>` as the single source of truth.
17. **DO NOT use `navigate(-1)` for Cancel buttons** — fragile when user deep-links. Use `navigate('..')` for Cancel (reliable parent route). Reserve `navigate(-1)` for Back buttons only where browser-history behavior is desired.

### Key Code Patterns to Follow

**TenantEditPage pattern:**
```typescript
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useCommandPipeline, useQuery } from '@hexalith/cqrs-client';
import { Button, ErrorDisplay, Form, FormField, Input, PageLayout, Skeleton, Stack, TextArea, useToast } from '@hexalith/ui';
import { TenantDetailSchema, UpdateTenantCommandSchema, type UpdateTenantInput } from '../schemas/tenantSchemas';
import { buildTenantDetailQuery } from '../data/sampleData';

export function TenantEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, error, refetch } = useQuery(TenantDetailSchema, buildTenantDetailQuery(id!), { enabled: !!id });
  const { send, status, error: cmdError, replay } = useCommandPipeline();

  const handleSubmit = async (formData: UpdateTenantInput) => {
    await send({
      domain: 'Tenants',
      commandType: 'UpdateTenant',
      aggregateId: id!,
      payload: formData,
    });
  };

  useEffect(() => {
    if (status === 'completed') {
      toast({ title: 'Tenant updated', variant: 'success' });
      navigate(`../detail/${id}`);
    }
  }, [status]);

  if (!id) return <ErrorDisplay error={{ message: 'Tenant not found' }} />;
  if (isLoading) return <Skeleton variant="detail" />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  if (!data) return null;

  return (
    <PageLayout title={`Edit ${data.name}`}>
      <Form schema={UpdateTenantCommandSchema} onSubmit={handleSubmit} defaultValues={{ name: data.name, description: data.description, contactEmail: data.contactEmail }}>
        <Stack gap="md">
          <FormField name="name"><Input placeholder="Tenant name" /></FormField>
          <FormField name="description"><TextArea placeholder="Description (optional)" /></FormField>
          <FormField name="contactEmail"><Input placeholder="contact@example.com" /></FormField>
          {cmdError && <ErrorDisplay error={cmdError} onRetry={replay ?? undefined} />}
          <Stack direction="horizontal" gap="sm">
            <Button type="submit" disabled={status === 'sending' || status === 'polling'}>
              {status === 'sending' || status === 'polling' ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('..')}>Cancel</Button>
          </Stack>
        </Stack>
      </Form>
    </PageLayout>
  );
}
```

**TenantDetailPage disable pattern (addition to existing page):**
```typescript
import { useState, useEffect } from 'react';
import { useCommandPipeline } from '@hexalith/cqrs-client';
import { Button, Form, FormField, Input, Modal, Stack, useToast } from '@hexalith/ui';
import { DisableTenantCommandSchema, type DisableTenantInput } from '../schemas/tenantSchemas';

// Inside TenantDetailPage component:
const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
const { send: sendDisable, status: disableStatus, error: disableError } = useCommandPipeline();
const { toast } = useToast();

const hasSubmittedDisable = useRef(false);

const handleDisable = async (formData: DisableTenantInput) => {
  // Optimistic modal close — don't leave user staring at frozen modal
  hasSubmittedDisable.current = true;
  setIsDisableModalOpen(false);
  toast({ title: 'Disabling tenant...', variant: 'default' });
  await sendDisable({
    domain: 'Tenants',
    commandType: 'DisableTenant',
    aggregateId: id!,
    payload: formData,
  });
};

// Guard with hasSubmittedDisable to prevent stale 'completed' status
// from triggering a toast on mount. Verify at impl time: if useCommandPipeline()
// always initializes with status='idle', this guard is unnecessary and can
// be removed for simplicity. Keep it if status can persist across renders.
useEffect(() => {
  if (!hasSubmittedDisable.current) return;
  if (disableStatus === 'completed') {
    toast({ title: 'Tenant disabled', variant: 'success' });
    refetch();
    hasSubmittedDisable.current = false;
  }
  if (disableStatus === 'rejected') {
    toast({ title: `Failed to disable: ${disableError?.message}`, variant: 'error' });
    hasSubmittedDisable.current = false;
  }
  if (disableStatus === 'failed' || disableStatus === 'timedOut') {
    toast({ title: 'Disable failed — please try again', variant: 'error' });
    hasSubmittedDisable.current = false;
  }
}, [disableStatus]);

// In JSX — action buttons area:
<Stack direction="horizontal" gap="sm">
  <Button variant="ghost" onClick={() => navigate(-1)}>Back</Button>
  <Button onClick={() => navigate(`../edit/${id}`)}>Edit</Button>
  {data.status !== 'Disabled' && (
    <Button variant="destructive" onClick={() => setIsDisableModalOpen(true)}>Disable</Button>
  )}
</Stack>

// Disable confirmation modal:
<Modal open={isDisableModalOpen} onClose={() => setIsDisableModalOpen(false)} title="Disable Tenant">
  <Form schema={DisableTenantCommandSchema} onSubmit={handleDisable}>
    <Stack gap="md">
      <p>This action will disable the tenant. Please provide a reason.</p>
      <FormField name="reason"><Input placeholder="Reason for disabling" /></FormField>
      <Stack direction="horizontal" gap="sm">
        <Button type="submit" variant="destructive" disabled={disableStatus === 'sending' || disableStatus === 'polling'}>
          {disableStatus === 'sending' || disableStatus === 'polling' ? 'Disabling...' : 'Confirm Disable'}
        </Button>
        <Button variant="ghost" onClick={() => setIsDisableModalOpen(false)}>Cancel</Button>
      </Stack>
    </Stack>
  </Form>
</Modal>
```

**E2E test pattern:**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Tenants Module', () => {
  test('navigates from list to detail and back', async ({ page }) => {
    await page.goto('/tenants');
    await expect(page.getByRole('table')).toBeVisible();
    // Use known tenant name from E2E mock data — nth() is fragile
    await page.getByRole('row').filter({ hasText: /Acme/ }).click();
    await expect(page).toHaveURL(/\/tenants\/detail\//);
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page).toHaveURL('/tenants');
  });

  test('passes accessibility checks on list page', async ({ page }) => {
    await page.goto('/tenants');
    await expect(page.getByRole('table')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
```

### MockQueryBus Key Format

The `MockQueryBus` uses a composite key to look up responses:
```
"<tenantId>:<domain>:<queryType>:<aggregateId>:<entityId>"
```
- Default tenantId from MockShellProvider is `"test-tenant"`
- For list query: `"test-tenant:Tenants:GetTenantList::"`
- For detail query: `"test-tenant:Tenants:GetTenantDetail:<id>:"`

Use `queryBus.setResponse(key, data)` to configure mock responses.

### Project Structure Notes

- Module directory is `modules/hexalith-tenants/` — follows kebab-case naming
- Shell discovers modules via `import.meta.glob("../../../../modules/*/src/manifest.ts")`
- **basePath = manifest.name = "tenants"** — routes are at `/tenants/*`, NOT `/hexalith-tenants/*`
- pnpm workspace resolves `@hexalith/*` peerDependencies to local packages automatically
- Turborepo builds modules in correct dependency order (packages first, then modules)
- E2E tests live in `apps/shell/e2e/` — they test the full integrated shell, not individual modules

### UX Design Notes

[Source: ux-design-specification.md]
- **Linear-inspired compact density** for data tables — high information density without clutter
- **Content-aware skeletons** — skeleton table, skeleton form, skeleton detail (no spinners)
- **Beautiful empty states** — illustration + message + action CTA ("No tenants yet. Create your first tenant.")
- **Designed error states** — contextual error messages, not disconnected banners
- **Toast for command feedback** — auto-dismissing success toasts, persistent error messages
- **Dual-theme parity** — light and dark themes designed simultaneously, semantic color tokens only
- **Signal clarity wins all conflicts** — density wins over calm layout for data-heavy screens
- **Core user loop**: Sidebar → data table → row detail → action (command) → feedback confirmation → back to table

### Architecture Decisions (from story elicitation)

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-1 | Vite alias swap for E2E, not runtime conditional | Runtime `if` leaks mock deps into production bundle — Vite can't tree-shake runtime branches |
| ADR-2 | Optimistic modal close on disable | UX spec: "no confirmation dialogs for reversible actions" — disable is reversible, reason field prevents accidents |
| ADR-3 | `navigate('..')` for Cancel, `navigate(-1)` for Back only | `navigate(-1)` is fragile on deep-link (exits app). Reserve for Back button where browser-history is desired. |
| ADR-4 | E2E mock data inline in shell, not imported from module | Shell→module import creates hard dependency — shell build breaks if module absent |
| ADR-5 | Single `<Select>` filter replaces Table built-in filter | Two filter mechanisms for same field desync and confuse users |
| ADR-6 | E2E tests verify toast+redirect, not list data after create | `MockCommandBus` doesn't auto-update `MockQueryBus` — list still shows pre-seeded data |
| ADR-7 | Single build+preview mode for E2E (no dual local/CI config) | Occam's Razor — same command works everywhere, no config drift |

### References

- [Source: architecture.md, Lines 530-548] Module loading and route registration
- [Source: architecture.md, Lines 798-821] Module internal organization pattern
- [Source: architecture.md, Lines 841-846] Package dependency rules
- [Source: architecture.md, Lines 1045-1067] Error recovery and form validation patterns
- [Source: architecture.md, Lines 1105-1141] Complete module page example (TenantListPage)
- [Source: architecture.md, Lines 1256-1261] E2E test structure
- [Source: architecture.md, Lines 1462-1487] Tenants module directory
- [Source: architecture.md, Lines 1538-1567] Module boundary rules
- [Source: architecture.md, Lines 1569-1575] Deep import protection
- [Source: epics.md, Lines 2030-2081] Story 6.4 acceptance criteria
- [Source: prd.md, FR4, FR18-FR20, FR23, FR29] Module shell integration
- [Source: prd.md, FR39-FR41] UI component patterns
- [Source: prd.md, FR32, FR34, FR38] Tenant management
- [Source: ux-design-specification.md] Linear-inspired density, empty states, command feedback, dual-theme
- [Source: tools/create-hexalith-module/templates/module/] Canonical module scaffold patterns
- [Source: _bmad-output/implementation-artifacts/6-3-tenants-reference-module-cqrs-integration.md] Previous story context

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
