# Hexalith Design System — Component Usage Guidelines

This document explains **when** and **why** to use each component. For props and API details, see [ui-components.md](../../docs/ai-knowledge-bundle/ui-components.md). For page-level patterns, see [UX Interaction Patterns](../C-UX-Scenarios/ux-interaction-patterns.md).

---

## Component Decision Trees

### "I need to display data"

```
Is it a list of records?
├── Yes → Table (with sorting, filtering, pagination)
│         └── Row click → navigates to detail page
└── No → Is it a single record?
    ├── Yes → DetailView (with sections)
    │         └── Group fields into "General Information" + "Audit Trail"
    └── No → Is it empty?
        ├── Yes → EmptyState (with action to create)
        └── No → Is it loading?
            └── Yes → Skeleton (variant matches target content)
```

### "I need user input"

```
Is it a form with validation?
├── Yes → Form + FormField + Zod schema
│         ├── Short text → Input
│         ├── Long text (500+ chars) → TextArea (rows=3+)
│         ├── Selection from options → Select
│         ├── Date/time → DatePicker
│         ├── Boolean → Checkbox
│         └── Actions → Inline (Cancel ghost + Submit primary)
└── No → Is it a single action?
    └── Yes → Button
              ├── Primary action → variant="primary"
              ├── Secondary action → variant="secondary"
              └── Tertiary/cancel → variant="ghost"
```

### "I need to show feedback"

```
Was the action successful?
├── Yes → Toast (variant="success", auto-dismisses)
├── No → Is it an error?
│   ├── Recoverable (business) → ErrorDisplay (inline, with onRetry)
│   └── Fatal (infrastructure) → ErrorBoundary (wraps component tree)
└── Is it a warning/info?
    └── Toast (variant="warning" or "info")
```

### "I need an overlay"

```
Is it a destructive confirmation?
├── Yes → AlertDialog (explicit action/cancel labels)
├── No → Is it a form or complex content?
│   ├── Yes → Modal (with Form inside)
│   └── No → Is it a menu of actions?
│       ├── Yes → DropdownMenu
│       └── No → Is it supplementary info?
│           ├── Brief → Tooltip (hover/focus, non-essential info only)
│           └── Interactive → Popover (anchored floating panel)
```

---

## Component Composition Recipes

### List Page

```tsx
<PageLayout title="Orders" actions={<Button variant="primary">Create</Button>}>
  {isLoading && <Skeleton variant="table" />}
  {error && <ErrorDisplay error={error} onRetry={refetch} />}
  {!data?.length && <EmptyState title="No orders" action={...} />}
  {data?.length && <Table data={data} columns={columns} onRowClick={...} />}
</PageLayout>
```

### Detail Page

```tsx
<PageLayout
  title={data.name}
  subtitle="Order Details"
  actions={
    <Inline gap="2">
      <Button variant="ghost">Back</Button>
      <Button variant="secondary">Edit</Button>
    </Inline>
  }
>
  <DetailView sections={[
    { title: "General Information", fields: [...] },
    { title: "Audit Trail", fields: [...] },
  ]} />
</PageLayout>
```

### Create/Edit Form

```tsx
<PageLayout title="Create Order">
  {error && <ErrorDisplay error={error} />}
  <Form schema={CreateOrderSchema} onSubmit={handleSubmit}>
    <FormField name="name"><Input label="Name" required /></FormField>
    <FormField name="type"><Select label="Type" options={...} /></FormField>
    <FormField name="notes"><TextArea label="Notes" rows={4} /></FormField>
    <Inline gap="2">
      <Button variant="ghost">Cancel</Button>
      <Button variant="primary" type="submit">Create</Button>
    </Inline>
  </Form>
</PageLayout>
```

### Destructive Action (from Detail Page)

```tsx
<AlertDialog
  open={showConfirm}
  title="Disable Tenant"
  description="This will prevent all users from accessing this tenant."
  actionLabel="Disable"
  onAction={handleDisable}
  onCancel={() => setShowConfirm(false)}
/>
```

---

## Button Variant Guide

| Variant | Use For | Examples |
|---------|---------|---------|
| `primary` | The single most important action on the page | "Create", "Save", "Submit" |
| `secondary` | Supporting actions | "Edit", "Export", "Back to List" |
| `ghost` | Low-emphasis actions, cancel/dismiss | "Cancel", "Back", "Close" |

**Rules:**
- Maximum **one** primary button per page view
- Cancel/Back buttons are always `ghost`
- Destructive actions use `AlertDialog`, not a red button variant

---

## Skeleton Variant Guide

| Variant | Use For | Matches |
|---------|---------|---------|
| `table` | List pages | Table component layout |
| `detail` | Detail pages | DetailView section layout |
| `form` | Create/Edit pages | Form field layout |
| `card` | Generic loading | Card-shaped placeholder |

**Rule:** Always match the Skeleton variant to the content it replaces.

---

## Toast Usage Guide

| Variant | Use For | Auto-dismiss | Example |
|---------|---------|-------------|---------|
| `success` | Completed actions | Yes (5s) | "Order created successfully" |
| `error` | Failed actions | No | "Failed to save changes" |
| `warning` | Caution notices | Yes (5s) | "Connection unstable" |
| `info` | Informational | Yes (5s) | "New version available" |

**Rules:**
- Error toasts never auto-dismiss — user must acknowledge
- Maximum 3 toasts visible at once
- Use domain-specific language ("Order created", not "Item created")

---

## Modal vs AlertDialog

| Component | Use For | Has Form? | Examples |
|-----------|---------|-----------|---------|
| `Modal` | Editing, viewing details in context | Often yes | Edit record, view sub-detail |
| `AlertDialog` | Confirming destructive/irreversible actions | No | Delete, disable, cancel |

**Rule:** If the user needs to type something before confirming, use `Modal`. If it's a simple yes/no confirmation, use `AlertDialog`.

---

## Layout Component Guide

| Component | Direction | Use For |
|-----------|-----------|---------|
| `PageLayout` | Vertical | Page-level wrapper with title and actions |
| `Stack` | Vertical | Stacking form fields, sections, cards |
| `Inline` | Horizontal | Button groups, label+value pairs, tags |
| `Divider` | — | Visual separation between sections |

**Gap scale (4px base):**

| Value | Pixels | Common Use |
|-------|--------|------------|
| `"1"` | 4px | Tight grouping (badge padding) |
| `"2"` | 8px | Button groups, inline elements |
| `"3"` | 12px | Form field labels to inputs |
| `"4"` | 16px | Default spacing between elements |
| `"5"` | 24px | Section spacing |
| `"6"` | 32px | Major section divisions |

---

## Table Column Configuration

| Property | Purpose | When to Use |
|----------|---------|-------------|
| `isSortable` | Column header becomes clickable for sorting | All columns except actions/icons |
| `isFilterable` | Column gets a filter input | Status, category, type columns |
| `filterType: "text"` | Free-text filter | Name, description, ID columns |
| `filterType: "select"` | Dropdown filter with predefined options | Status, priority, type columns |
| `filterType: "date-range"` | Date range picker | Date columns |
| `cell` | Custom render function | Status badges, formatted dates, currency |

**Status column pattern:**
```tsx
{
  id: "status",
  header: "Status",
  accessorKey: "status",
  isFilterable: true,
  filterType: "select",
  filterOptions: statusValues.map(s => ({ label: s, value: s })),
  cell: ({ value }) => (
    <span className={`${styles.statusBadge} ${STATUS_VARIANT[value] ?? ""}`}>
      {value}
    </span>
  ),
}
```

**Date column pattern:**
```tsx
{
  id: "createdAt",
  header: "Created",
  accessorKey: "createdAt",
  isSortable: true,
  cell: ({ value }) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium" })
      .format(new Date(value as string)),
}
```

---

## Common Mistakes

| Mistake | Correct Approach |
|---------|-----------------|
| Using `useState` for form values | Use `<Form schema={...}>` + `<FormField>` |
| Importing from `@radix-ui/*` | Import from `@hexalith/ui` |
| Hardcoded colors/spacing in CSS | Use `var(--color-*)`, `var(--spacing-*)` tokens |
| Using spinner for loading | Use `<Skeleton variant="...">` |
| Red button for destructive actions | Use `<AlertDialog>` with confirmation |
| Generic text ("Item created") | Use domain language ("Order created") |
| Absolute navigation paths | Use relative paths (`..`, `detail/${id}`) |
| Manual date formatting | Use `Intl.DateTimeFormat` |
| TypeScript enums for status | Use `z.union([z.literal(...)])` |
| Multiple primary buttons | One primary per page view |

---

*For component API reference, see [ui-components.md](../../docs/ai-knowledge-bundle/ui-components.md).*
*For page-level patterns, see [UX Interaction Patterns](../C-UX-Scenarios/ux-interaction-patterns.md).*
