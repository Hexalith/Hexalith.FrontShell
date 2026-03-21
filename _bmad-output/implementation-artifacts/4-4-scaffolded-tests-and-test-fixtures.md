# Story 4.4: Scaffolded Tests & Test Fixtures

Status: in-progress

## Story

As a module developer,
I want pre-generated tests that pass immediately without modification,
So that I have a working test foundation and can run tests from minute one.

## Acceptance Criteria

1. **AC1 — All Vitest tests pass immediately.** Given the scaffold generates test files, when a developer runs `pnpm test` from the module root, then all generated Vitest tests (`.test.tsx`) pass without any modifications.

2. **AC2 — Tests cover page rendering, query fetch, and command submission.** Tests cover: at least one page component rendering, one `useQuery` data fetch, one `useCommandPipeline` submission.

3. **AC3 — Base test fixtures with pre-configured mock buses.** Given the scaffold generates test fixtures, when a developer inspects the test setup, then base test fixtures provide `MockCommandBus` and `MockQueryBus` pre-configured with sample data. Fixtures simulate realistic async behavior (configurable delay, not instant). A `renderWithProviders` utility wraps components in `MockShellProvider` for testing. Fixtures match the three-phase command lifecycle to prevent mock/real divergence.

4. **AC4 — Playwright component test passes with a11y check.** Given the scaffold generates Playwright component test files (`.spec.tsx`), when a developer runs Playwright tests, then at least one component test passes validating the scaffold renders correctly, and the test includes an axe-core accessibility check.

5. **AC5 — Contract tests catch mock divergence.** Given tests use the mock implementations, when the mock behavior diverges from real implementations, then the contract test suites from `@hexalith/cqrs-client` catch the divergence. _Note: This AC is satisfied by the existing contract test suites in `packages/cqrs-client/src/mocks/__contracts__/` — no new contract tests are created in this story._

_FRs covered: FR3_

## Tasks / Subtasks

- [x] Task 1: Create test setup file with jsdom polyfills (AC: #1, #3)
  - [x] 1.1: Create `templates/module/src/test-setup.ts` — polyfills required by `@hexalith/ui` components in jsdom:
    - Import `cleanup` from `@testing-library/react` and `afterEach` from `vitest`
    - Import `@testing-library/jest-dom/vitest` for DOM matchers (`.toBeInTheDocument()`, etc.)
    - Polyfill `HTMLElement.prototype.hasPointerCapture`, `.setPointerCapture`, `.releasePointerCapture` (required by Radix UI popovers/dialogs)
    - Polyfill `HTMLElement.prototype.scrollIntoView`
    - Polyfill `globalThis.ResizeObserver` (required by Radix UI components)
    - Polyfill `window.matchMedia` for theme detection
    - Polyfill `crypto.randomUUID` if not available — `ExampleCreatePage` calls `crypto.randomUUID()` for aggregate ID generation. Node 20+ has it globally, but jsdom may not expose it. Add a conditional polyfill:
      ```typescript
      if (typeof globalThis.crypto?.randomUUID !== "function") {
        Object.defineProperty(globalThis.crypto, "randomUUID", {
          value: () => "00000000-0000-4000-8000-000000000000",
          writable: true,
        });
      }
      ```
      Verify first if the polyfill is needed (it may work without it on Node 20+). If it IS needed and missing, `ExampleCreatePage` throws `TypeError: crypto.randomUUID is not a function` when the form submits.
    - Call `cleanup()` in `afterEach`
    - Follow the exact same pattern as `packages/ui/src/test-setup.ts` — keep it consistent
  - [x] 1.2: Update `templates/module/vitest.config.ts`:

    ```typescript
    import { defineConfig } from "vitest/config";

    export default defineConfig({
      test: {
        include: ["**/*.test.ts", "**/*.test.tsx"],
        exclude: ["**/*.spec.ts", "**/*.spec.tsx"],
        passWithNoTests: true,
        projects: [
          {
            test: {
              name: "unit",
              include: ["**/*.test.ts"],
              setupFiles: ["./src/test-setup.ts"],
            },
          },
          {
            test: {
              name: "component",
              include: ["**/*.test.tsx"],
              environment: "jsdom",
              css: { modules: { classNameStrategy: "non-scoped" } },
              setupFiles: ["./src/test-setup.ts"],
            },
          },
        ],
      },
    });
    ```

    This matches the `packages/ui/vitest.config.ts` dual-project pattern: `.test.ts` for pure unit tests (no DOM), `.test.tsx` for component tests with jsdom. CSS modules use `non-scoped` so class names are predictable in tests.
    **Root workspace config risk:** The root `vitest.config.ts` uses `projects: ["packages/*", "apps/*", "tools/*"]`. The `tools/*` pattern matches `tools/create-hexalith-module/` (which has its own vitest config for scaffold tests), NOT `tools/create-hexalith-module/templates/module/` (which has no `package.json` at the `templates/` level and is not a workspace package). Vitest does not support nested `projects` inside `projects`. **Verify** that the template's vitest config is NOT picked up by the root workspace. If it is, remove the `projects` field from the template config and use a flat config with `environment: "jsdom"` for all tests instead.

- [x] Task 2: Create `renderWithProviders` test utility (AC: #3)
  - [x] 2.1: Create `templates/module/src/testing/renderWithProviders.tsx`:
    - Import `render` and `RenderOptions` from `@testing-library/react`
    - Import `MockShellProvider` from `@hexalith/shell-api`
    - Import `CqrsProvider` from `@hexalith/cqrs-client`
    - Import `MockCommandBus`, `MockQueryBus`, `MockSignalRHub` from `@hexalith/cqrs-client`
    - Import `ToastProvider` from `@hexalith/ui`
    - Import `MemoryRouter` from `react-router`
    - Import sample data and query constants from `../data/sampleData`
    - Import `exampleDetails` from `../data/sampleData`
    - Define `RenderWithProvidersOptions` type extending `RenderOptions`:
      ```typescript
      interface RenderWithProvidersOptions extends Omit<
        RenderOptions,
        "wrapper"
      > {
        initialRoute?: string;
        queryBus?: MockQueryBus;
        commandBus?: MockCommandBus;
      }
      ```
    - Create a `createConfiguredQueryBus` function that creates a `MockQueryBus` with `{ delay: 30 }` and pre-registers sample data responses:
      - **Build keys from query constants** (imported from `../data/sampleData`) to prevent manual string typos. **Derive the tenant value** from `createMockTenantContext()` instead of hardcoding, so the utility is resilient to MockShellProvider default changes:
        ```typescript
        import { createMockTenantContext } from "@hexalith/shell-api";
        const TENANT = createMockTenantContext().activeTenant; // Derives from same default as MockShellProvider
        const listKey = `${TENANT}:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`;
        mockQueryBus.setResponse(listKey, exampleItems);
        for (const detail of exampleDetails) {
          const detailKey = `${TENANT}:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${detail.id}:`;
          mockQueryBus.setResponse(detailKey, detail);
        }
        ```
      - This uses the SAME `domain` and `queryType` values that the pages pass to `useQuery`, eliminating the possibility of a key mismatch from manual string construction
      - **Key format:** `"${tenant}:${domain}:${queryType}:${aggregateId ?? ""}:${entityId ?? ""}"`. Tenant comes from MockShellProvider default = `"test-tenant"`. Empty aggregateId/entityId produce trailing `:`
    - Create a `createConfiguredCommandBus` function returning `new MockCommandBus({ delay: 50, defaultBehavior: "success" })`
    - Export `renderWithProviders` function:

      ```typescript
      export function renderWithProviders(
        ui: ReactElement,
        options: RenderWithProvidersOptions = {},
      ) {
        const {
          initialRoute = "/",
          queryBus = createConfiguredQueryBus(),
          commandBus = createConfiguredCommandBus(),
          ...renderOptions
        } = options;

        const mockSignalRHub = new MockSignalRHub();

        function Wrapper({ children }: { children: ReactNode }) {
          return (
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
          );
        }

        return {
          ...render(ui, { wrapper: Wrapper, ...renderOptions }),
          queryBus,
          commandBus,
        };
      }
      ```

    - **Provider nesting order must match dev-host and real shell:** MockShellProvider → CqrsProvider → ToastProvider → MemoryRouter
    - Uses `MemoryRouter` instead of `BrowserRouter` because tests don't have a real URL bar. `initialRoute` lets tests set the current URL path (e.g., `"/abc-123"` for detail page)
    - Returns `queryBus` and `commandBus` references so test assertions can inspect calls: `commandBus.getCalls()`, `commandBus.getLastCall()`

- [x] Task 3: Create ExampleListPage test (AC: #1, #2)
  - [x] 3.1: Create `templates/module/src/pages/ExampleListPage.test.tsx`:
    - Use `describe("ExampleListPage", () => { it(...) })` nesting — scaffold tests are teaching artifacts that set the convention for all future module tests. This matches the `packages/ui` component test pattern.
    - Import `describe`, `it`, `expect`, `vi` from `vitest`
    - Import `screen`, `waitFor` from `@testing-library/react`
    - Import `renderWithProviders` from `../testing/renderWithProviders`
    - Import `ExampleListPage` from `./ExampleListPage`
    - Import `exampleItems` from `../data/sampleData`
    - Import `MockQueryBus` from `@hexalith/cqrs-client`
    - **Test: renders loading state initially**
      - Render `<ExampleListPage />` with `renderWithProviders` using a `MockQueryBus({ delay: 500 })` (long delay to catch loading)
      - Expect loading skeleton to be in the document
    - **Test: renders sample data in table after load** (AC: #2 — useQuery data fetch)
      - Render `<ExampleListPage />` with `renderWithProviders`
      - `await waitFor` for first sample item name to appear ("Project Atlas")
      - Verify multiple sample items are rendered in the table
      - Verify column headers are present: "Name", "Status", "Category", "Priority", "Created"
    - **Test: renders empty state when no data**
      - Create an empty `MockQueryBus` (no responses registered)
      - Render `<ExampleListPage />` and wait for empty state
      - Expect "No items yet" text to appear
    - **Test: renders error state on query failure**
      - Create a `MockQueryBus` and call `setError()` for the list query key
      - Render `<ExampleListPage />` and wait for error
      - Expect "Failed to load items" text to appear

- [x] Task 4: Create ExampleDetailPage test (AC: #1, #2)
  - [x] 4.1: Create `templates/module/src/pages/ExampleDetailPage.test.tsx`:
    - Import `renderWithProviders` from `../testing/renderWithProviders`
    - Import `ExampleDetailPage` from `./ExampleDetailPage`
    - Import `exampleDetails` from `../data/sampleData`
    - Import `Routes`, `Route` from `react-router`
    - **Test: renders detail data for a specific item** (AC: #2 — useQuery with aggregateId)
      - Use the first sample detail item (`exampleDetails[0]`)
      - Render within `<Routes><Route path="/:id" element={<ExampleDetailPage />} /></Routes>` with `initialRoute` set to `"/${exampleDetails[0].id}"`
      - `await waitFor` for the item's name to appear
      - Verify "General Information" section fields: name, category, priority, status
      - Verify "Audit Trail" section: "Created By"
    - **Test: renders loading skeleton while data loads**
      - Use long-delay MockQueryBus
      - Verify loading skeleton renders
    - **Test: renders error state on failure**
      - Set error for detail query key
      - Verify "Failed to load item" appears

- [x] Task 5: Create ExampleCreatePage test (AC: #1, #2)
  - [x] 5.1: Create `templates/module/src/pages/ExampleCreatePage.test.tsx`:
    - Import `renderWithProviders` from `../testing/renderWithProviders`
    - Import `ExampleCreatePage` from `./ExampleCreatePage`
    - Import `screen`, `waitFor` from `@testing-library/react`
    - Import `userEvent` from `@testing-library/user-event`
    - **Test: renders create form with all fields**
      - Render `<ExampleCreatePage />` with `renderWithProviders`
      - Verify form fields present: "Name", "Description", "Category", "Priority"
      - Verify "Create" submit button and "Cancel" button
    - **Test: submits command via useCommandPipeline** (AC: #2 — useCommandPipeline submission)
      - Set up `userEvent.setup()`
      - Fill in form fields using `userEvent.type()` for name/description
      - **Radix Select interaction:** `@hexalith/ui`'s `<Select>` wraps Radix, NOT a native `<select>`. `userEvent.selectOptions()` will NOT work. Instead: click the trigger button to open the dropdown, then click the desired option item. Pattern: `await user.click(screen.getByRole('combobox', { name: /category/i }))` then `await user.click(screen.getByRole('option', { name: /Operations/i }))`. Verify against the actual Radix Select DOM structure in `packages/ui/src/components/forms/Select.tsx` if the role names differ
      - Click the "Create" button
      - Verify the `commandBus.getCalls()` has length >= 1 after submission
      - **IMPORTANT:** The `Form` component uses Zod validation — the test must provide valid data matching `CreateExampleCommandSchema` (name >= 3 chars, valid category, valid priority)
      - **PRE-FLIGHT:** Before writing this test, inspect the `<Select>` component's rendered DOM structure. Run a quick `render(<Select label="Test" options={[{value:"a",label:"A"}]} />)` + `screen.debug()` to see the actual ARIA roles (may be `combobox`+`option`, or `button`+`menuitem`). This determines the correct `getByRole` queries.
      - **Fallback strategy:** If `userEvent` interactions with Radix Form components don't trigger Zod validation reliably, consider splitting the test: (a) a simpler test that verifies the form renders all fields, and (b) a test that calls `commandBus.send()` directly (bypassing form UI) to verify the command pipeline works. This separates form-interaction concerns from command-pipeline concerns, making the tests more resilient
      - **Decision rule:** Attempt the click-trigger-then-click-option pattern first. If the test times out or can't find the trigger element after 2 attempts, switch to the fallback strategy. Do not spend more than 2 iterations debugging Radix Select interaction — the fallback is the correct path if the primary approach fails
    - **Test: shows disabled button during submission**
      - Use `MockCommandBus({ delay: 2000 })` for slow response
      - Fill and submit form
      - Verify the submit button becomes disabled and shows "Sending..." or "Confirming..."
    - **AC3 note (three-phase command lifecycle):** The `idle → sending → polling → completed` lifecycle is validated structurally — `useCommandPipeline` produces the correct status sequence by design (tested in `packages/cqrs-client`'s own hook tests). The scaffold test verifies the form triggers the pipeline and the pipeline completes. Testing intermediate status text transitions requires precise timing control which conflicts with the "no fake timers" constraint (anti-pattern #2). The scaffold tests verify the pipeline works end-to-end; the lifecycle phases are covered by the cqrs-client package's own test suite.

- [x] Task 6: Create Playwright component test with a11y check (AC: #4)
  - [x] 6.0: Create Playwright CT harness files (required by `@playwright/experimental-ct-react`):
    - Create `templates/module/playwright/index.html`:
      ```html
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
          <title>Testing</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="./index.tsx"></script>
        </body>
      </html>
      ```
    - Create `templates/module/playwright/index.tsx`:

      ```typescript
      import { beforeMount } from "@playwright/experimental-ct-react/hooks";
      import { MockShellProvider } from "@hexalith/shell-api";
      import { CqrsProvider } from "@hexalith/cqrs-client";
      import { MockCommandBus, MockQueryBus, MockSignalRHub } from "@hexalith/cqrs-client";
      import { ToastProvider } from "@hexalith/ui";
      import { MemoryRouter } from "react-router";
      import "@hexalith/ui/tokens.css"; // Or correct token import path — verify against @hexalith/ui exports
      import {
        exampleItems,
        exampleDetails,
        EXAMPLE_LIST_QUERY,
        EXAMPLE_DETAIL_QUERY,
      } from "../src/data/sampleData";

      beforeMount(async ({ App }) => {
        // Set body styles for correct axe-core contrast computation
        document.body.style.backgroundColor = "var(--color-surface-primary)";
        document.body.style.color = "var(--color-text-primary)";

        // Configure mock buses with sample data — build keys from query constants
        // to match the exact domain+queryType values the pages pass to useQuery
        const TENANT = "test-tenant"; // Matches MockShellProvider default
        const mockQueryBus = new MockQueryBus({ delay: 30 });
        mockQueryBus.setResponse(
          `${TENANT}:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`,
          exampleItems,
        );
        for (const detail of exampleDetails) {
          mockQueryBus.setResponse(
            `${TENANT}:${EXAMPLE_DETAIL_QUERY.domain}:${EXAMPLE_DETAIL_QUERY.queryType}:${detail.id}:`,
            detail,
          );
        }
        const mockCommandBus = new MockCommandBus({ delay: 50, defaultBehavior: "success" });
        const mockSignalRHub = new MockSignalRHub();

        return (
          <MockShellProvider>
            <CqrsProvider
              commandApiBaseUrl="http://localhost:mock"
              tokenGetter={async () => "dev-token"}
              signalRHub={mockSignalRHub}
              queryBus={mockQueryBus}
              commandBus={mockCommandBus}
            >
              <ToastProvider>
                <MemoryRouter>
                  <App />
                </MemoryRouter>
              </ToastProvider>
            </CqrsProvider>
          </MockShellProvider>
        );
      });
      ```

    - **CRITICAL:** Without these harness files, Playwright CT cannot mount components and `pnpm test:ct` will fail immediately. This follows the exact pattern from `packages/ui/playwright/index.tsx` but adds CQRS mock bus injection since the scaffold's pages use `useQuery` and `useCommandPipeline`.
    - The harness wraps ALL mounted components with providers — so the `.spec.tsx` tests do NOT need to hand-roll providers inside `mount()`.
    - **Vite resolution risk:** The harness imports `@hexalith/*` by package name. Playwright CT uses Vite under the hood to bundle the harness. In the monorepo, pnpm workspace links resolve these. But if Vite can't resolve them in the `playwright/` directory context, add `resolve.alias` entries to `playwright-ct.config.ts` pointing to workspace source paths, or switch to relative imports (e.g., `../../packages/shell-api/src`) like `packages/ui/playwright/index.tsx` does for tokens. Verify Vite resolution works before writing the `.spec.tsx` test.

  - [x] 6.1: Create `templates/module/playwright-ct.config.ts` — Playwright component test configuration:

    ```typescript
    import { defineConfig, devices } from "@playwright/experimental-ct-react";

    export default defineConfig({
      testDir: "./src",
      testMatch: "**/*.spec.tsx",
      use: {
        ctPort: 3101,
      },
      projects: [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] },
        },
      ],
    });
    ```

    Use port `3101` (different from UI package's `3100`) to avoid conflicts.

  - [x] 6.2: Create `templates/module/src/pages/ExampleListPage.spec.tsx`:
    - Import `test`, `expect` from `@playwright/experimental-ct-react`
    - Import `AxeBuilder` from `@axe-core/playwright`
    - Import `ExampleListPage` from `./ExampleListPage`
    - **Note:** The `playwright/index.tsx` harness (Task 6.0) wraps ALL mounted components with providers via `beforeMount`. This means `.spec.tsx` tests can simply `mount(<ExampleListPage />)` — no manual provider wrapping needed inside the test.
    - **Test: renders scaffold correctly and has no a11y violations**

      ```typescript
      test("ExampleListPage has no accessibility violations", async ({ mount, page }) => {
        // Providers are injected by playwright/index.tsx beforeMount hook
        await mount(<ExampleListPage />);

        // Wait for mock data to render in the table
        await page.waitForSelector("table");

        // Run axe-core accessibility check
        // Disable page-level rules (landmark-one-main, page-has-heading-one, region)
        // because this is a component test, not a full page
        const results = await new AxeBuilder({ page })
          .disableRules(["landmark-one-main", "page-has-heading-one", "region"])
          .analyze();
        expect(results.violations).toEqual([]);
      });
      ```

  - [x] 6.3: Update `templates/module/package.json` — add Playwright-related devDependencies:
    ```json
    "@playwright/experimental-ct-react": "^1.50.0",
    "@axe-core/playwright": "^4.10.0"
    ```
    Add script: `"test:ct": "playwright test -c playwright-ct.config.ts"`

- [x] Task 7: Update vitest.config.ts and package.json for test setup (AC: #1)
  - [x] 7.1: The vitest.config.ts update is handled in Task 1.2
  - [x] 7.2: Verify `templates/module/package.json` has all required test deps (most already exist from Story 4.1):
    - `@testing-library/react: "^16.0.0"` (exists)
    - `@testing-library/jest-dom: "^6.0.0"` (exists)
    - `jsdom: "^25.0.0"` (exists)
    - `vitest: "^3.0.0"` (exists)
    - Add `@testing-library/user-event: "^14.0.0"` (needed for form interaction tests in Task 5)
    - Add `@testing-library/dom: "^10.0.0"` (now a peer dep of `@testing-library/react` v16 — pnpm strict mode requires explicit install)
  - [x] 7.3: Add `"test:watch": "vitest"` script to `templates/module/package.json` for developer convenience (watch mode)

- [x] Task 8: Update tsconfig.templates.json to include test files (AC: #1)
  - [x] 8.1: Update `tools/create-hexalith-module/tsconfig.templates.json` — add test files and testing directory to the `include` array:
    ```json
    "include": [
      "templates/module/src/**/*.ts",
      "templates/module/src/**/*.tsx",
      "templates/module/dev-host/mockSetup.ts",
      "templates/module/dev-host/main.tsx"
    ]
    ```
    Test files (.test.tsx) are already covered by `templates/module/src/**/*.tsx`. But the `testing/` directory needs to be included — it's under `src/` so it's already in scope.
    **(CRITICAL) Add paths for test dependencies.** The current `tsconfig.templates.json` only has paths for `@hexalith/*`, `react-router`, and `zod`. The template directory has no `node_modules` — TypeScript cannot resolve test imports without explicit paths. **Add these path mappings:**
    ```json
    "paths": {
      "@hexalith/shell-api": ["../../packages/shell-api/src/index.ts"],
      "@hexalith/cqrs-client": ["../../packages/cqrs-client/src/index.ts"],
      "@hexalith/ui": ["../../packages/ui/src/index.ts"],
      "react-router": ["../../apps/shell/node_modules/react-router/dist/development/index.d.ts"],
      "zod": ["../../node_modules/.pnpm/zod@3.25.76/node_modules/zod/index.d.cts"],
      "vitest": ["../../node_modules/vitest/dist/index.d.ts"],
      "@testing-library/react": ["../../node_modules/@testing-library/react/types/index.d.ts"],
      "@testing-library/jest-dom/vitest": ["../../node_modules/@testing-library/jest-dom/vitest.d.ts"],
      "@testing-library/user-event": ["../../node_modules/@testing-library/user-event/dist/index.d.ts"]
    }
    ```
    **Note:** The exact paths to `.d.ts` files depend on the installed package versions. Verify the actual paths by running `find ../../node_modules -name "index.d.ts" -path "*/@testing-library/react/*"` (or equivalent). If the paths are wrong, `tsc` will fail with "Cannot find module" errors for test imports. The `@hexalith/*`, `react-router`, and `zod` paths already exist and work — extend the same pattern.
    **Without these paths, ALL test files will fail type-checking** even though they work fine in Vitest (which uses its own module resolution). This is a hard blocker — do this BEFORE writing test files to get early feedback.
  - [x] 8.2: Run `pnpm exec tsc -p tools/create-hexalith-module/tsconfig.templates.json` to verify all template files (including test files) compile cleanly. If test imports fail, fix the paths in 8.1 first

- [x] **DEFINITION OF DONE GATE — All previous tasks (1-8) must pass these verification checks before the story is complete. Do NOT mark the story as done until every check below passes.**

- [x] Task 9: Verification (AC: #1-#5)
  - [x] 9.1: Verify `pnpm test` from the monorepo root does NOT execute the template test files at `tools/create-hexalith-module/templates/module/src/**/*.test.tsx` directly. The root vitest config uses `projects: ["packages/*", "apps/*", "tools/*"]` which matches `tools/create-hexalith-module/` (the scaffold tool's own tests), NOT the nested `templates/module/` directory (which is not a workspace package). If the template `.test.tsx` files ARE picked up by the root config, they will fail because they lack workspace resolution context. Confirm: run `pnpm test` from root and check the test output does NOT include `ExampleListPage.test.tsx` etc. The template tests should only run when `pnpm test` is invoked from within a scaffolded module
  - [x] 9.2: Verify all `.test.tsx` files pass in Vitest without modifications
  - [x] 9.3: Verify the scaffold integration test (`tools/create-hexalith-module/src/integration.test.ts`) still passes — the new test files and testing directory should be picked up by the dynamic file comparison
  - [x] 9.4: Verify no `@radix-ui/*` direct imports, no `oidc-client-ts`, no `ky`, no `@tanstack/*` direct imports in test files — only `@hexalith/*` packages
  - [x] 9.5: Verify the `renderWithProviders` utility uses `MockShellProvider` (not hand-rolled providers)
  - [x] 9.6: Verify the `Example` prefix naming convention is consistent in all test files
  - [x] 9.7: Verify Playwright CT test passes and reports no a11y violations. **Prerequisite:** Run `npx playwright install chromium` first if Chromium is not already installed. This is a one-time setup step that should be noted in the template's README or package.json scripts (e.g., `"test:ct:install": "playwright install chromium"`)
  - [x] 9.8: Verify the scaffold engine (`tools/create-hexalith-module/src/scaffold.ts`) copies the `playwright/` directory to the generated module output. The existing integration test (`integration.test.ts`) dynamically compares all files in `templates/module/` to scaffold output — so `playwright/index.html` and `playwright/index.tsx` should be caught if missing. But verify the scaffold's directory traversal doesn't have an exclusion filter for `playwright/` or hidden directories. Run the integration test after adding the new files.
  - [x] 9.9: **(AC5 note)** Contract tests for mock/real parity already exist in `packages/cqrs-client/src/mocks/__contracts__/`. This story does NOT create new contract tests — it relies on the existing `commandBusContractTests` and `queryBusContractTests` suites that validate MockCommandBus/MockQueryBus behavior matches the real implementations. The scaffold's tests use these same mock classes, so contract test parity is inherited.

## Dev Notes

### Scope Boundaries — What This Story IS and IS NOT

**This story creates test files, test fixtures, and a renderWithProviders utility inside the scaffold template, plus one Playwright CT test with axe-core a11y check.**

**This story IS:**

- Test setup file with jsdom polyfills for `@hexalith/ui` Radix-based components
- `renderWithProviders` utility wrapping components in MockShellProvider + CqrsProvider + mock buses + MemoryRouter
- Vitest tests for ExampleListPage (loading, data fetch, empty, and error states)
- Vitest tests for ExampleDetailPage (detail data rendering with aggregateId)
- Vitest tests for ExampleCreatePage (form rendering, command submission via useCommandPipeline)
- One Playwright CT test for ExampleListPage with axe-core a11y validation
- Vitest config update with dual project strategy (unit + component)
- Package.json updates for missing test deps (@testing-library/user-event, Playwright, axe-core)

**This story is NOT:**

- Creating new page components (Story 4.2 — done)
- Wiring the dev-host (Story 4.3 — in-progress, but CqrsProvider mock bus injection is done)
- Creating contract test suites (already exist in `packages/cqrs-client/src/mocks/__contracts__/`)
- Adding E2E tests (those belong in future CI stories)
- Typed manifest contract (Story 4.5)
- Documentation (Story 4.6)

### Architecture Constraints — MUST Follow

**Priority guide:** Constraints marked **(CRITICAL)** are story-specific — violating them fails review.

1. **(CRITICAL) Tests must pass without modification.** All `.test.tsx` files must pass with `pnpm test` from the module root on the first run. If a test relies on async data, use `waitFor` with appropriate assertions. Do NOT use `setTimeout` or `vi.advanceTimersByTime` unless testing specific timing behavior — MockQueryBus already has built-in delay.

2. **(CRITICAL) renderWithProviders must use MockShellProvider.** Do NOT hand-roll auth/tenant/theme providers in the test utility. Use `MockShellProvider` from `@hexalith/shell-api` — it's the single source of truth. The nesting order must be: MockShellProvider → CqrsProvider → ToastProvider → MemoryRouter. [Source: architecture.md#Test fixtures are public API]

3. **(CRITICAL) MockQueryBus response keys must match useQuery's internal format.** Key format: `"${tenant}:${domain}:${queryType}:${aggregateId ?? ""}:${entityId ?? ""}"`. Default tenant = `"test-tenant"` from MockShellProvider. For list queries (no aggregateId/entityId): `"test-tenant:__MODULE_NAME__:ExampleList::"`. For detail queries: `"test-tenant:__MODULE_NAME__:ExampleDetail:<uuid>:"`. **Verify against MockQueryBus.ts before implementing.** [Source: packages/cqrs-client/src/mocks/MockQueryBus.ts]

4. **(CRITICAL) File naming conventions.** `.test.ts`/`.test.tsx` → Vitest. `.spec.ts`/`.spec.tsx` → Playwright. Vitest config must exclude `.spec.*` and Playwright config must only include `.spec.*`. [Source: architecture.md#Three-layer test separation]

5. **(CRITICAL) Mock fidelity.** MockCommandBus and MockQueryBus must be used with realistic delays (not `delay: 0`). Vitest tests: `delay: 30` for queries, `delay: 50` for commands. This tests async rendering patterns correctly. [Source: architecture.md#Mock Fidelity Standard]

6. **No barrel exports in sub-folders.** The `testing/` directory must NOT have an `index.ts`. Import directly: `import { renderWithProviders } from '../testing/renderWithProviders'`. [Source: architecture.md#Barrel Export Clarification]

7. **ESM-only, TypeScript strict mode.** All test code must be valid ESM. No `require()`. No `any` types. Use `vi.mock()` for module mocking (Vitest's ESM-compatible mock). [Source: root tsconfig]

8. **Module boundary enforcement in tests.** Test files may only import from: `react`, `react-dom`, `react-router`, `vitest`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`, and the module's own `../src` code. [Source: architecture.md#Package Dependency Rules]

9. **Example prefix naming convention.** All test files use `Example` prefix to match the page components they test: `ExampleListPage.test.tsx`, `ExampleDetailPage.test.tsx`, `ExampleCreatePage.test.tsx`. [Source: Story 4.1 Task 5.5]

10. **CSS Modules `non-scoped` strategy in test config.** Component tests (.test.tsx) need `css: { modules: { classNameStrategy: "non-scoped" } }` in vitest config so CSS class names are predictable (not hashed). This matches the `packages/ui/vitest.config.ts` pattern. [Source: packages/ui/vitest.config.ts]

### Existing Codebase Context — MUST Reference

**MockShellProvider (from `packages/shell-api/src/testing/MockShellProvider.tsx`):**

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

Default mock tenant = `"test-tenant"`. This value is used to construct MockQueryBus response keys.

**CqrsProvider (from `packages/cqrs-client/src/CqrsProvider.tsx`) — CURRENT STATE (Story 4.3 Task 0 done):**

```typescript
interface CqrsProviderProps {
  commandApiBaseUrl: string;
  tokenGetter: () => Promise<string | null>;
  children: ReactNode;
  signalRHub?: ISignalRHub;
  queryBus?: IQueryBus; // When provided, queries delegate here instead of HTTP
  commandBus?: ICommandBus; // When provided, commands delegate here instead of HTTP
}
```

When `queryBus`/`commandBus` are provided, CqrsProvider creates a `mockAwareFetchClient` adapter that delegates to the mock buses. Hooks (`useQuery`, `useCommandPipeline`) work unchanged.

**MockQueryBus API (from `packages/cqrs-client/src/mocks/MockQueryBus.ts`):**

```typescript
new MockQueryBus({ delay?: number }) // default: 30ms
mockQueryBus.setResponse(key: string, data: unknown): void
mockQueryBus.setError(key: string, error: Error): void
mockQueryBus.getCalls(): ReadonlyArray<MockQueryBusCall>
mockQueryBus.reset(): void
```

**Key format:** `"${request.tenant}:${request.domain}:${request.queryType}:${request.aggregateId ?? ""}:${request.entityId ?? ""}"`

**MockCommandBus API (from `packages/cqrs-client/src/mocks/MockCommandBus.ts`):**

```typescript
new MockCommandBus({ delay?: number, defaultBehavior?: "success" | "reject" | "timeout" | "publishFail" })
mockCommandBus.configureNextSend(behavior: MockSendBehavior): void
mockCommandBus.getCalls(): ReadonlyArray<MockCommandBusCall>
mockCommandBus.getLastCall(): MockCommandBusCall | undefined
mockCommandBus.reset(): void
```

**MockSignalRHub — just instantiate:**

```typescript
const mockHub = new MockSignalRHub(); // defaults to "connected" state
```

**useQuery hook signature:**

```typescript
useQuery<T>(schema: ZodSchema<T>, params: {
  domain: string, queryType: string, aggregateId?: string, entityId?: string
}, options?: { enabled?: boolean }) → { data: T | undefined, isLoading: boolean, error: HexalithError | null, refetch: () => void }
```

**useCommandPipeline hook signature:**

```typescript
useCommandPipeline() → {
  send: (command: SubmitCommandInput) => Promise<void>,
  status: 'idle' | 'sending' | 'polling' | 'completed' | 'rejected' | 'failed' | 'timedOut',
  error: HexalithError | null,
  correlationId: string | null,
}
```

**SubmitCommandInput fields (actual field names from codebase):**

```typescript
{
  commandType: string,  // NOT "commandName"
  domain: string,       // NOT "aggregateName"
  aggregateId: string,
  payload: unknown,     // NOT "body"
}
```

**ToastProvider (from `@hexalith/ui`):** Must be in the provider tree because `ExampleCreatePage` calls `useToast()`.

**MemoryRouter (from `react-router`):** Used in tests instead of `BrowserRouter`. Accepts `initialEntries={["/path"]}` to set the initial URL. The shell uses `react-router` v7 (unified package) — import from `"react-router"`, NOT `"react-router-dom"`.

**Sample data (from `templates/module/src/data/sampleData.ts`):**

```typescript
export const exampleItems: ExampleItem[]; // 12 items validated against schema
export const exampleDetails: ExampleDetail[]; // 12 detail records (items + notes + createdBy)
export const EXAMPLE_LIST_QUERY = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleList",
} as const;
export const EXAMPLE_DETAIL_QUERY = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleDetail",
} as const;
```

**Test setup patterns (from `packages/ui/src/test-setup.ts`):**

```typescript
// Polyfills for jsdom (required by Radix UI components)
HTMLElement.prototype.hasPointerCapture = () => false;
HTMLElement.prototype.setPointerCapture = () => {};
HTMLElement.prototype.releasePointerCapture = () => {};
HTMLElement.prototype.scrollIntoView = () => {};
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
afterEach(() => cleanup());
```

**Existing Playwright CT a11y test pattern (from `packages/ui/src/components/data-display/DetailView/DetailView.spec.tsx`):**

```typescript
import { test, expect } from '@playwright/experimental-ct-react';
import AxeBuilder from '@axe-core/playwright';

test('has no a11y violations', async ({ mount, page }) => {
  await mount(<Component />);
  const results = await new AxeBuilder({ page })
    .disableRules(['landmark-one-main', 'page-has-heading-one', 'region'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

**Contract tests (from `packages/cqrs-client/src/mocks/__contracts__/`):**

Contract tests are parameterized suites (`commandBusContractTests`, `queryBusContractTests`) that run the same assertions against both mock and real implementations. They validate: correlation ID format, async delay, rejection/timeout behavior, schema validation errors. The scaffold's tests use MockCommandBus/MockQueryBus which are already covered by these contract tests — no new contract tests needed in this story.

### Critical Anti-Patterns to Prevent

1. **Do NOT hand-roll providers in tests.** Use `renderWithProviders` with `MockShellProvider` — one source of truth.
2. **Do NOT use `vi.useFakeTimers()` for mock bus delays.** MockQueryBus and MockCommandBus have real `setTimeout` internally. Use `waitFor` instead of advancing timers. Fake timers would break the mock buses.
3. **Do NOT use `any` type in test files.** Import types from schemas and use `z.infer<>`.
4. **Do NOT import from `@testing-library/jest-dom` in test files.** It's imported globally via `test-setup.ts`.
5. **Do NOT create barrel exports in the `testing/` directory.** Import directly from `../testing/renderWithProviders`.
6. **Do NOT use `delay: 0` for mock buses.** Tests must verify async rendering patterns work correctly. Use `delay: 30` minimum.
7. **Do NOT use `enum`.** Use union types.
8. **Do NOT use inline styles.** CSS Modules or design tokens only (though test files typically don't need styles).
9. **Do NOT forget the `__MODULE_NAME__` placeholder in query keys.** The mock setup must use the literal `"__MODULE_NAME__"` string (it's a template placeholder that gets replaced during scaffold generation). Tests in the template directory use this literal value.
10. **Do NOT import from `react-router-dom`.** This project uses `react-router` v7 (unified package). Import `MemoryRouter`, `Routes`, `Route` from `"react-router"`.
11. **Do NOT create tests that depend on exact timing.** Use `waitFor` with assertions, not `setTimeout` or polling loops.
12. **Do NOT use `userEvent.selectOptions()` with Radix-based Select.** `@hexalith/ui`'s `<Select>` is not a native `<select>` — it's a Radix custom dropdown. Click the trigger, then click the option.
13. **Do NOT forget the Playwright CT harness files.** `playwright/index.html` and `playwright/index.tsx` are required for `@playwright/experimental-ct-react` to work. Without them, `pnpm test:ct` fails immediately.

### Troubleshooting — Common jsdom Test Failures

If tests fail with cryptic errors, check these common jsdom issues first:

| Error                                                               | Cause                                                   | Fix                                                                                                                                                                                             |
| ------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TypeError: element.scrollIntoView is not a function`               | Missing jsdom polyfill                                  | Add `HTMLElement.prototype.scrollIntoView = () => {};` to `test-setup.ts`                                                                                                                       |
| `TypeError: element.hasPointerCapture is not a function`            | Radix UI popovers/dialogs need pointer capture          | Add pointer capture polyfills to `test-setup.ts`                                                                                                                                                |
| `ReferenceError: ResizeObserver is not defined`                     | Radix components use ResizeObserver                     | Add `globalThis.ResizeObserver` polyfill to `test-setup.ts`                                                                                                                                     |
| `TypeError: window.matchMedia is not a function`                    | Theme detection in components                           | Add `window.matchMedia` polyfill to `test-setup.ts`                                                                                                                                             |
| `Warning: An update to X inside a test was not wrapped in act(...)` | Async state update after unmount                        | Ensure `cleanup()` runs in `afterEach` and `await waitFor` completes before test ends                                                                                                           |
| `MockQueryBus returns 404 / no data renders`                        | Response key mismatch                                   | Check the exact key format: `tenant:domain:queryType:aggregateId:entityId`. Log the key in MockQueryBus or check `mockQueryBus.getCalls()` to see what key was requested vs what was registered |
| `Form submit handler never fires`                                   | Radix form validation not triggered by synthetic events | Inspect DOM with `screen.debug()`, verify `userEvent` interactions match Radix component structure                                                                                              |
| `TypeError: crypto.randomUUID is not a function`                    | jsdom doesn't expose Node's `crypto.randomUUID()`       | Add conditional polyfill in `test-setup.ts` (see Task 1.1)                                                                                                                                      |

### Previous Story Intelligence (Stories 4.1, 4.2, 4.3)

**Story 4.1 (done) established:**

- CLI scaffold engine in `tools/create-hexalith-module/`
- Template files in `tools/create-hexalith-module/templates/module/`
- `tsconfig.templates.json` for template type-checking
- Two-tier string replacement: `__PLACEHOLDER__` tokens + `Example` prefix regex
- Integration test verifying scaffold output compiles via `tsc --noEmit`

**Story 4.2 (done) established:**

- `src/schemas/exampleSchemas.ts` — Zod schemas: `ExampleItemSchema`, `ExampleDetailSchema`, `CreateExampleCommandSchema`
- `src/pages/ExampleListPage.tsx` — useQuery + Table + loading/error/empty states
- `src/pages/ExampleDetailPage.tsx` — useQuery + DetailView with `:id` route param
- `src/pages/ExampleCreatePage.tsx` — useCommandPipeline + Form with Zod validation
- `src/data/sampleData.ts` — 12 validated items + detail records + query constants
- `src/routes.tsx` — lazy-loaded routes with code splitting
- `src/index.ts` — module entry point
- `src/css-modules.d.ts` — CSS module type declarations

**Key learnings from 4.2:**

- Shell uses `react-router` v7 (unified package, import from `"react-router"` not `"react-router-dom"`)
- `SubmitCommandInput` uses `commandType`, `domain`, `payload` (NOT `commandName`, `aggregateName`, `body`)
- CSS design tokens use numeric suffixes (`--spacing-2`, `--spacing-4`), not named ones (`--spacing-xs`)
- `SpacingScale` type uses numeric strings (`'0'`-`'8'`), not named tokens

**Story 4.3 (in-progress) established:**

- CqrsProvider now accepts optional `queryBus` and `commandBus` props
- `createMockAwareFetchClient` adapter delegates to mock buses when provided
- Mock adapter handles `/api/v1/queries` (via `postForQuery`), `/api/v1/commands` (via `post`), and `/api/v1/commands/status/*` (via `get`)
- Tests for CqrsProvider mock injection exist in `packages/cqrs-client/`

**Dependency:** Story 4.3's CqrsProvider mock bus injection is a hard prerequisite. If 4.3 is not complete, `renderWithProviders` cannot inject mock buses. Current CqrsProvider.tsx confirms this is already implemented.

### Commit Strategy

All changes in this story modify `tools/create-hexalith-module/templates/module/` (template files). A single commit is appropriate since these are all new test files within the scaffold template. If the Playwright CT config or package.json devDeps cause issues, they can be reverted independently, but a single commit is the default approach.

### Git Intelligence — Recent Commits

Last commit (`8558a02`) was Story 4.2 implementation — example module with CRUD pages, schemas, and sample data. Before that (`4bd8683`) was Story 4.1 — CLI scaffold engine. CqrsProvider changes from Story 4.3 may be in local state (not committed yet) or committed.

### Project Structure Notes

All new files go in `tools/create-hexalith-module/templates/module/`:

- New: `src/test-setup.ts` (jsdom polyfills + cleanup)
- New: `src/testing/renderWithProviders.tsx` (test utility)
- New: `src/pages/ExampleListPage.test.tsx` (Vitest — list page rendering + data fetch)
- New: `src/pages/ExampleDetailPage.test.tsx` (Vitest — detail page rendering)
- New: `src/pages/ExampleCreatePage.test.tsx` (Vitest — form + command submission)
- New: `src/pages/ExampleListPage.spec.tsx` (Playwright CT — a11y check)
- New: `playwright/index.html` (Playwright CT harness HTML)
- New: `playwright/index.tsx` (Playwright CT harness with providers + mock buses + design tokens)
- New: `playwright-ct.config.ts` (Playwright CT configuration)
- Modified: `vitest.config.ts` (dual project strategy + setup file)
- Modified: `package.json` (add @testing-library/user-event, @testing-library/dom, @playwright/experimental-ct-react, @axe-core/playwright devDeps + test:ct script)

The `templates/module/` directory is the scaffold blueprint — files here are copied verbatim (with placeholder replacement) to the generated module.

### References

- [Source: epics.md#Story 4.4] — Full acceptance criteria and FRs
- [Source: architecture.md#Test fixtures are public API] — MockShellProvider, MockCommandBus, MockQueryBus are platform exports
- [Source: architecture.md#Contract Testing Required] — Parameterized test suites for mock/real parity
- [Source: architecture.md#Mock Fidelity Standard] — Realistic async timing required
- [Source: architecture.md#Three-Layer Test Separation] — .test.tsx = Vitest, .spec.tsx = Playwright
- [Source: architecture.md#Accessibility Testing Required] — axe-core runs on every PR
- [Source: packages/ui/vitest.config.ts] — Dual project strategy pattern (unit + component)
- [Source: packages/ui/src/test-setup.ts] — jsdom polyfills pattern
- [Source: packages/ui/src/test-utils/a11y-helpers.ts] — axe-core a11y testing pattern
- [Source: packages/ui/playwright-ct.config.ts] — Playwright CT configuration pattern
- [Source: packages/ui/src/components/data-display/DetailView/DetailView.spec.tsx] — Playwright CT a11y test pattern
- [Source: packages/cqrs-client/src/CqrsProvider.tsx] — CqrsProvider with mock bus injection (Story 4.3)
- [Source: packages/cqrs-client/src/mocks/MockQueryBus.ts] — Response key format, setResponse API
- [Source: packages/cqrs-client/src/mocks/MockCommandBus.ts] — Command bus mock config
- [Source: packages/cqrs-client/src/mocks/MockSignalRHub.ts] — SignalR hub mock
- [Source: packages/cqrs-client/src/mocks/__contracts__/] — Contract tests for mock/real parity
- [Source: packages/shell-api/src/testing/MockShellProvider.tsx] — MockShellProvider props and defaults
- [Source: Story 4.1 — 4-1-create-hexalith-module-cli.md] — CLI scaffold engine, template structure
- [Source: Story 4.2 — 4-2-scaffold-example-code-premium-showcase.md] — Page components, schemas, sample data, key learnings
- [Source: Story 4.3 — 4-3-dev-host-for-independent-module-development.md] — CqrsProvider mock bus injection, dev-host architecture

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- tsc compilation initially failed for `.spec.tsx` (missing `@playwright/experimental-ct-react` and `@axe-core/playwright` path mappings) — resolved by adding paths to `tsconfig.templates.json`
- `renderWithProviders` return type inference failed (TS2742: reference to `pretty-format`) — resolved by adding explicit `RenderResult & { queryBus; commandBus }` return type annotation
- Template `.test.tsx` files were initially picked up by the scaffold tool's own vitest config — resolved by adding `exclude: ["templates/**"]` to `tools/create-hexalith-module/vitest.config.ts`
- Integration test `tsc --noEmit` check failed for scaffolded test files (missing test dep path mappings) — resolved by adding test dependency paths to integration test's inline tsconfig

### Completion Notes List

- Created `test-setup.ts` with all jsdom polyfills matching `packages/ui/src/test-setup.ts` pattern, plus `matchMedia` and `crypto.randomUUID` polyfills
- Created `renderWithProviders` test utility with MockShellProvider → CqrsProvider → ToastProvider → MemoryRouter nesting, pre-configured MockQueryBus/MockCommandBus with sample data
- Created ExampleListPage.test.tsx: 4 tests (loading, data fetch, empty state, error state)
- Created ExampleDetailPage.test.tsx: 3 tests (detail data rendering, loading skeleton, error state)
- Created ExampleCreatePage.test.tsx: 3 tests (form rendering, command submission via useCommandPipeline, disabled button during submission)
- Created Playwright CT harness (playwright/index.html, playwright/index.tsx) with full provider + mock bus setup
- Created ExampleListPage.spec.tsx: 1 Playwright CT test with axe-core a11y check
- Updated vitest.config.ts to dual project strategy (unit + component with jsdom)
- Updated package.json with @testing-library/user-event, @testing-library/dom, @playwright/experimental-ct-react, @axe-core/playwright devDeps plus test:ct and test:watch scripts
- Updated tsconfig.templates.json with test dependency path mappings
- Updated scaffold tool's vitest.config.ts to exclude templates/ directory
- Updated integration test with test dependency path mappings for scaffolded output tsc check
- All 37 scaffold tool tests pass (including integration test with type-check)
- No regressions in monorepo test suite (only pre-existing CssLayerSmoke timeout in @hexalith/ui)

### Change Log

- 2026-03-21: Story 4.4 implementation — scaffolded tests and test fixtures

### File List

New files:

- tools/create-hexalith-module/templates/module/src/test-setup.ts
- tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx
- tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.test.tsx
- tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.test.tsx
- tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.test.tsx
- tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.spec.tsx
- tools/create-hexalith-module/templates/module/playwright/index.html
- tools/create-hexalith-module/templates/module/playwright/index.tsx
- tools/create-hexalith-module/templates/module/playwright-ct.config.ts

Modified files:

- tools/create-hexalith-module/templates/module/vitest.config.ts
- tools/create-hexalith-module/templates/module/package.json
- tools/create-hexalith-module/tsconfig.templates.json
- tools/create-hexalith-module/vitest.config.ts
- tools/create-hexalith-module/src/integration.test.ts
