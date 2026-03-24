# Module Scaffold Structure and Patterns

Source: `tools/create-hexalith-module/templates/` and `modules/hexalith-tenants/`

## Module Directory Structure

```text
hexalith-{module-name}/
├── src/
│   ├── index.ts              # Module entry point — default export: root component
│   ├── manifest.ts           # ModuleManifestV1 definition
│   ├── routes.tsx            # React Router route definitions
│   ├── css-modules.d.ts      # CSS modules type declarations
│   ├── test-setup.ts         # Vitest test setup
│   ├── schemas/              # Zod schemas for projections and commands
│   │   └── {name}Schemas.ts
│   ├── pages/                # Route-level page components
│   │   ├── {Name}ListPage.tsx
│   │   ├── {Name}ListPage.test.tsx
│   │   ├── {Name}ListPage.module.css
│   │   ├── {Name}DetailPage.tsx
│   │   ├── {Name}DetailPage.test.tsx
│   │   ├── {Name}CreatePage.tsx
│   │   └── {Name}CreatePage.test.tsx
│   ├── components/           # Module-specific reusable components
│   ├── hooks/                # Module-specific hooks (beyond platform hooks)
│   ├── data/                 # Sample data for dev host
│   │   └── sampleData.ts
│   └── testing/              # Test utilities
│       └── renderWithProviders.tsx
├── dev-host/                 # Standalone dev server (MockShellProvider)
│   └── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json              # @hexalith/* as peerDependencies
```

## peerDependencies Pattern

Modules declare `@hexalith/*` packages as peerDependencies:

```json
{
  "peerDependencies": {
    "@hexalith/shell-api": "^0.1.0",
    "@hexalith/cqrs-client": "^0.2.0",
    "@hexalith/ui": "^0.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.6.0",
    "zod": "^3.0.0"
  }
}
```

pnpm workspaces resolve to local versions when consumed by the shell.

---

## State Handling Patterns

**Every page must handle loading, error, and empty states.** Never show blank screens or generic spinners.

### Pattern

```tsx
if (isLoading) return <Skeleton variant="..." />;
if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
if (!data?.length) return <EmptyState title="..." />;
return <Table data={data} columns={columns} />;
```

### Rules

| State                  | Component                                        | Notes                                                       |
| ---------------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| Loading                | `<Skeleton variant="table\|form\|detail\|card">` | Always use Skeleton. Never spinners. Never blank.           |
| Error (business)       | `<ErrorDisplay error={error}>` inline            | `CommandRejectedError`, `ValidationError`, `ForbiddenError` |
| Error (infrastructure) | Bubble to `<ErrorBoundary>`                      | `ApiError` (5xx), `AuthError`, `RateLimitError`             |
| Empty                  | `<EmptyState title="..." action={...}>`          | Include action suggestion                                   |

---

## List Page Pattern

Complete example using `useQuery` + `Table` + loading/error/empty states.

Source: `tools/create-hexalith-module/templates/module/src/pages/ExampleListPage.tsx`

```tsx
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

import { ItemSchema } from "../schemas/itemSchemas.js";

const ItemListSchema = z.array(ItemSchema);
type Item = z.infer<typeof ItemSchema>;

// Module-scope constant — stable reference prevents re-fetches
const LIST_PARAMS = { domain: "orders", queryType: "OrderList" } as const;

const columns: TableColumn<Item>[] = [
  { id: "name", header: "Name", accessorKey: "name", isSortable: true },
  { id: "status", header: "Status", accessorKey: "status" },
];

export function OrderListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    ItemListSchema,
    LIST_PARAMS,
  );

  const handleRowClick = useCallback(
    (row: Item) => navigate(row.id),
    [navigate],
  );
  const handleCreate = useCallback(() => navigate("create"), [navigate]);

  if (isLoading) {
    return (
      <PageLayout title="Orders">
        <Skeleton variant="table" />
      </PageLayout>
    );
  }
  if (error) {
    return (
      <PageLayout title="Orders">
        <ErrorDisplay error={error} onRetry={refetch} />
      </PageLayout>
    );
  }
  if (!data?.length) {
    return (
      <PageLayout
        title="Orders"
        actions={
          <Button variant="primary" onClick={handleCreate}>
            Create
          </Button>
        }
      >
        <EmptyState
          title="No orders"
          action={{ label: "Create Order", onClick: handleCreate }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Orders"
      actions={
        <Button variant="primary" onClick={handleCreate}>
          Create
        </Button>
      }
    >
      <Table
        data={data}
        columns={columns}
        sorting
        pagination
        globalSearch
        onRowClick={handleRowClick}
      />
    </PageLayout>
  );
}
```

---

## Form Page Pattern

Complete example using `useCommandPipeline` + `Form` + Zod schema + success/error handling.

Source: `tools/create-hexalith-module/templates/module/src/pages/ExampleCreatePage.tsx`

```tsx
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

import { useCommandPipeline } from "@hexalith/cqrs-client";
import {
  Button,
  ErrorDisplay,
  Form,
  FormField,
  Inline,
  Input,
  PageLayout,
  Select,
  useToast,
} from "@hexalith/ui";

import { CreateOrderSchema } from "../schemas/orderSchemas.js";

import type { CreateOrderInput } from "../schemas/orderSchemas.js";

export function OrderCreatePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { send, status, error } = useCommandPipeline();

  useEffect(() => {
    if (status === "completed") {
      toast({ variant: "success", title: "Order created" });
      navigate("..");
    }
  }, [navigate, status, toast]);

  const handleSubmit = useCallback(
    async (data: CreateOrderInput) => {
      await send({
        domain: "orders",
        aggregateId: crypto.randomUUID(),
        commandType: "CreateOrder",
        payload: data,
      });
    },
    [send],
  );

  const isBusy = status === "sending" || status === "polling";

  return (
    <PageLayout title="Create Order">
      {error && <ErrorDisplay error={error} title="Command failed" />}
      <Form schema={CreateOrderSchema} onSubmit={handleSubmit}>
        <FormField name="name">
          <Input label="Name" required />
        </FormField>
        <FormField name="priority">
          <Select
            label="Priority"
            options={[
              { value: "Low", label: "Low" },
              { value: "High", label: "High" },
            ]}
            required
          />
        </FormField>
        <Inline gap="2">
          <Button variant="ghost" onClick={() => navigate("..")}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={isBusy}>
            {isBusy ? "Creating..." : "Create"}
          </Button>
        </Inline>
      </Form>
    </PageLayout>
  );
}
```

---

## Detail Page Pattern

Complete example using `useQuery` + `DetailView` + loading/error states.

Source: `tools/create-hexalith-module/templates/module/src/pages/ExampleDetailPage.tsx`

```tsx
import { useCallback, useMemo } from "react";
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

import { OrderDetailSchema } from "../schemas/orderSchemas.js";

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // queryParams must be a stable reference — use useMemo for dynamic values
  const detailParams = useMemo(
    () => ({ domain: "orders", queryType: "OrderDetail", aggregateId: id ?? "" }),
    [id],
  );
  const { data, isLoading, error, refetch } = useQuery(
    OrderDetailSchema,
    detailParams,
    { enabled: !!id },
  );

  if (isLoading)
    return (
      <PageLayout title="Order Details">
        <Skeleton variant="detail" />
      </PageLayout>
    );
  if (error)
    return (
      <PageLayout title="Order Details">
        <ErrorDisplay error={error} onRetry={refetch} />
      </PageLayout>
    );
  if (!data) return null;

  return (
    <PageLayout
      title={data.name}
      actions={<Button onClick={() => navigate("..")}>Back</Button>}
    >
      <DetailView
        sections={[
          {
            title: "Order Info",
            fields: [
              { label: "Name", value: data.name },
              { label: "Status", value: data.status },
              { label: "Priority", value: data.priority },
            ],
          },
        ]}
      />
    </PageLayout>
  );
}
```
