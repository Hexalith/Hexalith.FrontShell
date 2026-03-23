# Module Development Lifecycle

Complete reference for developing a Hexalith module — from manifest definition to shell integration.

## Manifest definition

Every module declares a manifest that tells the shell what routes and navigation entries to register. The manifest is defined using the `ModuleManifest` type from `@hexalith/shell-api`.

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/manifest.ts
import type { ModuleManifest } from "@hexalith/shell-api";

export const manifest: ModuleManifest = {
  /** Schema version — always 1 for now. */
  manifestVersion: 1,

  /** Unique kebab-case identifier used in route prefixes and internal lookups. */
  name: "__MODULE_NAME__",

  /** Human-readable label shown in navigation and page titles. */
  displayName: "__MODULE_DISPLAY_NAME__",

  /** SemVer string; updated on each release. */
  version: "0.1.0",

  /** Route definitions — each `path` is relative to the module's mount point. */
  routes: [{ path: "/" }, { path: "/detail/:id" }, { path: "/create" }],

  /** Sidebar / top-nav entries. `path` must match a declared route. */
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

**Key fields:**

| Field             | Description                                                                     |
| ----------------- | ------------------------------------------------------------------------------- |
| `manifestVersion` | Always `1` for the current schema                                               |
| `name`            | Kebab-case identifier (e.g., `my-orders`) — used in route prefixes              |
| `displayName`     | Human-readable name for UI display                                              |
| `version`         | SemVer string — update on each release                                          |
| `routes`          | Array of `{ path }` declarations — paths are relative to the module mount point |
| `navigation`      | Array of sidebar/nav entries with `label`, `path`, `icon`, and `category`       |

Routes are path declarations, not runtime route objects. The shell reads them at composition time to generate the actual route configuration.

The shell validates manifests at build time using `validateManifest()` from `@hexalith/shell-api`. Invalid manifests block the build with clear error messages.

## CQRS hook usage

The Hexalith frontend uses a CQRS (Command Query Responsibility Segregation) pattern. You never call backend endpoints directly — CQRS hooks abstract all HTTP communication, auth headers, correlation IDs, and status polling.

### Which hook should I use?

| Hook                   | Purpose                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `useSubmitCommand`     | Fire-and-forget — you send a command and handle the result yourself                     |
| `useCommandPipeline`   | Full lifecycle with automatic status polling and UI states (recommended for most cases) |
| `useCommandStatus`     | Manually poll a command you already submitted                                           |
| `useQuery`             | Read projection data                                                                    |
| `useCanExecuteCommand` | Check authorization before showing a create/edit/delete button                          |
| `useCanExecuteQuery`   | Check authorization before showing a data view                                          |

### Sending commands

Use `useSubmitCommand` for fire-and-forget commands, or `useCommandPipeline` for the full command lifecycle with status tracking.

**`useCommandPipeline`** — full lifecycle with status polling:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx
import { useCommandPipeline } from "@hexalith/cqrs-client";

export function ExampleCreatePage() {
  const { send, status, error } = useCommandPipeline();

  const handleSubmit = async (data: CreateExampleInput) => {
    await send({
      commandType: "CreateExample",
      domain: "__MODULE_NAME__",
      aggregateId: crypto.randomUUID(),
      payload: data,
    });
  };

  const isBusy = status === "sending" || status === "polling";
  // ...
}
```

The `SubmitCommandInput` shape:

```typescript
{
  commandType: string;   // Fully qualified command type name
  domain: string;        // Domain/aggregate root
  aggregateId: string;   // Target aggregate
  payload: unknown;      // Domain-specific command data
  extensions?: Record<string, string>;  // Optional metadata
}
```

**Status flow:** `idle` → `sending` → `polling` → `completed` | `rejected` | `failed` | `timedOut`

The hook handles the full command lifecycle: submit → poll status → completed/rejected. Your component just reads `status` and reacts.

### Querying projections

Use `useQuery` to fetch read-optimized projection data. The hook validates responses against a Zod schema at runtime.

**List query pattern:**

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx
import { useQuery } from "@hexalith/cqrs-client";
import { z } from "zod";

const ExampleListSchema = z.array(ExampleItemSchema);

const EXAMPLE_LIST_PARAMS = {
  domain: "__MODULE_NAME__",
  queryType: "ExampleList",
} as const;

export function ExampleListPage() {
  const { data, isLoading, error, refetch } = useQuery(
    ExampleListSchema,
    EXAMPLE_LIST_PARAMS,
  );
  // ...
}
```

**Detail query pattern:**

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.tsx
import { useQuery } from "@hexalith/cqrs-client";

function buildExampleDetailParams(id: string) {
  return {
    domain: "__MODULE_NAME__",
    queryType: "ExampleDetail",
    aggregateId: id,
  };
}

export function ExampleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useQuery(
    ExampleDetailSchema,
    buildExampleDetailParams(id ?? ""),
    { enabled: !!id },
  );
  // ...
}
```

**`QueryParams` shape:**

| Field         | Description                                                          |
| ------------- | -------------------------------------------------------------------- |
| `domain`      | The domain name (e.g., your module name)                             |
| `queryType`   | The projection query type (e.g., `"ExampleList"`, `"ExampleDetail"`) |
| `aggregateId` | Optional — target aggregate for single-entity queries                |

### Backend context

The CQRS hooks abstract these endpoints — you never call them directly:

| Endpoint                           | Purpose                                                          |
| ---------------------------------- | ---------------------------------------------------------------- |
| `POST /api/v1/commands`            | Submit a command → 202 + `{ correlationId }`                     |
| `GET /api/v1/commands/status/{id}` | Poll command status → `CommandStatusResponse`                    |
| `POST /api/v1/queries`             | Query a projection → 200 + `{ correlationId, payload }` + `ETag` |

## UI component patterns

Modules use `@hexalith/ui` components for consistent design. For interactive component documentation, run `pnpm storybook` (or `pnpm -F @hexalith/ui storybook`).

### List page pattern

Combines `Table` with `useQuery`:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx
import {
  Button,
  EmptyState,
  ErrorDisplay,
  PageLayout,
  Skeleton,
  Table,
} from "@hexalith/ui";

export function ExampleListPage() {
  const { data, isLoading, error, refetch } = useQuery(
    ExampleListSchema,
    EXAMPLE_LIST_PARAMS,
  );
  // ...
  if (isLoading) {
    return (
      <PageLayout title="__MODULE_DISPLAY_NAME__">
        <Skeleton variant="table" rows={5} />
      </PageLayout>
    );
  }
  // ...
  return (
    <PageLayout
      title="__MODULE_DISPLAY_NAME__"
      actions={<Button variant="primary" onClick={handleCreate}>Create New</Button>}
    >
      <Table
        data={data}
        columns={columns}
        sorting
        pagination={{ pageSize: 10 }}
        globalSearch
        onRowClick={handleRowClick}
        caption="__MODULE_DISPLAY_NAME__ items"
      />
    </PageLayout>
  );
}
```

### Detail page pattern

Combines `DetailView` with `useQuery`:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.tsx
import { DetailView, PageLayout, Skeleton } from "@hexalith/ui";

// ...
return (
  <PageLayout title={data.name} subtitle="Item Details">
    <DetailView
      sections={[
        {
          title: "General Information",
          fields: [
            { label: "Name", value: data.name },
            { label: "Description", value: data.description ?? "—" },
            { label: "Category", value: data.category },
            // ...
          ],
        },
        // ...
      ]}
    />
  </PageLayout>
);
```

### Create page pattern

Combines `Form` with `useCommandPipeline` and Zod validation:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx
import { useCommandPipeline } from "@hexalith/cqrs-client";
import {
  Button,
  Form,
  FormField,
  Input,
  Select,
  TextArea,
} from "@hexalith/ui";
import { CreateExampleCommandSchema } from "../schemas/exampleSchemas.js";

export function ExampleCreatePage() {
  const { send, status, error } = useCommandPipeline();
  // ...
  return (
    <PageLayout title="Create __MODULE_DISPLAY_NAME__">
      <Form schema={CreateExampleCommandSchema} onSubmit={handleSubmit}>
        <FormField name="name">
          <Input label="Name" placeholder="Enter a descriptive name" required />
        </FormField>
        <FormField name="description">
          <TextArea label="Description" rows={3} />
        </FormField>
        <FormField name="category">
          <Select label="Category" options={CATEGORY_OPTIONS} required />
        </FormField>
        <FormField name="priority">
          <Select label="Priority" options={PRIORITY_OPTIONS} required />
        </FormField>
        <Inline gap="2">
          <Button variant="ghost" type="reset" onClick={handleCancel}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isBusy}>
            {status === "sending" ? "Sending…" : status === "polling" ? "Confirming…" : "Create"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
```

## Zod schema creation

Zod schemas serve dual purpose: runtime validation and TypeScript type inference.

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/schemas/exampleSchemas.ts
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

**Pattern rules:**

- Define schemas in `src/schemas/` using kebab-case filenames
- Derive TypeScript types with `z.infer<typeof Schema>` — don't manually define interfaces
- Use union types (`z.union([z.literal(...)])`) — not enums
- Schemas validate both on form submission (client-side) and on query response (server-side via `useQuery`)

## Testing strategy

### Test runners

| Runner        | File pattern | Purpose                                       |
| ------------- | ------------ | --------------------------------------------- |
| Vitest        | `*.test.tsx` | Unit tests — fast, JSDOM-based                |
| Playwright CT | `*.spec.tsx` | Component tests — real browser, accessibility |

### Test utilities

The scaffold provides `renderWithProviders` — a wrapper that sets up all required providers:

```typescript
// See full file: tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx
import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions, RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import {
  CqrsProvider,
  MockCommandBus,
  MockQueryBus,
  MockSignalRHub,
} from "@hexalith/cqrs-client";
import {
  MockShellProvider,
  createMockTenantContext,
} from "@hexalith/shell-api";
import { ToastProvider } from "@hexalith/ui";

import {
  EXAMPLE_DETAIL_QUERY,
  EXAMPLE_LIST_QUERY,
  exampleDetails,
  exampleItems,
} from "../data/sampleData.js";
```

Further down, the same file defines `createConfiguredQueryBus()`, `createConfiguredCommandBus()`, and `renderWithProviders()` to wire `MockShellProvider`, `CqrsProvider`, `ToastProvider`, and `MemoryRouter` together.

**Mock buses:**

- `MockCommandBus` — configure `delay` and `defaultBehavior` (`"success"` or `"rejected"`)
- `MockQueryBus` — register responses per query key with `setResponse(key, data)` or errors with `setError(key, error)`

## Dev host usage

The dev host (`dev-host/main.tsx`) wraps your module in shell providers with mock data, letting you develop independently:

```typescript
// See full file: tools/create-hexalith-module/templates/module/dev-host/main.tsx
import { CqrsProvider } from "@hexalith/cqrs-client";
import { MockShellProvider } from "@hexalith/shell-api";
import { ToastProvider } from "@hexalith/ui";
import { BrowserRouter, Route, Routes } from "react-router";

import { routes } from "../src/routes.js";
import { mockCommandBus, mockQueryBus, mockSignalRHub } from "./mockSetup.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MockShellProvider>
      <CqrsProvider
        commandApiBaseUrl="http://localhost:mock"
        tokenGetter={async () => "dev-token"}
        signalRHub={mockSignalRHub}
        queryBus={mockQueryBus}
        commandBus={mockCommandBus}
      >
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              {routes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </CqrsProvider>
    </MockShellProvider>
  </StrictMode>,
);
```

**What the dev host provides:**

- `MockShellProvider` — mock authentication (dev user), tenant context, theme, locale
- `CqrsProvider` with mock buses — commands succeed/fail per configuration, queries return sample data
- HMR via Vite — edits appear instantly without full page reload
- Standalone development — no need to clone or run the full shell

Configure mock responses in `dev-host/mockSetup.ts`:

```typescript
// See full file: tools/create-hexalith-module/templates/module/dev-host/mockSetup.ts
import {
  MockCommandBus,
  MockQueryBus,
  MockSignalRHub,
} from "@hexalith/cqrs-client";

export const mockQueryBus = new MockQueryBus({ delay: 300 });
export const mockCommandBus = new MockCommandBus({
  delay: 500,
  defaultBehavior: "success",
});
export const mockSignalRHub = new MockSignalRHub();

// Configure query responses
const listKey = `test-tenant:${EXAMPLE_LIST_QUERY.domain}:${EXAMPLE_LIST_QUERY.queryType}::`;
mockQueryBus.setResponse(listKey, exampleItems);
// ...
```

## Shell integration via git submodule

When your module is ready for production:

**Developer steps (you):**

1. Create a GitHub repository for your module
2. Push your module code
3. Tag a release version (e.g., `v0.1.0`)

**Shell team steps (handoff point):**

1. Shell team runs `git submodule add <your-repo-url> modules/<module-name>`
2. Shell CI validates your manifest using `validateManifest()` from `@hexalith/shell-api`
3. Shell build auto-discovers your module from `modules/*/src/manifest.ts` and `modules/*/src/index.ts`, then includes its routes and navigation entries

**Verification (you):**

1. Confirm your module appears in the shell navigation
2. Verify all routes work (list, detail, create)

The shell reads your `manifest.ts` at build time. If the manifest is invalid (missing required fields, invalid route paths, etc.), the build fails with descriptive error messages.

## Module Publishing

Foundation packages (`@hexalith/shell-api`, `@hexalith/cqrs-client`, `@hexalith/ui`) are published to GitHub Packages so external teams can develop modules outside the shell workspace.

### External consumer setup

To install Hexalith foundation packages from GitHub Packages:

**1. Configure `.npmrc`** in your module repository:

```ini
@hexalith:registry=https://npm.pkg.github.com
```

**2. Authentication** — GitHub Packages requires authentication even for public packages:

- Create a GitHub Personal Access Token (PAT) with `read:packages` scope
- Add to your `.npmrc` (do NOT commit this line):

  ```ini
  //npm.pkg.github.com/:_authToken=YOUR_TOKEN
  ```

- Or set the `NODE_AUTH_TOKEN` environment variable:

  ```bash
  export NODE_AUTH_TOKEN=YOUR_TOKEN
  ```

**3. Install packages:**

```bash
pnpm add @hexalith/shell-api @hexalith/cqrs-client @hexalith/ui
```

### Versioning policy

During **0.x development**, any minor bump (e.g., 0.1.0 to 0.2.0) may contain breaking changes. External module developers should pin exact versions during the 0.x phase:

```json
{
  "peerDependencies": {
    "@hexalith/shell-api": "0.1.0",
    "@hexalith/cqrs-client": "0.2.0",
    "@hexalith/ui": "0.1.0"
  }
}
```

Starting at **1.0.0**, foundation packages will follow strict semver:

- **Patch** (1.0.x): bug fixes only
- **Minor** (1.x.0): backward-compatible new features
- **Major** (x.0.0): breaking changes

### Submodule update workflow (shell team)

When a module developer pushes updates to their module repository:

1. Update the submodule reference:

   ```bash
   git submodule update --remote modules/<module-name>
   ```

2. Verify the update passes CI:

   ```bash
   pnpm install
   pnpm turbo build
   pnpm turbo test
   pnpm turbo lint
   ```

3. Commit the updated submodule pin:

   ```bash
   git add modules/<module-name>
   git commit -m "chore: update <module-name> submodule to latest"
   ```

4. The submodule pin only advances when the full CI pipeline passes. This ensures that module updates don't break the shell.

### Adding a new module submodule

```bash
git submodule add <repo-url> modules/<module-name>
pnpm install
pnpm turbo build && pnpm turbo test
```

If the new module's `@hexalith/*` peer dependency range does not match the workspace versions, `pnpm install` prints a warning that identifies the mismatch and the module `package.json` that should be updated.

The module must:

- Export a valid `ModuleManifest` from its entry point
- List `@hexalith/shell-api`, `@hexalith/cqrs-client`, and `@hexalith/ui` as `peerDependencies`
- Include matching `workspace:*` entries in `devDependencies` for workspace resolution
- Follow the module boundary rules (no deep imports, no cross-module dependencies)
