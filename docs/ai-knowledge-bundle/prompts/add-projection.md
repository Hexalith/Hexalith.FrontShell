# Add Projection Page to Existing Module

<!-- Verified against bundle v0.1.0 -->

Add a projection (list page + detail page) to an existing Hexalith module. Produces: Zod schemas, list page, detail page, CSS module, route additions, lazy imports, and test files.

## Input Parameters

| Parameter          | Format                 | Example                                                                             |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------------- |
| Projection name    | PascalCase entity      | `OrderItem`                                                                         |
| Fields             | Field names with types | `name: string, quantity: number, unitPrice: number, status: "Pending" \| "Shipped"` |
| Domain name        | kebab-case             | `order-management`                                                                  |
| Query type         | PascalCase             | `OrderItemList`, `OrderItemDetail`                                                  |
| Target module path | Relative to repo root  | `modules/order-management`                                                          |

## Clarifying Questions

Before generating, ask the user about:

1. **List vs detail fields** — Which fields appear in the table? Which are detail-only?
2. **Status values** — What are the valid status values for display?
3. **Sortable/filterable columns** — Which columns support sorting? Filtering?
4. **Detail section grouping** — If the entity has 8+ fields, how should they be grouped?

## Knowledge Bundle References

| File                                              | What to extract                                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [cqrs-hooks.md](../cqrs-hooks.md)                 | `useQuery` signature, schema parameter, options                                                    |
| [ui-components.md](../ui-components.md)           | `Table`, `TableColumn`, `DetailView`, `PageLayout`, `Skeleton`, `ErrorDisplay`, `EmptyState` props |
| [conventions.md](../conventions.md)               | File naming, import ordering                                                                       |
| [scaffold-structure.md](../scaffold-structure.md) | State handling patterns                                                                            |
| [test-fixtures.md](../test-fixtures.md)           | `MockQueryBus`, query key format, `renderWithProviders`                                            |

## Generation Instructions

### 1. Zod Schemas

Add to existing schemas file or create a new one (`src/schemas/{projection}Schemas.ts`):

```typescript
import { z } from "zod";

const {Projection}IdentifierSchema = z.string().uuid("ID must be a valid UUID");
const TimestampSchema = z.string().datetime({ offset: true, message: "Must be a valid ISO 8601 date" });

// List item schema — fields visible in the table
export const {Projection}ItemSchema = z.object({
  id: {Projection}IdentifierSchema,
  name: z.string().min(1).max(200),
  status: z.union([z.literal("Pending"), z.literal("Shipped")]),
  // ... domain fields for table columns
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
});
export type {Projection}Item = z.infer<typeof {Projection}ItemSchema>;

// Detail schema — extends list with extra fields
export const {Projection}DetailSchema = {Projection}ItemSchema.extend({
  // detail-only fields
  notes: z.string().max(2000).optional(),
  createdBy: z.string().min(1),
});
export type {Projection}Detail = z.infer<typeof {Projection}DetailSchema>;
```

### 2. List Page (`src/pages/{Projection}ListPage.tsx`)

Follow the exact list page pattern from [new-module.md](./new-module.md#3-list-page):

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

import styles from "./{Projection}ListPage.module.css";
import { {Projection}ItemSchema } from "../schemas/{projection}Schemas.js";

const {Projection}ListSchema = z.array({Projection}ItemSchema);
type {Projection}Item = z.infer<typeof {Projection}ItemSchema>;

const {PROJECTION}_LIST_PARAMS = {
  domain: "{domain-name}",
  queryType: "{Projection}List",
} as const;

const STATUS_VARIANT: Record<string, string> = {
  // Map each status to a CSS class
};

const columns = [
  // Define columns with id, header, accessorKey, isSortable, isFilterable
] satisfies TableColumn<{Projection}Item>[];

export function {Projection}ListPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    {Projection}ListSchema,
    {PROJECTION}_LIST_PARAMS,
  );

  const handleRowClick = useCallback(
    (row: {Projection}Item) => { navigate(`detail/${row.id}`); },
    [navigate],
  );

  // THREE STATES:
  if (isLoading) {
    return <PageLayout title="{Display Name}"><Skeleton variant="table" rows={5} /></PageLayout>;
  }
  if (error) {
    return <PageLayout title="{Display Name}"><ErrorDisplay error={error} title="Failed to load {projection items}" onRetry={refetch} /></PageLayout>;
  }
  if (!data || data.length === 0) {
    return (
      <PageLayout title="{Display Name}">
        <EmptyState
          title="No {projection items} yet"
          description="No {projection items} are available"
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="{Display Name}">
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

### 3. Detail Page (`src/pages/{Projection}DetailPage.tsx`)

Follow the exact detail page pattern from [new-module.md](./new-module.md#4-detail-page):

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

import { {Projection}DetailSchema } from "../schemas/{projection}Schemas.js";

function build{Projection}DetailParams(id: string) {
  return {
    domain: "{domain-name}",
    queryType: "{Projection}Detail",
    aggregateId: id,
  };
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function {Projection}DetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useQuery(
    {Projection}DetailSchema,
    build{Projection}DetailParams(id ?? ""),
    { enabled: !!id },
  );

  const handleBack = useCallback(() => { navigate(".."); }, [navigate]);

  if (isLoading) {
    return <PageLayout title="{Projection} Details"><Skeleton variant="detail" fields={6} /></PageLayout>;
  }
  if (error) {
    return <PageLayout title="{Projection} Details"><ErrorDisplay error={error} title="Failed to load {projection}" onRetry={refetch} /></PageLayout>;
  }
  if (!data) return null;

  return (
    <PageLayout
      title={data.name}
      subtitle="{Projection} Details"
      actions={
        <Inline gap="2">
          <Button variant="ghost" onClick={handleBack}>Back</Button>
        </Inline>
      }
    >
      <DetailView
        sections={[
          {
            title: "General Information",
            fields: [
              // Domain-specific fields
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

### 4. CSS Module (`src/pages/{Projection}ListPage.module.css`)

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

  /* One variant per status value */
  .statusPending {
    border-color: var(--color-status-warning);
    color: var(--color-status-warning);
  }

  .statusShipped {
    border-color: var(--color-status-success);
    color: var(--color-status-success);
  }
}
```

### 5. Route Additions

**Update `src/manifest.ts`** — add new routes:

```typescript
routes: [
  // ... existing routes
  { path: "/{projection}" },              // list page
  { path: "/{projection}/detail/:id" },   // detail page
],
```

**Update `src/routes.tsx`** — add lazy imports and route entries:

```typescript
const {Projection}ListPage = lazy(() =>
  import("./pages/{Projection}ListPage.js").then((m) => ({ default: m.{Projection}ListPage })),
);
const {Projection}DetailPage = lazy(() =>
  import("./pages/{Projection}DetailPage.js").then((m) => ({ default: m.{Projection}DetailPage })),
);

// Add to routes array:
{
  path: "/{projection}",
  element: <{Entity}Suspense><{Projection}ListPage /></{Entity}Suspense>,
},
{
  path: "/{projection}/detail/:id",
  element: <{Entity}Suspense><{Projection}DetailPage /></{Entity}Suspense>,
},
```

### 6. Update Index Exports

**Update `src/index.ts`**:

```typescript
export type { {Projection}Item, {Projection}Detail } from "./schemas/{projection}Schemas.js";
export { {Projection}ItemSchema, {Projection}DetailSchema } from "./schemas/{projection}Schemas.js";
```

### 7. Sample Data Update

Add sample data for the new projection to `src/data/sampleData.ts`:

```typescript
export const LIST_QUERY = {
  domain: "{domain-name}",
  queryType: "{Projection}List",
} as const;

export const DETAIL_QUERY = {
  domain: "{domain-name}",
  queryType: "{Projection}Detail",
} as const;

export const {projection}Items: {Projection}Item[] = {Projection}ItemSchema.array().parse([
  // 5-12 realistic domain items
]);

export const {projection}Details: {Projection}Detail[] = {Projection}DetailSchema.array().parse(
  {projection}Items.map((item) => ({
    ...item,
    notes: `Notes for ${item.name}.`,
    createdBy: "system@hexalith.io",
  })),
);
```

Update `renderWithProviders.tsx` to register new sample data with the mock query bus.

### 8. Test Files

**`src/pages/{Projection}ListPage.test.tsx`:**

```typescript
import { describe, it, expect } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { MockQueryBus } from "@hexalith/cqrs-client";
import { createMockTenantContext } from "@hexalith/shell-api";

import { renderWithProviders } from "../testing/renderWithProviders";
import { {Projection}ListPage } from "./{Projection}ListPage";
import { {projection}Items, LIST_QUERY } from "../data/sampleData.js";

describe("{Projection}ListPage", () => {
  it("renders loading state initially", () => {
    const slowQueryBus = new MockQueryBus({ delay: 500 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${LIST_QUERY.domain}:${LIST_QUERY.queryType}::`;
    slowQueryBus.setResponse(listKey, {projection}Items);
    renderWithProviders(<{Projection}ListPage />, { queryBus: slowQueryBus });
    expect(screen.getByRole("status", { name: /loading content/i })).toBeInTheDocument();
  });

  it("renders data after load", async () => {
    renderWithProviders(<{Projection}ListPage />);
    await waitFor(() => {
      expect(screen.getByText("{first sample item name}")).toBeInTheDocument();
    });
  });

  it("renders empty state when no data", async () => {
    const emptyQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${LIST_QUERY.domain}:${LIST_QUERY.queryType}::`;
    emptyQueryBus.setResponse(listKey, []);
    renderWithProviders(<{Projection}ListPage />, { queryBus: emptyQueryBus });
    await waitFor(() => {
      expect(screen.getByText("No {projection items} yet")).toBeInTheDocument();
    });
  });

  it("renders error state on query failure", async () => {
    const errorQueryBus = new MockQueryBus({ delay: 30 });
    const TENANT = createMockTenantContext().activeTenant;
    const listKey = `${TENANT}:${LIST_QUERY.domain}:${LIST_QUERY.queryType}::`;
    errorQueryBus.setError(listKey, new Error("Network error"));
    renderWithProviders(<{Projection}ListPage />, { queryBus: errorQueryBus });
    await waitFor(() => {
      expect(screen.getByText("Failed to load {projection items}")).toBeInTheDocument();
    });
  });
});
```

**`src/pages/{Projection}DetailPage.test.tsx`:** Follow the same pattern with detail query key format `{tenant}:{domain}:{queryType}:{aggregateId}:`.

## Quality Checklist

- [ ] Both list and detail pages handle three states: loading, error, empty/null
- [ ] List page uses `<Table>` with `sorting`, `pagination={{ pageSize: 10 }}`, `globalSearch`, `onRowClick`, `caption`
- [ ] Detail page uses `<DetailView>` with sections (General Information + Audit Trail)
- [ ] Query params defined at module scope as `const` for list, as function for detail (because aggregateId varies)
- [ ] `{ enabled: !!id }` option on detail page `useQuery`
- [ ] Routes added to both `manifest.ts` and `routes.tsx`
- [ ] Lazy imports use `.then(m => ({ default: m.PageName }))`
- [ ] CSS class names are camelCase, using design tokens only
- [ ] Column definitions use `satisfies TableColumn<T>[]`
- [ ] Test query key format: `{tenant}:{domain}:{queryType}:{aggregateId}:{entityId}`
- [ ] All user-facing text uses domain-specific language

## Anti-Patterns

1. **DO NOT** use `const` for detail query params — use a builder function (aggregateId varies per row)
2. **DO NOT** forget `{ enabled: !!id }` on detail page queries — prevents queries with empty ID
3. **DO NOT** skip the CSS module — status badges need design-token styling
4. **DO NOT** use `useProjection` — the correct hook is `useQuery`
5. **DO NOT** forget to update `renderWithProviders` with new sample data registrations
