# New Module Generation

<!-- Verified against bundle v0.1.0 -->

Generate a complete Hexalith module from a domain description. Produces: manifest, Zod schemas, list/detail/create pages, routes, index, tests, sample data, CSS modules, and dev-host mock setup.

## Input Parameters

| Parameter          | Format           | Example                                                              |
| ------------------ | ---------------- | -------------------------------------------------------------------- |
| Module name        | kebab-case       | `order-management`                                                   |
| Domain description | Free text        | "Order management for tracking customer orders and their line items" |
| Entity list        | PascalCase names | `Order`, `OrderItem`                                                 |
| Command list       | Verb + Entity    | `CreateOrder`, `CancelOrder`                                         |
| Projection list    | Entity + suffix  | `OrderList`, `OrderDetail`                                           |

**Reserved module names** (cannot be used): `shell`, `shell-api`, `cqrs-client`, `ui`, `tsconfig`, `eslint-config`

## Clarifying Questions

Before generating, ask the user about:

1. **Status fields** — What are the valid status values? (e.g., `Draft | Confirmed | Shipped | Cancelled`)
2. **Optional vs required fields** — Which fields can be omitted at creation?
3. **Entity relationships** — Are there nested entities? (e.g., Order → OrderItem[])
4. **Date/timestamp fields** — Beyond createdAt/updatedAt, any domain dates? (e.g., shippedAt, dueDate)
5. **Destructive operations** — Are any commands destructive? (delete, cancel, disable require `<AlertDialog>` confirmation)

## Knowledge Bundle References

Read these files before generating — they are the single source of truth:

| File                                              | What to extract                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| [manifest-schema.json](../manifest-schema.json)   | Manifest structure and validation                                     |
| [manifest-guide.md](../manifest-guide.md)         | Field rules and examples                                              |
| [cqrs-hooks.md](../cqrs-hooks.md)                 | Hook signatures: `useQuery`, `useCommandPipeline`, `useSubmitCommand` |
| [ui-components.md](../ui-components.md)           | Component props: `Table`, `DetailView`, `Form`, `FormField`, etc.     |
| [conventions.md](../conventions.md)               | File naming, import ordering, code naming                             |
| [scaffold-structure.md](../scaffold-structure.md) | Directory layout and state handling patterns                          |
| [UX Interaction Patterns](../../../design-artifacts/C-UX-Scenarios/ux-interaction-patterns.md) | Mandatory page templates, navigation, formatting, styling rules       |
| [test-fixtures.md](../test-fixtures.md)           | `MockQueryBus`, `MockCommandBus`, `renderWithProviders`               |

## Generation Instructions

Generate files in this order. Each subsection shows the target code pattern.

### 1. Manifest (`src/manifest.ts`)

```typescript
import type { ModuleManifest } from "@hexalith/shell-api";

export const manifest: ModuleManifest = {
  manifestVersion: 1,
  name: "{module-name}", // kebab-case input
  displayName: "{Display Name}", // human-readable
  version: "0.1.0",
  routes: [{ path: "/" }, { path: "/detail/:id" }, { path: "/create" }],
  navigation: [
    {
      label: "{Display Name}",
      path: "/",
      icon: "{icon}", // choose from: box, list, file-text, settings, users, package
      category: "Modules",
    },
  ],
};
```

Every route in the manifest **must** have a matching lazy import in `routes.tsx`.

### 2. Zod Schemas (`src/schemas/{entity}Schemas.ts`)

```typescript
import { z } from "zod";

// Reusable field schemas at top
const {Entity}IdentifierSchema = z.string().uuid("ID must be a valid UUID");
const {Entity}NameSchema = z.string().min(3, "Name must be at least 3 characters").max(200);
const TimestampSchema = z.string().datetime({ offset: true, message: "Must be a valid ISO 8601 date" });

// List item schema — fields visible in the table
export const {Entity}ItemSchema = z.object({
  id: {Entity}IdentifierSchema,
  name: {Entity}NameSchema,
  status: z.union([z.literal("Active"), z.literal("Inactive")]),  // use domain-specific values
  // ... domain fields
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type {Entity}Item = z.infer<typeof {Entity}ItemSchema>;

// Detail schema — extends list with extra fields
export const {Entity}DetailSchema = {Entity}ItemSchema.extend({
  // audit and detail-only fields
  notes: z.string().max(2000).optional(),
  createdBy: z.string().min(1),
});
export type {Entity}Detail = z.infer<typeof {Entity}DetailSchema>;

// Command schema — validated client-side (form) and server-side (event store)
export const Create{Entity}CommandSchema = z.object({
  name: {Entity}NameSchema,
  // ... user-provided fields (no id, no timestamps, no createdBy)
});
export type Create{Entity}Input = z.infer<typeof Create{Entity}CommandSchema>;
```

**Domain modeling rules:**

- Nested entities → separate schema files (e.g., `orderSchemas.ts` + `orderItemSchemas.ts`)
- One-to-many → array field in detail schema: `items: z.array(OrderItemSchema)`
- Optional fields → `z.optional()` or `.optional()`
- Status/enum fields → `z.union([z.literal("A"), z.literal("B")])` — never TypeScript enums
- UUID fields → not rendered in forms (auto-generated)

**Field-type-to-component mapping** (for form generation):

| Zod Field Type                    | UI Component   | Notes                                  |
| --------------------------------- | -------------- | -------------------------------------- |
| `z.string()` (short)              | `<Input>`      | Default for strings ≤200 chars         |
| `z.string()` (long, `.max(500+)`) | `<TextArea>`   | Use `rows={3}` default                 |
| `z.union([z.literal(...)])`       | `<Select>`     | Map literals to `options` array        |
| `z.string().datetime()`           | `<DatePicker>` | For date/timestamp fields              |
| `z.boolean()`                     | `<Checkbox>`   | With label prop                        |
| `z.string().uuid()`               | —              | Not rendered in forms (auto-generated) |

### 3. List Page (`src/pages/{Entity}ListPage.tsx`)

```typescript
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";

import { useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  EmptyState,
  ErrorDisplay,
  PageLayout,
  Skeleton,
  Table,
} from "@hexalith/ui";
import type { TableColumn } from "@hexalith/ui";

import styles from "./{Entity}ListPage.module.css";
import { {Entity}ItemSchema } from "../schemas/{entity}Schemas.js";

const {Entity}ListSchema = z.array({Entity}ItemSchema);
type {Entity}Item = z.infer<typeof {Entity}ItemSchema>;

const {ENTITY}_LIST_PARAMS = {
  domain: "{module-name}",
  queryType: "{Entity}List",
} as const;

// Status variant map for CSS module classes
const STATUS_VARIANT: Record<string, string> = {
  // Map each domain status to a CSS class: e.g., Active: styles.statusActive
};

const columns = [
  // Define columns with id, header, accessorKey, isSortable, isFilterable
  // Status columns: use cell renderer with STATUS_VARIANT styling
  // Date columns: use Intl.DateTimeFormat in cell renderer
] satisfies TableColumn<{Entity}Item>[];

export function {Entity}ListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    {Entity}ListSchema,
    {ENTITY}_LIST_PARAMS,
  );

  const handleRowClick = useCallback(
    (row: {Entity}Item) => { navigate(`detail/${row.id}`); },
    [navigate],
  );
  const handleCreate = useCallback(() => { navigate("create"); }, [navigate]);

  // THREE STATES — always in this order:
  if (isLoading) {
    return (
      <PageLayout title="{Display Name}">
        <Skeleton variant="table" rows={5} />
      </PageLayout>
    );
  }
  if (error) {
    return (
      <PageLayout title="{Display Name}">
        <ErrorDisplay error={error} title="Failed to load {domain items}" onRetry={refetch} />
      </PageLayout>
    );
  }
  if (!data || data.length === 0) {
    return (
      <PageLayout title="{Display Name}" actions={<Button variant="primary" onClick={handleCreate}>Create New</Button>}>
        <EmptyState
          title="No {domain items} yet"
          description="Create your first {domain item} to get started"
          action={{ label: "Create {Entity}", onClick: handleCreate }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="{Display Name}" actions={<Button variant="primary" onClick={handleCreate}>Create New</Button>}>
      <Table
        data={data}
        columns={columns}
        sorting
        pagination={{ pageSize: 10 }}
        globalSearch
        onRowClick={handleRowClick}
        caption="{Display Name} items"
      />
    </PageLayout>
  );
}
```

**Critical:** All user-facing text (page titles, toasts, empty states, button labels) must use domain-specific language — not generic placeholders like "Item created" or "No items yet".

### 4. Detail Page (`src/pages/{Entity}DetailPage.tsx`)

```typescript
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";

import { useQuery } from "@hexalith/cqrs-client";
import {
  Button,
  DetailView,
  ErrorDisplay,
  Inline,
  PageLayout,
  Skeleton,
} from "@hexalith/ui";

import { {Entity}DetailSchema } from "../schemas/{entity}Schemas.js";

function build{Entity}DetailParams(id: string) {
  return {
    domain: "{module-name}",
    queryType: "{Entity}Detail",
    aggregateId: id,
  };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function {Entity}DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    {Entity}DetailSchema,
    build{Entity}DetailParams(id ?? ""),
    { enabled: !!id },
  );

  const handleBack = useCallback(() => { navigate(".."); }, [navigate]);

  if (isLoading) {
    return <PageLayout title="{Entity} Details"><Skeleton variant="detail" fields={6} /></PageLayout>;
  }
  if (error) {
    return <PageLayout title="{Entity} Details"><ErrorDisplay error={error} title="Failed to load {entity}" onRetry={refetch} /></PageLayout>;
  }
  if (!data) return null;

  return (
    <PageLayout
      title={data.name}
      subtitle="{Entity} Details"
      actions={
        <Inline gap="2">
          <Button variant="ghost" onClick={handleBack}>Back</Button>
          <Button variant="secondary">Edit</Button>
          <Button variant="secondary">Delete</Button>
        </Inline>
      }
    >
      <DetailView
        sections={[
          {
            title: "General Information",
            fields: [
              // All domain-specific fields (name, status, category, etc.)
            ],
          },
          {
            title: "Audit Trail",
            fields: [
              { label: "Created By", value: data.createdBy },
              { label: "Created At", value: formatDate(data.createdAt) },
              { label: "Updated At", value: formatDate(data.updatedAt) },
            ],
          },
        ]}
      />
    </PageLayout>
  );
}
```

**Section grouping rule:**

- **Primary section** ("General Information"): All domain-specific fields
- **Audit Trail section**: Timestamps and system fields
- Additional sections for logical groupings if entity has 8+ fields

### 5. Create Page (`src/pages/{Entity}CreatePage.tsx`)

```typescript
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

import { useCommandPipeline } from "@hexalith/cqrs-client";
import {
  Button,
  ErrorDisplay,
  Form,
  FormField,
  Input,
  Inline,
  PageLayout,
  Select,
  TextArea,
  useToast,
} from "@hexalith/ui";

import { Create{Entity}CommandSchema } from "../schemas/{entity}Schemas.js";
import type { Create{Entity}Input } from "../schemas/{entity}Schemas.js";

// Options arrays for Select fields — derive from Zod union literals
const STATUS_OPTIONS = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

export function {Entity}CreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { send, status, error } = useCommandPipeline();

  useEffect(() => {
    if (status !== "completed") return;
    toast({
      variant: "success",
      title: "{Entity} created",          // domain-specific!
      description: "The {entity} has been created successfully.",
    });
    navigate("..");
  }, [navigate, status, toast]);

  const handleSubmit = useCallback(
    async (data: Create{Entity}Input) => {
      await send({
        commandType: "Create{Entity}",
        domain: "{module-name}",
        aggregateId: crypto.randomUUID(),
        payload: data,
      });
    },
    [send],
  );

  const handleCancel = useCallback(() => { navigate(".."); }, [navigate]);

  const isBusy = status === "sending" || status === "polling";
  const statusMessage =
    status === "sending" ? "Sending command..."
    : status === "polling" ? "Waiting for confirmation..."
    : status === "rejected" ? "The command was rejected. Review and try again."
    : status === "failed" ? "The command failed. Review the error and retry."
    : status === "timedOut" ? "The command timed out. Retry when the service is responsive."
    : null;

  return (
    <PageLayout title="Create {Display Name}">
      {statusMessage && !error && <p>{statusMessage}</p>}
      {error && <ErrorDisplay error={error} title="Command failed" />}

      <Form schema={Create{Entity}CommandSchema} onSubmit={handleSubmit}>
        {/* Map each schema field to FormField + component per field-type mapping */}
        <FormField name="name">
          <Input label="{Entity} Name" placeholder="Enter {entity} name" required />
        </FormField>
        {/* ... more fields ... */}

        <Inline gap="2">
          <Button variant="ghost" type="reset" onClick={handleCancel}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isBusy}>
            {status === "sending" ? "Sending..." : status === "polling" ? "Confirming..." : "Create"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
```

**Destructive operations:** If a command is destructive (delete, cancel, disable), wrap the trigger button in `<AlertDialog>` for confirmation before sending.

### 6. Edit Page (`src/pages/{Entity}EditPage.tsx`)

Same structure as Create Page with these differences:

- Title: `"Edit {Display Name}"`
- Load existing data with `useQuery` and pass as `defaultValues` to `<Form>`
- Command type: `Update{Entity}` with the existing record's `id` (not `crypto.randomUUID()`)
- On success: navigate to `../detail/${id}` (back to detail), not `..` (list)
- Add route `{ path: "/edit/:id" }` to manifest and routes.tsx
- Cancel navigates to `../detail/${id}`

```typescript
export function {Entity}EditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { send, status, error } = useCommandPipeline();
  const { data, isLoading, error: loadError, refetch } = useQuery(
    {Entity}DetailSchema,
    build{Entity}DetailParams(id ?? ""),
    { enabled: !!id },
  );

  useEffect(() => {
    if (status !== "completed") return;
    toast({ variant: "success", title: "{Entity} updated" });
    navigate(`../detail/${id}`);
  }, [navigate, status, toast, id]);

  const handleSubmit = useCallback(
    async (formData: Update{Entity}Input) => {
      await send({
        commandType: "Update{Entity}",
        domain: "{module-name}",
        aggregateId: id!,
        payload: formData,
      });
    },
    [send, id],
  );

  const isBusy = status === "sending" || status === "polling";

  if (isLoading) return <PageLayout title="Edit {Display Name}"><Skeleton variant="form" /></PageLayout>;
  if (loadError) return <PageLayout title="Edit {Display Name}"><ErrorDisplay error={loadError} onRetry={refetch} /></PageLayout>;
  if (!data) return null;

  return (
    <PageLayout title="Edit {Display Name}">
      {error && <ErrorDisplay error={error} title="Command failed" />}
      <Form schema={Update{Entity}CommandSchema} onSubmit={handleSubmit} defaultValues={data}>
        {/* Same FormField layout as Create page */}
        <Inline gap="2">
          <Button variant="ghost" onClick={() => navigate(`../detail/${id}`)}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={isBusy}>
            {isBusy ? "Saving..." : "Save"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
```

Also generate `Update{Entity}CommandSchema` in the schemas file — typically the same fields as Create but all optional (partial update).

### 7. CSS Module (`src/pages/{Entity}ListPage.module.css`)

```css
@layer components {
  .statusBadge {
    display: inline-flex;
    align-items: center;
    padding: var(--spacing-1) var(--spacing-2);
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-sm);
    background-color: var(--color-surface-secondary);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    line-height: 1;
  }

  /* One variant class per status value — use --color-status-* tokens */
  .statusActive {
    border-color: var(--color-status-success);
    color: var(--color-status-success);
  }

  .statusInactive {
    border-color: var(--color-border-default);
    color: var(--color-text-tertiary);
  }
}
```

**Rules:** CSS class names must be camelCase. No hardcoded colors — use `--hx-*` or `--color-*` design tokens only.

### 8. Routes (`src/routes.tsx`)

```typescript
import { lazy, Suspense } from "react";

import { Skeleton } from "@hexalith/ui";

const {Entity}ListPage = lazy(() =>
  import("./pages/{Entity}ListPage.js").then((m) => ({ default: m.{Entity}ListPage })),
);
const {Entity}DetailPage = lazy(() =>
  import("./pages/{Entity}DetailPage.js").then((m) => ({ default: m.{Entity}DetailPage })),
);
const {Entity}CreatePage = lazy(() =>
  import("./pages/{Entity}CreatePage.js").then((m) => ({ default: m.{Entity}CreatePage })),
);

function {Entity}Suspense({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Skeleton variant="card" />}>{children}</Suspense>;
}

export function {Entity}RootPage() {
  return <{Entity}Suspense><{Entity}ListPage /></{Entity}Suspense>;
}

export const routes = [
  { path: "/", element: <{Entity}Suspense><{Entity}ListPage /></{Entity}Suspense> },
  { path: "/detail/:id", element: <{Entity}Suspense><{Entity}DetailPage /></{Entity}Suspense> },
  { path: "/create", element: <{Entity}Suspense><{Entity}CreatePage /></{Entity}Suspense> },
];
```

### 9. Index (`src/index.ts`)

```typescript
export { {Entity}RootPage as default } from "./routes.js";
export { manifest } from "./manifest.js";
export { routes } from "./routes.js";

export type { {Entity}Item, {Entity}Detail, Create{Entity}Input } from "./schemas/{entity}Schemas.js";
export { {Entity}ItemSchema, {Entity}DetailSchema, Create{Entity}CommandSchema } from "./schemas/{entity}Schemas.js";
```

### 10. Sample Data (`src/data/sampleData.ts`)

```typescript
import {
  {Entity}DetailSchema,
  {Entity}ItemSchema,
  type {Entity}Detail,
  type {Entity}Item,
} from "../schemas/{entity}Schemas.js";

export const LIST_QUERY = {
  domain: "{module-name}",
  queryType: "{Entity}List",
} as const;

export const DETAIL_QUERY = {
  domain: "{module-name}",
  queryType: "{Entity}Detail",
} as const;

// Realistic sample data — use domain-specific vocabulary, NOT placeholder text
export const {entity}Items: {Entity}Item[] = {Entity}ItemSchema.array().parse([
  // 5-12 items with realistic domain data and varied status values
]);

export const {entity}Details: {Entity}Detail[] = {Entity}DetailSchema.array().parse(
  {entity}Items.map((item) => ({
    ...item,
    notes: `Working notes for ${item.name}.`,
    createdBy: "system@hexalith.io",
  })),
);
```

### 11. Test File (`src/pages/{Entity}ListPage.test.tsx`)

```typescript
import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { renderWithProviders } from "../testing/renderWithProviders";
import { {Entity}ListPage } from "./{Entity}ListPage";
import { {entity}Items, LIST_QUERY } from "../data/sampleData.js";

describe("{Entity}ListPage", () => {
  it("renders loading state initially", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${LIST_QUERY.domain}:${LIST_QUERY.queryType}::`;
    slowQueryBus.setResponse(listKey, {entity}Items);

    renderWithProviders(<{Entity}ListPage />, { queryBus: slowQueryBus });
    expect(screen.getByRole("status", { name: /loading content/i })).toBeInTheDocument();
  });

  it("renders data in table after load", async () => {
    renderWithProviders(<{Entity}ListPage />);
    await waitFor(() => {
      expect(screen.getByText("{first sample item name}")).toBeInTheDocument();
    });
    // Verify column headers
  });

  it("renders empty state when no data", async () => {
    const emptyQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${LIST_QUERY.domain}:${LIST_QUERY.queryType}::`;
    emptyQueryBus.setResponse(listKey, []);

    renderWithProviders(<{Entity}ListPage />, { queryBus: emptyQueryBus });
    await waitFor(() => {
      expect(screen.getByText("No {domain items} yet")).toBeInTheDocument();
    });
  });

  it("renders error state on query failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${LIST_QUERY.domain}:${LIST_QUERY.queryType}::`;
    errorQueryBus.setError(listKey, new Error("Network error"));

    renderWithProviders(<{Entity}ListPage />, { queryBus: errorQueryBus });
    await waitFor(() => {
      expect(screen.getByText("Failed to load {domain items}")).toBeInTheDocument();
    });
  });
});
```

### 12. Test Utility (`src/testing/renderWithProviders.tsx`)

Copy this file **verbatim** from the scaffold template (`tools/create-hexalith-module/templates/module/src/testing/renderWithProviders.tsx`), only changing:

- Import paths for sample data and schemas (replace `Example` → `{Entity}`)
- Query constants (replace `EXAMPLE_LIST_QUERY` → `LIST_QUERY`, `EXAMPLE_DETAIL_QUERY` → `DETAIL_QUERY`)

### 13. Dev-Host Mock Setup (`dev-host/mockSetup.ts`)

Register sample data with the mock query bus for the dev host environment. Follow the pattern in `tools/create-hexalith-module/templates/module/dev-host/mockSetup.ts`, using the query constants and sample data exported from `src/data/sampleData.ts`.

## Complete Worked Example

**Input:**

- Module name: `task-management`
- Domain: "Task management with tasks and projects"
- Entities: `Task`
- Commands: `CreateTask`
- Projections: `TaskList`, `TaskDetail`
- Statuses: `Todo`, `InProgress`, `Done`, `Cancelled`

**Output files:**

**`src/manifest.ts`:**

```typescript
import type { ModuleManifest } from "@hexalith/shell-api";

export const manifest: ModuleManifest = {
  manifestVersion: 1,
  name: "task-management",
  displayName: "Task Management",
  version: "0.1.0",
  routes: [{ path: "/" }, { path: "/detail/:id" }, { path: "/create" }],
  navigation: [
    { label: "Tasks", path: "/", icon: "list", category: "Modules" },
  ],
};
```

**`src/schemas/taskSchemas.ts`:**

```typescript
import { z } from "zod";

const TaskIdentifierSchema = z.string().uuid("Task ID must be a valid UUID");
const TaskNameSchema = z
  .string()
  .min(3, "Task name must be at least 3 characters")
  .max(200);
const TimestampSchema = z
  .string()
  .datetime({ offset: true, message: "Must be a valid ISO 8601 date" });

export const TaskItemSchema = z.object({
  id: TaskIdentifierSchema,
  name: TaskNameSchema,
  status: z.union([
    z.literal("Todo"),
    z.literal("InProgress"),
    z.literal("Done"),
    z.literal("Cancelled"),
  ]),
  description: z.string().max(500).optional(),
  priority: z.union([
    z.literal("Low"),
    z.literal("Medium"),
    z.literal("High"),
    z.literal("Critical"),
  ]),
  assignee: z.string().optional(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type TaskItem = z.infer<typeof TaskItemSchema>;

export const TaskDetailSchema = TaskItemSchema.extend({
  notes: z.string().max(2000).optional(),
  createdBy: z.string().min(1),
});
export type TaskDetail = z.infer<typeof TaskDetailSchema>;

export const CreateTaskCommandSchema = z.object({
  name: TaskNameSchema,
  description: z.string().max(500).optional(),
  priority: z.union([
    z.literal("Low"),
    z.literal("Medium"),
    z.literal("High"),
    z.literal("Critical"),
  ]),
  assignee: z.string().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskCommandSchema>;
```

**`src/pages/TaskListPage.tsx`** (key excerpt):

```typescript
const TASK_LIST_PARAMS = {
  domain: "task-management",
  queryType: "TaskList",
} as const;

const columns = [
  { id: "name", header: "Task Name", accessorKey: "name", isSortable: true, isFilterable: true, filterType: "text" },
  {
    id: "status", header: "Status", accessorKey: "status", isSortable: true, isFilterable: true,
    filterType: "select",
    filterOptions: [
      { label: "Todo", value: "Todo" },
      { label: "In Progress", value: "InProgress" },
      { label: "Done", value: "Done" },
      { label: "Cancelled", value: "Cancelled" },
    ],
    cell: ({ value }) => <span className={`${styles.statusBadge} ${STATUS_VARIANT[value as string] ?? ""}`}>{value as string}</span>,
  },
  { id: "priority", header: "Priority", accessorKey: "priority", isSortable: true },
  { id: "assignee", header: "Assignee", accessorKey: "assignee", isSortable: true },
  {
    id: "createdAt", header: "Created", accessorKey: "createdAt", isSortable: true,
    cell: ({ value }) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value as string)),
  },
] satisfies TableColumn<TaskItem>[];

// Empty state uses domain language:
<EmptyState
  title="No tasks yet"
  description="Create your first task to get started"
  action={{ label: "Create Task", onClick: handleCreate }}
/>
```

**`src/pages/TaskListPage.test.tsx`** (key excerpt):

```typescript
describe("TaskListPage", () => {
  it("renders loading state initially", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${TASK_LIST_QUERY.domain}:${TASK_LIST_QUERY.queryType}::`;
    slowQueryBus.setResponse(listKey, taskItems);
    renderWithProviders(<TaskListPage />, { queryBus: slowQueryBus });
    expect(screen.getByRole("status", { name: /loading content/i })).toBeInTheDocument();
  });
});
```

## Quality Checklist

Before considering generation complete, verify **every** item:

- [ ] Module name is not in the reserved list
- [ ] Every route in `manifest.ts` has a matching lazy import in `routes.tsx`
- [ ] All pages handle three states: loading (`<Skeleton>`), error (`<ErrorDisplay>`), empty (`<EmptyState>`)
- [ ] All forms use Zod schemas as the single source of validation truth via `<Form schema={...}>`
- [ ] No inline styles — CSS Modules with `--hx-*` / `--color-*` design tokens only
- [ ] No direct `@radix-ui/*` imports — use `@hexalith/ui` components
- [ ] No TypeScript enums — use `z.union([z.literal(...)])` for all union types
- [ ] All user-facing text uses domain-specific language (not generic "Item created")
- [ ] CSS class names in `.module.css` are camelCase (e.g., `.statusBadge` not `.status-badge`)
- [ ] Destructive operations (delete, cancel, disable) use `<AlertDialog>` for confirmation
- [ ] `useCallback` wraps all event handlers with dependency arrays
- [ ] Query params defined at module scope as `const` for referential stability
- [ ] Import order: react → react-router → zod → @hexalith/cqrs-client → @hexalith/ui → type imports → relative CSS → relative schemas
- [ ] Test mock data validates against Zod schemas (all required fields present)
- [ ] Test query key format: `{tenant}:{domain}:{queryType}:{aggregateId}:{entityId}`
- [ ] Date columns use `Intl.DateTimeFormat(undefined, { dateStyle: "medium" })` in table cells
- [ ] Detail page dates use `Intl.DateTimeFormat(undefined, { dateStyle: "long", timeStyle: "short" })`
- [ ] Currency values use `Intl.NumberFormat(undefined, { style: "currency", currency })` — never manual formatting
- [ ] All in-module navigation uses relative paths (`..`, `detail/${id}`, `create`) — never absolute paths
- [ ] Edit page included if domain supports record updates (route `/edit/:id` in manifest)
- [ ] Detail page actions include Back (ghost) + Edit (secondary) + domain-specific actions
- [ ] Status messages match the prescribed mapping (sending/polling/rejected/failed/timedOut)

## Anti-Patterns

1. **DO NOT** copy scaffold placeholders verbatim — generate domain-specific code
2. **DO NOT** use `useProjection` or `useCommand` — use `useQuery` and `useCommandPipeline`
3. **DO NOT** skip state handling — every page needs loading/error/empty states
4. **DO NOT** hardcode component props — reference `ui-components.md` for current props
5. **DO NOT** reference architecture.md — use the knowledge bundle files (source-verified)
6. **DO NOT** use `useCqrs`, `useQueryClient`, or `useSignalRHub` — these are internal provider hooks
7. **DO NOT** render UUID fields in forms — they are auto-generated via `crypto.randomUUID()`
8. **DO NOT** use `interface` for types derived from Zod — use `z.infer<typeof Schema>`

## Limitations

These templates generate entity-based CRUD modules only. Not covered:

- Dashboards, analytics, or summary views
- Wizards or multi-step workflows
- File upload interfaces
- Real-time streaming views
For these, use `pnpm create hexalith-module` and customize manually.
