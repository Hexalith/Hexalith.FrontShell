# Getting Started

```bash
pnpm create hexalith-module my-orders && cd hexalith-my-orders && pnpm install && pnpm dev
```

Have a working module in 2 minutes if you already have registry access. Read on for setup details.

**Time estimate:** ~30 minutes from "I have registry access" to "my module runs in the dev host."

## Prerequisites

- **Node.js 22+** — [Download](https://nodejs.org/)
- **pnpm 9+** — Install via `corepack enable && corepack prepare pnpm@latest --activate`
- **Git** — [Download](https://git-scm.com/)

### GitHub Packages access

Hexalith packages are published to the `@hexalith` GitHub Packages scope. To install them, configure your `.npmrc`:

```ini
@hexalith:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

Set `GITHUB_TOKEN` to a GitHub personal access token with the `read:packages` scope.

**To request access:** Contact the Hexalith platform team or your organization admin to be added as a collaborator on the `@hexalith` scope. Once granted, generate a PAT with `read:packages` and set it as shown above.

## Scaffold your module

Run the scaffold CLI with your module name (kebab-case):

```bash
pnpm create hexalith-module my-orders
```

This creates a `hexalith-my-orders/` directory with the following structure:

```text
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

## Run the dev host

```bash
cd hexalith-my-orders
pnpm install
pnpm dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`). You'll see:

- **Mock authentication** — a pre-configured dev user is logged in automatically
- **Mock CQRS** — commands and queries are handled by in-memory mock buses with sample data
- **Three pages** — a list page (table with sorting, filtering, search), a detail page, and a create form

The dev host wraps your module in `MockShellProvider` and `CqrsProvider` with mock buses, so you can develop without cloning the shell repo. HMR is enabled — edits appear instantly.

## Modify the example

The scaffold generates a working example with placeholder names. To make it your own:

1. Replace `Example` with your domain entity name throughout `src/` (e.g., `Order`, `Product`)
2. Update the Zod schemas in `src/schemas/` with your domain fields
3. Modify the pages in `src/pages/` to show your domain data
4. Update `src/manifest.ts` with your module's display name and navigation icon

The scaffold-generated manifest looks like this:

```typescript
// See full file: src/manifest.ts
import type { ModuleManifest } from "@hexalith/shell-api";

export const manifest: ModuleManifest = {
  manifestVersion: 1,
  name: "__MODULE_NAME__",
  displayName: "__MODULE_DISPLAY_NAME__",
  version: "0.1.0",
  routes: [{ path: "/" }, { path: "/detail/:id" }, { path: "/create" }],
  navigation: [
    {
      label: "__MODULE_DISPLAY_NAME__",
      path: "/",
      icon: "box",
      category: "Modules",
    },
  ],
};
```

> The `__MODULE_NAME__` and `__MODULE_DISPLAY_NAME__` tokens are replaced by the scaffold CLI with your chosen module name.

## Add domain types

Create Zod schemas in `src/schemas/` to define your domain types. Zod schemas serve dual purpose: runtime validation and TypeScript type inference.

Here's the pattern from the scaffold template:

```typescript
// See full file: src/schemas/exampleSchemas.ts
import { z } from "zod";

const ExampleIdentifierSchema = z.string().uuid("ID must be a valid UUID");
const ExampleNameSchema = z
  .string()
  .min(3, "Name must be at least 3 characters")
  .max(200)
  .regex(
    /^[A-Za-z0-9][A-Za-z0-9 .,'&()/-]*$/,
    "Name can include letters, numbers, spaces, and common punctuation only",
  );
const ExampleCategorySchema = z
  .string()
  .min(2, "Category must be at least 2 characters")
  .max(100)
  .regex(
    /^[A-Za-z][A-Za-z &/-]*$/,
    "Category can include letters, spaces, ampersands, hyphens, and slashes only",
  );
const ExampleTimestampSchema = z.string().datetime({
  offset: true,
  message: "Timestamp must be a valid ISO 8601 date",
});

export const ExampleItemSchema = z.object({
  id: ExampleIdentifierSchema,
  name: ExampleNameSchema,
  status: z.union([
    z.literal("Active"),
    z.literal("Inactive"),
    z.literal("Pending"),
    z.literal("Archived"),
  ]),
  description: z.string().max(500).optional(),
  category: ExampleCategorySchema,
  priority: z.union([
    z.literal("Low"),
    z.literal("Medium"),
    z.literal("High"),
    z.literal("Critical"),
  ]),
  createdAt: ExampleTimestampSchema,
  updatedAt: ExampleTimestampSchema,
});

/** Inferred type — use this instead of manually defining interfaces */
export type ExampleItem = z.infer<typeof ExampleItemSchema>;
```

Replace `Example` with your domain entity name (e.g., `OrderItemSchema`, `OrderItem`). Use `z.infer<typeof Schema>` to derive TypeScript types — never define interfaces by hand when a Zod schema exists.
The same file also defines `ExampleDetailSchema`, `CreateExampleCommandSchema`, and `CreateExampleInput` using the same pattern.

## Write tests

The scaffold includes test infrastructure for both unit tests and component tests.

**Vitest unit test** — uses `renderWithProviders` to wrap components with mock providers:

```typescript
// See full file: src/pages/ExampleListPage.test.tsx
import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { renderWithProviders } from "../testing/renderWithProviders";
import { ExampleListPage } from "./ExampleListPage";
import { exampleItems, EXAMPLE_LIST_QUERY } from "../data/sampleData.js";

describe("ExampleListPage", () => {
  it("renders loading state initially", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`;
    slowQueryBus.setResponse(listKey, exampleItems);

    renderWithProviders(<ExampleListPage />, { queryBus: slowQueryBus });

    expect(
      screen.getByRole("status", { name: /loading content/i }),
    ).toBeInTheDocument();
  });

  it("renders sample data in table after load", async () => {
    renderWithProviders(<ExampleListPage />);

    await waitFor(() => {
      expect(screen.getByText("Project Atlas")).toBeInTheDocument();
    });
    // ...
  });
});
```

**Playwright Component Test** — tests accessibility with axe-core:

```typescript
// See full file: src/pages/ExampleListPage.spec.tsx
import { test, expect } from "@playwright/experimental-ct-react";
import AxeBuilder from "@axe-core/playwright";

import { ExampleListPage } from "./ExampleListPage";

test("ExampleListPage has no accessibility violations", async ({ mount, page }) => {
  await mount(<ExampleListPage />);
  await page.waitForSelector("table");

  const results = await new AxeBuilder({ page })
    .disableRules(["landmark-one-main", "page-has-heading-one", "region"])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

Run tests with:

```bash
pnpm test          # Vitest unit tests
pnpm test:ct       # Playwright component tests
```

## Integrate with shell

Once your module is ready:

```bash
git init
git add -A
git commit -m "feat: initial module scaffold"
```

Push to a GitHub repository.

**Developer steps** (you):

1. Create a GitHub repo for your module
2. Push your module code

**Shell team steps** (handoff point):

1. Shell team runs `git submodule add <your-repo-url>`
2. Shell CI validates your manifest
3. Shell build includes your module's routes and navigation

## Troubleshooting

**Registry auth failure (401 from npm)**
Check your `.npmrc` has the correct `@hexalith:registry` line and that `GITHUB_TOKEN` is set with `read:packages` scope.

**Node version mismatch**
The project requires Node.js 22+. Run `node -v` to check. Use [nvm](https://github.com/nvm-sh/nvm) or [fnm](https://github.com/Schniz/fnm) to manage versions.

**`pnpm install` peer dependency warnings**
These are informational — the scaffold's `package.json` pins compatible versions. Warnings can be safely ignored.

**Dev host port conflict**
If port 5173 is in use, Vite automatically picks the next available port. Check the terminal output for the actual URL.
