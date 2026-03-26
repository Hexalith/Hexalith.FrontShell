# E2E & Component Testing Guide

How to write, run, and maintain browser-level tests in Hexalith FrontShell.

## Test Types at a Glance

| Type | Framework | Pattern | Location | Scope |
|------|-----------|---------|----------|-------|
| Unit | Vitest | `*.test.ts` | Co-located with source | Pure functions, utils |
| Component (Vitest) | Vitest + jsdom | `*.test.tsx` | Co-located with source | React components in jsdom |
| Component (Playwright CT) | Playwright CT | `*.spec.tsx` | Co-located with source | Visual regression, a11y |
| E2E | Playwright | `*.spec.ts` | `apps/shell/e2e/` | Full application flows |
| Contract | Vitest | `*.contract.test.ts` | `packages/cqrs-client/src/contracts/` | API shape verification |

## When to Use What

- **Unit/component test** — Logic, rendering, state. Fast, runs in jsdom.
- **Playwright CT** — Visual regression screenshots, accessibility validation, theme testing. Runs in a real browser.
- **E2E** — Multi-page user workflows: navigation, form submission, toast feedback, error recovery. Runs the full shell with mock providers.
- **Contract test** — Validates frontend expectations of backend HTTP API shapes.

---

## E2E Tests

### Configuration

E2E config lives at `apps/shell/e2e/playwright.config.ts`:

- **Browser:** Chromium (Desktop Chrome)
- **Base URL:** `http://localhost:4173` (Vite preview server)
- **Timeout:** 30s per test
- **Retries:** 2 in CI, 0 locally
- **Workers:** 1 in CI (serial), unlimited locally (parallel)
- **Trace:** Captured on first retry
- **Reporter:** HTML (`playwright-report/`)

### How E2E Mocking Works

The shell swaps providers at build time via `apps/shell/vite.config.e2e.ts`:

1. A custom Vite plugin intercepts imports of `./providers/ShellProviders`
2. It redirects to `src/providers/ShellProviders.e2e.tsx`
3. That file wires up `MockCommandBus`, `MockQueryBus`, and `MockSignalRHub` with pre-loaded sample data

No real backend is needed. Mock buses simulate delays and success/failure responses.

### Mock Data

Two tenant contexts are pre-configured:

- **tenant-alpha** — 5 tenants (Acme, TechVentures, Northern Logistics, Horizon Healthcare, Summit Engineering)
- **tenant-beta** — 3 tenants (BlueSky Retail, Cedar Health, Lighthouse Education)

Query responses are keyed as `{tenantId}:{domain}:{queryType}::{aggregateId}:`.

### Writing an E2E Test

Tests live in `apps/shell/e2e/` and use the shared fixtures:

```ts
import { test, expect, checkAccessibility } from "./fixtures/test-fixtures";

// AC: 6-4#7 — E2E tenant create flow
test.describe("Tenants Create", () => {
  test("validates form, submits, shows toast, redirects", async ({ page }) => {
    await page.goto("/tenants");
    await expect(page.getByRole("table")).toBeVisible();

    // Navigate to create
    await page.getByRole("button", { name: /create tenant/i }).click();
    await expect(page).toHaveURL(/\/tenants\/create$/);

    // Trigger validation
    await page.getByRole("button", { name: /create tenant/i }).click();
    await expect(page.getByText(/required/i).first()).toBeVisible();

    // Fill and submit
    await page.getByLabel(/name/i).fill("Test Corp");
    await page.getByLabel(/code/i).fill("test-corp");
    await page.getByRole("button", { name: /create tenant/i }).click();

    // Verify outcome
    await expect(page.getByText("Tenant created").first()).toBeVisible();
    await expect(page).toHaveURL(/\/tenants$/);
  });

  test("accessibility on create page", async ({ page }) => {
    await page.goto("/tenants/create");
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await checkAccessibility(page);
  });
});
```

### Key Patterns

- **Locators:** Prefer `getByRole()`, `getByLabel()`, `getByText()` — semantic over CSS selectors.
- **Waits:** Built into locators. Use explicit waits only when needed.
- **Accessibility:** Call `checkAccessibility(page)` on stable pages — runs axe-core WCAG 2a + 2aa.
- **AC Markers:** Add `// AC: story-id#criterion` at the top of describe blocks for traceability.
- **Theme testing:** Use `page.emulateMedia({ colorScheme: "dark" })` then verify `data-theme="dark"` on `<html>`.

### Running E2E Tests

```bash
# From apps/shell
pnpm test:e2e

# With UI mode (interactive debugging)
pnpm test:e2e -- --ui

# Single file
pnpm test:e2e -- tenants-create.spec.ts

# With trace viewer after failure
pnpm test:e2e -- --trace on
```

### Existing E2E Tests

| File | Covers |
|------|--------|
| `tenants-create.spec.ts` | Form validation, submission, toast, redirect |
| `tenants-navigation.spec.ts` | List → detail → back, accessibility (light + dark) |
| `tenants-switching.spec.ts` | Tenant context switching, data refresh |
| `tenants-error-recovery.spec.ts` | Module error boundary, retry flow |

---

## Component Tests (Playwright CT)

### Configuration

Config at `packages/ui/playwright-ct.config.ts`:

- **Port:** 3100 (UI), 3103 (tenants), 3101 (template)
- **File pattern:** `**/*.spec.tsx`
- **Snapshot diff:** 1% pixel tolerance (`maxDiffPixelRatio: 0.01`)
- **Snapshot path:** `__snapshots__/{testFilePath}/{arg}{ext}`

### Visual Regression

```tsx
import { test, expect } from "@playwright/experimental-ct-react";
import { setDarkTheme } from "../../test-utils/a11y-helpers";

test("button variants - light", async ({ mount, page }) => {
  await mount(
    <Inline gap="2">
      <Button variant="primary">Create</Button>
      <Button variant="secondary">Edit</Button>
    </Inline>
  );
  await expect(page).toHaveScreenshot("button-variants-light.png");
});

test("button variants - dark", async ({ mount, page }) => {
  await mount(/* same */);
  await setDarkTheme(page);
  await expect(page).toHaveScreenshot("button-variants-dark.png");
});
```

### Accessibility Testing

Two helpers in `packages/ui/src/test-utils/a11y-helpers.ts`:

| Helper | Use When |
|--------|----------|
| `expectNoA11yViolations(page)` | Testing isolated components (disables page-level rules like `landmark-one-main`) |
| `expectNoCompositionA11yViolations(page)` | Testing full page compositions (validates landmarks, heading hierarchy) |

```tsx
test("no a11y violations", async ({ mount, page }) => {
  await mount(<Select options={options} />);
  const violations = await expectNoA11yViolations(page);
  expect(violations).toEqual([]);
});
```

### Updating Snapshots

```bash
# Regenerate all reference screenshots
pnpm test:ct -- --update-snapshots

# Single file
pnpm test:ct -- Button.spec.tsx --update-snapshots
```

### Running Component Tests

```bash
# From packages/ui
pnpm test:ct

# Single file
pnpm test:ct -- Button.spec.tsx

# With debug mode
pnpm test:ct -- --debug
```

---

## CI Pipeline Integration

Tests run in this order in `.github/workflows/ci.yml`:

1. **Vitest** (`pnpm turbo test -- --coverage`) — unit + component tests with coverage thresholds
2. **Test Quality** (`pnpm check:test-quality --changed-only`) — deterministic, isolated, explicit, focused, fast
3. **Contract Verification** — validates ≥1 contract test, 0 failures
4. **E2E** (`pnpm --filter @hexalith/shell test:e2e`) — full browser tests
5. **Component Tests** (`pnpm --filter @hexalith/ui test:ct`) — visual regression + a11y

### Coverage Thresholds

| Package Type | Threshold |
|-------------|-----------|
| Foundation (`ui`, `cqrs-client`, `shell-api`) | 95% |
| Modules and apps | 80% |

---

## Test Quality Standards

Five automated checks via `pnpm check:test-quality`:

1. **Deterministic** — No raw `setTimeout`, `Date.now()` without `vi.useFakeTimers()`
2. **Isolated** — `beforeAll` must have matching `afterAll`
3. **Explicit** — Every test file must contain ≥1 `expect()`
4. **Focused** — Test files ≤ 300 lines (warns at 250)
5. **Fast** — No network client imports in test files (except `contracts/` dirs)

Suppress with `// quality-ignore` on the line above.

---

## Adding E2E Tests for a New Module

1. Add mock data to `apps/shell/src/providers/ShellProviders.e2e.tsx`
2. Register query responses keyed as `{tenantId}:{Domain}:{QueryType}::{aggregateId}:`
3. Create `apps/shell/e2e/{module-name}-{scenario}.spec.ts`
4. Import fixtures: `import { test, expect, checkAccessibility } from "./fixtures/test-fixtures"`
5. Add AC markers: `// AC: story-id#criterion`
6. Run locally: `pnpm --filter @hexalith/shell test:e2e`

---

## Standalone Module Development

Each module includes a `dev-host/` directory for isolated development:

```bash
cd modules/hexalith-tenants
pnpm dev
```

The dev-host provides mock providers (auth, tenant, CQRS) with sample data, so you can develop and manually test without the full shell.
