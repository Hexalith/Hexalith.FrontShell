# Hexalith FrontShell — UX Interaction Patterns

This document defines the prescriptive interaction patterns for all Hexalith modules. Every module page must follow these patterns to ensure a consistent user experience across the platform.

---

## Page Templates

### List Page

The primary data browsing view. Renders a filterable, sortable, paginated table.

**Structure:**
```
PageLayout (title + Create action button)
├── if loading → Skeleton (variant="table")
├── if error → ErrorDisplay (with onRetry)
├── if empty → EmptyState (with Create action link)
└── if data → Table
    ├── Column headers (sortable, filterable)
    ├── Data rows (clickable → navigates to detail)
    ├── Filters (text input, select dropdown)
    └── Pagination (page size, previous/next)
```

**Required behaviors:**
- Create button in `PageLayout.actions` (variant="primary")
- Row click navigates to `detail/{id}` via relative path
- Table columns define `isSortable`, `isFilterable`, and `filterType`
- Dates formatted with `Intl.DateTimeFormat` (dateStyle: "medium")
- Currency formatted with `Intl.NumberFormat` (style: "currency")
- Status values displayed as CSS module badges with variant classes

**Data fetching:**
```tsx
const { data, isLoading, error, refetch } = useQuery(
  ListSchema,
  { domain: "DomainName", queryType: "GetItems" },
);
```

---

### Detail Page

Displays a single record in a structured label/value layout.

**Structure:**
```
PageLayout (title = record name, subtitle = "Details", actions)
├── Actions: Back + Edit + [domain-specific actions]
├── if loading → Skeleton (variant="detail")
├── if error → ErrorDisplay (with onRetry)
└── if data → DetailView
    ├── Section: "General Information"
    │   └── Fields: label/value pairs
    ├── Section: "Additional Details"
    │   └── Fields with span=2 for long content
    └── Section: [domain-specific sections]
```

**Required behaviors:**
- Back button (variant="ghost") navigates to `..`
- Edit button (variant="secondary") navigates to `../edit/{id}`
- Destructive actions use `Modal` with confirmation form
- `useParams<{ id: string }>()` for record ID
- Query enabled only when ID exists: `{ enabled: !!id }`

**DetailView field types:**
- `{ label, value: string }` — plain text
- `{ label, value: ReactElement }` — status badge, formatted date, link
- `{ label, value, span: 2 }` — full-width content (addresses, notes)

---

### Create Page

Form-based record creation using CQRS command submission.

**Structure:**
```
PageLayout (title = "Create [Entity]")
└── Form (schema = CreateCommandSchema)
    ├── FormField → Input (text fields)
    ├── FormField → TextArea (long text, optional)
    ├── FormField → Select (enumerated values)
    ├── Status message (sending/polling/rejected)
    ├── ErrorDisplay (if failed)
    └── Actions: Cancel (ghost) + Submit (primary)
```

**Required behaviors:**
- `Form` receives a Zod schema as `schema` prop — single source of truth for validation
- Submit handler uses `useCommandPipeline()`:
  ```tsx
  await send({
    commandType: "CreateEntity",
    domain: "DomainName",
    aggregateId: crypto.randomUUID(),
    payload: formData,
  });
  ```
- Submit button disabled when `status === "sending" || status === "polling"`
- Status messages displayed inline above error/actions area
- On `status === "completed"`: show success toast, navigate to `..` (list)
- On error: show `ErrorDisplay` with retry via `replay()`
- Cancel button navigates to `..` (list)

**Status message mapping:**
| Status | Message |
|--------|---------|
| sending | "Sending command to the backend..." |
| polling | "Waiting for command confirmation..." |
| rejected | "The backend rejected the command. Review the details below and try again." |
| failed | Show ErrorDisplay |
| timedOut | Show ErrorDisplay with timeout message |

---

### Edit Page

Same as Create Page with these differences:
- Title: "Edit [Entity]"
- Form pre-populated with `defaultValues` from loaded data
- On success: navigate to `../detail/{id}` (back to detail, not list)
- Uses the entity's existing ID instead of generating a new one

---

## State Handling

All pages must handle states in this exact order:

```tsx
if (isLoading) return <Skeleton variant="..." />;
if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
if (!data || data.length === 0) return <EmptyState ... />;
return <DataComponent data={data} />;
```

**Rules:**
- Never show a blank page — always show loading, error, or empty state
- `Skeleton` variant must match the page type (table, detail, card)
- `ErrorDisplay` must include `onRetry` callback
- `EmptyState` must include an action linking to the create page

---

## Navigation Conventions

### Route Structure

Every module declares routes in its manifest:

| Route | Page | Purpose |
|-------|------|---------|
| `/` | List | Browse and search records |
| `/detail/:id` | Detail | View a single record |
| `/create` | Create | Create a new record |
| `/edit/:id` | Edit | Modify an existing record |

Additional routes (e.g., `/switch` for tenants) are domain-specific.

### Navigation Methods

| Action | Method |
|--------|--------|
| To list | `navigate("..")` from detail/create/edit |
| To detail | `navigate(\`detail/${id}\`)` from list row click |
| To create | `navigate("create")` from list create button |
| To edit | `navigate(\`../edit/${id}\`)` from detail edit button |
| Back | `navigate("..")` or `navigate(-1)` |

**Rule:** Always use relative paths. Never hardcode absolute module paths.

### Manifest Navigation

```tsx
navigation: [
  {
    label: "Display Name",    // Shown in sidebar
    path: "/",                // Relative to module base path
    icon: "icon-name",        // From design system icon set
    category: "Modules",      // Sidebar grouping
  },
]
```

---

## Form Patterns

### Schema-Driven Validation

Forms use Zod schemas as the single source of truth:

```tsx
export const CreateEntitySchema = z.object({
  name: z.string().min(1, "Required").max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["typeA", "typeB"]),
});

export type CreateEntity = z.infer<typeof CreateEntitySchema>;
```

**Rules:**
- All validation lives in the Zod schema, not in component props
- Error messages are defined in the schema (`.min(1, "Required")`)
- Types are inferred from schemas (`z.infer<typeof Schema>`)
- Schema files live in `src/schemas/` with naming: `{entity}Schemas.ts`

### Form Composition

```tsx
<Form schema={CreateEntitySchema} onSubmit={handleSubmit}>
  <FormField name="name">
    <Input label="Name" placeholder="Enter name" required />
  </FormField>
  <FormField name="description">
    <TextArea label="Description" placeholder="Optional" rows={4} />
  </FormField>
  <FormField name="type">
    <Select label="Type" options={typeOptions} />
  </FormField>
  <Inline gap="2">
    <Button variant="ghost" onClick={() => navigate("..")}>Cancel</Button>
    <Button variant="primary" type="submit" disabled={isBusy}>Create</Button>
  </Inline>
</Form>
```

---

## CQRS Integration Patterns

### Query Pattern (Read)

```tsx
// 1. Define schemas in schemas/ folder
const ItemSchema = z.object({ ... });
const ListSchema = z.array(ItemSchema);

// 2. Define query parameters
const QUERY = { domain: "Domain", queryType: "GetItems" } as const;

// 3. Use in component
const { data, isLoading, error, refetch } = useQuery(ListSchema, QUERY);
```

### Command Pattern (Write)

```tsx
// 1. Define command schema
const CreateCommandSchema = z.object({ ... });

// 2. Use command pipeline
const { send, status, error, replay } = useCommandPipeline();

// 3. Submit
await send({
  commandType: "CreateEntity",
  domain: "Domain",
  aggregateId: crypto.randomUUID(),
  payload: validatedData,
});

// 4. Handle completion
useEffect(() => {
  if (status === "completed") {
    toast({ variant: "success", title: "Created successfully" });
    navigate("..");
  }
}, [status]);
```

### Pre-Flight Authorization

```tsx
const { isAuthorized, reason } = useCanExecuteCommand({
  domain: "Domain",
  commandType: "CreateEntity",
});

// Disable UI if unauthorized
<Button disabled={!isAuthorized}>{reason ?? "Create"}</Button>
```

---

## Styling Rules

### CSS Modules

- File naming: `{componentName}.module.css`
- All styles wrapped in `@layer components { ... }`
- Class names: camelCase (`.pageHeader`, `.statusBadge`)

### Token Usage (Mandatory)

| Category | Token Pattern | Example |
|----------|--------------|---------|
| Colors | `var(--color-*)` | `var(--color-text-primary)` |
| Spacing | `var(--spacing-*)` | `var(--spacing-4)` |
| Typography | `var(--font-*)` | `var(--font-size-sm)` |
| Borders | `var(--radius-*)` | `var(--radius-sm)` |
| Motion | `var(--transition-*)` | `var(--transition-duration-default)` |
| Z-index | `var(--z-*)` | `var(--z-modal)` |

**No hardcoded values.** Stylelint enforces this in CI.

### Status Badge Pattern

```css
.statusBadge {
  display: inline-flex;
  padding: var(--spacing-1) var(--spacing-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
}

.statusConfirmed {
  border-color: var(--color-status-success);
  color: var(--color-status-success);
}
```

```tsx
const STATUS_VARIANT: Record<string, string> = {
  confirmed: styles.statusConfirmed,
  draft: styles.statusDraft,
};

<span className={`${styles.statusBadge} ${STATUS_VARIANT[value] ?? ""}`}>
  {value}
</span>
```

### Responsive Rules

- Sidebar collapses at `max-width: 1279px`
- Respect `prefers-reduced-motion: reduce` for animations
- Use grid/flex layouts — no fixed pixel widths for content areas

---

## Module File Structure

Every module follows this structure:

```
src/
├── manifest.ts          # Module declaration (routes, navigation)
├── index.ts             # Public exports
├── routes.tsx           # Route definitions with lazy imports
├── pages/
│   ├── EntityListPage.tsx
│   ├── EntityDetailPage.tsx
│   ├── EntityCreatePage.tsx
│   └── EntityEditPage.tsx     (if applicable)
├── schemas/
│   └── entitySchemas.ts       # Zod schemas (list, detail, command)
├── styles/
│   └── entityPages.module.css # Scoped styles
├── testing/
│   └── mocks.ts               # Test fixtures and mock data
├── data/
│   └── sampleData.ts          # Sample data using schemas
└── test-setup.ts              # Test environment setup
```

---

## Schema Conventions

### Schema Layering

```
Base field schemas (primitives)
    ↓
ItemSchema (list view — minimal fields)
    ↓
DetailSchema (extends ItemSchema — all fields)
    ↓
CreateCommandSchema (input validation — only writable fields)
```

### Naming

| Schema | Pattern | Example |
|--------|---------|---------|
| List item | `{Entity}ItemSchema` | `OrderItemSchema` |
| List array | `{Entity}ListSchema` | `OrderListSchema` |
| Detail | `{Entity}DetailSchema` | `OrderDetailSchema` |
| Create command | `Create{Entity}CommandSchema` | `CreateOrderCommandSchema` |
| Types | `type {Entity}Item = z.infer<typeof {Entity}ItemSchema>` | `type OrderItem` |

---

## Formatting Conventions

| Data Type | Formatter | Usage |
|-----------|-----------|-------|
| Date | `new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })` | All dates |
| Currency | `new Intl.NumberFormat(undefined, { style: "currency", currency })` | Monetary values |
| Number | `new Intl.NumberFormat()` | Counts, quantities |
| Status | CSS module badge with variant mapping | All status fields |

**Rule:** Always use `Intl` APIs — never manual date/number formatting. Pass `undefined` as locale to respect user's browser settings.

---

*This specification is the authoritative reference for building Hexalith modules. Deviations require documented justification.*
