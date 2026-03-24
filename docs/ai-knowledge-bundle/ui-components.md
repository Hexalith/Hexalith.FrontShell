# @hexalith/ui Component Catalog

Source: `packages/ui/src/`

All components are imported from `@hexalith/ui`. **Never import from `@radix-ui/*` directly** — ESLint enforces this boundary.

Components wrap Radix UI primitives internally and use CSS Modules with `--hx-*` design tokens.

---

## Layout

### PageLayout

Page-level container with optional header.

**Accessibility:** Use a single visible page heading within the layout and keep action content as clearly labeled interactive controls.

```typescript
interface PageLayoutProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}
```

```tsx
<PageLayout
  title="Orders"
  subtitle="Manage orders"
  actions={<Button>Create</Button>}
>
  <Table data={orders} columns={columns} />
</PageLayout>
```

### Stack

Vertical flex container with design-token spacing.

**Accessibility:** `Stack` is layout-only and preserves child semantics, so use landmarks and headings on the children rather than on the container itself.

```typescript
interface StackProps {
  gap?: SpacingScale; // Default: '4' (16px)
  align?: "start" | "center" | "end" | "stretch"; // Default: 'stretch'
  children: React.ReactNode;
  className?: string;
}

type SpacingScale = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
// 0=0px, 1=4px, 2=8px, 3=12px, 4=16px, 5=24px, 6=32px, 7=48px, 8=64px
```

```tsx
<Stack gap="5">
  <Input label="Name" />
  <Input label="Email" type="email" />
</Stack>
```

### Inline

Horizontal flex container.

**Accessibility:** `Inline` is presentational only; keep DOM order aligned with the visual order so keyboard and screen-reader navigation stay predictable.

```typescript
interface InlineProps {
  gap?: SpacingScale; // Default: '4'
  align?: "start" | "center" | "end" | "baseline"; // Default: 'center'
  justify?: "start" | "center" | "end" | "between"; // Default: 'start'
  wrap?: boolean; // Default: false
  children: React.ReactNode;
  className?: string;
}
```

```tsx
<Inline gap="3" justify="end">
  <Button variant="ghost">Cancel</Button>
  <Button variant="primary">Save</Button>
</Inline>
```

### Divider

Horizontal rule separator.
**Accessibility:** Use `Divider` only as a supporting visual boundary; do not rely on it as the sole cue that content meaning changed.

```typescript
interface DividerProps {
  className?: string;
}
```

---

## Forms

### Button

**Accessibility:** Renders a native `<button>` with built-in keyboard behavior; button text should describe the action without depending on nearby context.

```typescript
interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost"; // Default: 'secondary'
  size?: "sm" | "md" | "lg"; // Default: 'md'
  disabled?: boolean; // Default: false
  type?: "button" | "submit" | "reset"; // Default: 'button'
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
  className?: string;
}
```

```tsx
<Button variant="primary" onClick={handleSave}>Save</Button>
<Button variant="ghost" size="sm">Cancel</Button>
```

### Input

**Accessibility:** Always requires a visible label and wires validation text through `aria-describedby`, `aria-required`, and `aria-invalid` when appropriate.

ForwardRef. Auto-generates id via `useId()`.

```typescript
interface InputProps {
  label: string; // Required for accessibility
  name?: string;
  type?: "text" | "email" | "password" | "number" | "tel" | "url"; // Default: 'text'
  value?: string;
  onChange?: (value: string) => void; // Returns string directly, not event
  placeholder?: string;
  required?: boolean; // Default: false
  disabled?: boolean; // Default: false
  error?: string; // Error message triggers error state
  id?: string;
  className?: string;
}
```

```tsx
<Input label="Email" type="email" required error={errors.email} />
```

### Select

ForwardRef. Uses Radix Select primitive. Supports grouped options and search.

**Accessibility:** Radix provides keyboard navigation, focus management, and ARIA roles; keep option labels descriptive and never use placeholder text as the only label.

```typescript
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectOptionGroup {
  label: string;
  options: SelectOption[];
}

interface SelectProps {
  label: string;
  name?: string;
  options: Array<SelectOption | SelectOptionGroup>;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string; // Default: 'Select...'
  disabled?: boolean; // Default: false
  error?: string;
  isSearchable?: boolean; // Default: false
  required?: boolean; // Default: false
  className?: string;
}
```

```tsx
<Select
  label="Status"
  options={[
    { value: "active", label: "Active" },
    { value: "disabled", label: "Disabled" },
  ]}
  onChange={setStatus}
/>
```

### TextArea

**Accessibility:** Behaves like a labeled native textarea and surfaces field-level validation messages through the generated error region.

ForwardRef. Auto-generates id.

```typescript
interface TextAreaProps {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean; // Default: false
  disabled?: boolean; // Default: false
  placeholder?: string;
  name?: string;
  id?: string;
  className?: string;
  rows?: number; // Default: 3
  maxLength?: number;
  resize?: "none" | "vertical" | "both"; // Default: 'vertical'
}
```

### Checkbox

**Accessibility:** Associates the checkbox with visible label text and keeps validation feedback connected to the control through the rendered error message.

ForwardRef. Auto-generates id.

```typescript
interface CheckboxProps {
  label: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean; // Default: false
  disabled?: boolean; // Default: false
  name?: string;
  id?: string;
  className?: string;
}
```

### Form

Wraps react-hook-form + Zod resolver. Single source of truth for validation.

**Accessibility:** Keep submit controls inside the form, use `FormField` so validation stays associated with each input, and prefer schema-defined error messages over custom ad hoc text.

```typescript
interface FormProps<TSchema extends z.ZodType<Record<string, unknown>>> {
  schema: TSchema;
  onSubmit: (data: z.infer<TSchema>) => void | Promise<void>;
  onReset?: () => void;
  defaultValues?: Partial<z.infer<TSchema>>;
  density?: "comfortable" | "compact"; // Default: 'comfortable'
  disabled?: boolean; // Default: false
  children: React.ReactNode;
  className?: string;
  id?: string;
}
```

```tsx
const OrderSchema = z.object({
  name: z.string().min(1),
  quantity: z.coerce.number().min(1),
});

<Form schema={OrderSchema} onSubmit={handleSubmit}>
  <FormField name="name">
    <Input label="Name" />
  </FormField>
  <FormField name="quantity">
    <Input label="Quantity" type="number" />
  </FormField>
  <Button type="submit" variant="primary">
    Create
  </Button>
</Form>;
```

### FormField

Must be inside `<Form>`. Connects child to react-hook-form via `Controller`. Auto-infers required from schema.

**Accessibility:** `FormField` is the canonical way to attach validation and required-state feedback to inputs so assistive technologies announce errors in the right place.

```typescript
interface FormFieldProps {
  name: string; // Must match a key in the Form's Zod schema
  children: React.ReactElement;
}
```

### useFormStatus

Hook for form state. Must be inside `<Form>`.

**Accessibility:** Use this hook to reflect submit state accessibly, for example by disabling submit buttons and updating button text while preserving the same control.

```typescript
function useFormStatus(): {
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
};
```

### DatePicker

ForwardRef. Uses Radix Popover + react-day-picker.

**Accessibility:** Combines a labeled trigger with keyboard-navigable calendar content in a popover; always provide a visible label and sensible bounds when relevant.

```typescript
interface DatePickerProps {
  label: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean; // Default: false
  disabled?: boolean; // Default: false
  placeholder?: string; // Default: 'Select date...'
  minDate?: Date;
  maxDate?: Date;
  name?: string;
  id?: string;
  className?: string;
}
```

---

## Feedback

### ToastProvider / useToast

**Accessibility:** Toasts are announced through Radix toast primitives; use them for transient feedback rather than as the only surface for blocking or destructive errors.

```typescript
interface ToastOptions {
  variant: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number; // ms. Error toasts never auto-dismiss. Others default: 5000
}

interface ToastProviderProps {
  children: React.ReactNode;
}

function useToast(): {
  toast: (options: ToastOptions) => string; // Returns toast id
  dismiss: (id: string) => void;
};
```

Max 3 visible toasts. Error toasts are prioritized and don't auto-dismiss.

```tsx
const { toast } = useToast();
toast({ variant: "success", title: "Order created" });
```

### Skeleton

Loading placeholder matching target content layout.

**Accessibility:** Exposes loading semantics with `role="status"` and `aria-busy="true"`; choose the variant that matches the eventual content structure.

```typescript
interface SkeletonProps {
  variant: "table" | "form" | "detail" | "card";
  rows?: number; // For table variant. Default: 5
  fields?: number; // For form variant. Default: 4
  isReady?: boolean; // Default: false. 300ms minimum display before unmount.
  className?: string;
}
```

WCAG: `role="status"`, `aria-busy="true"`.

```tsx
if (isLoading) return <Skeleton variant="table" rows={10} />;
```

### EmptyState

Centered empty data display with optional action.

**Accessibility:** Provide clear title and action text so the next step is understandable without relying on illustrations or surrounding context.

```typescript
interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: EmptyStateAction;
  illustration?: React.ReactNode;
  className?: string;
}
```

```tsx
<EmptyState
  title="No orders yet"
  description="Create your first order to get started"
  action={{ label: "Create Order", onClick: () => navigate("/create") }}
/>
```

### ErrorDisplay

Inline error display with optional retry.

**Accessibility:** Use concise titles, keep retry actions explicit, and avoid hiding critical failure information exclusively in development-only diagnostics.

```typescript
interface ErrorDisplayProps {
  error: Error | string;
  title?: string; // Default: 'Something went wrong'
  onRetry?: () => void;
  className?: string;
}
```

Shows expandable stack trace in development mode.

```tsx
if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
```

### ErrorBoundary

React error boundary. Wraps children and catches render errors.

**Accessibility:** Fallback content should preserve a clear recovery path and avoid trapping focus away from the retry or escape action.

```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?:
    | React.ReactNode
    | ((error: Error, reset: () => void) => React.ReactNode);
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  className?: string;
}
```

Default fallback: `<ErrorDisplay>` with retry.

```tsx
<ErrorBoundary onError={logError}>
  <OrdersPage />
</ErrorBoundary>
```

---

## Navigation

### Sidebar

Shell-level navigation sidebar with search and grouping.

**Accessibility:** Keep icon-only collapsed items paired with accessible labels or tooltips and ensure the current item is exposed through the component's active-state handling.

```typescript
interface NavigationItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href: string;
  category?: string;
}

interface SidebarProps {
  items: NavigationItem[];
  activeItemId?: string;
  onItemClick?: (item: NavigationItem) => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (isCollapsed: boolean) => void;
  isSearchable?: boolean; // Default: true
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}
```

Auto-collapses at 1280px breakpoint. Groups items by `category`.

### Tabs

**Accessibility:** Radix tabs provide roving keyboard focus and ARIA semantics; tab labels should stand alone and panel content should begin with a meaningful heading or summary.

```typescript
interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  items: TabItem[];
  defaultValue?: string; // Default: first tab id
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical"; // Default: 'horizontal'
  className?: string;
}
```

```tsx
<Tabs
  items={[
    {
      id: "details",
      label: "Details",
      content: <DetailView sections={sections} />,
    },
    {
      id: "history",
      label: "History",
      content: <Table data={history} columns={cols} />,
    },
  ]}
/>
```

---

## Overlay

### Tooltip

**Accessibility:** Tooltips should supplement, not replace, visible labels or critical instructions because they are not guaranteed to be discovered on every interaction path.

```typescript
interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement; // Must accept ref
  side?: "top" | "right" | "bottom" | "left"; // Default: 'top'
  align?: "start" | "center" | "end"; // Default: 'center'
  delayDuration?: number; // Default: 300ms
  className?: string;
}
```

### Modal

Controlled dialog with title, description, and close button.

**Accessibility:** Focus is trapped while open and returns to the trigger on close; use concise titles and descriptions so screen readers announce the dialog purpose immediately.

```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "small" | "medium" | "large"; // Default: 'medium'
  closeLabel?: string; // Default: 'Close'
  className?: string;
}
```

```tsx
<Modal open={isOpen} onClose={() => setIsOpen(false)} title="Edit Order">
  <Form schema={schema} onSubmit={handleSubmit}>
    ...
  </Form>
</Modal>
```

### AlertDialog

Confirmation dialog for destructive actions.

**Accessibility:** Reserve `AlertDialog` for high-stakes confirmations, keep the description explicit, and ensure destructive actions are clearly named rather than implied.

```typescript
interface AlertDialogProps {
  open: boolean;
  onAction: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  actionLabel?: string; // Default: 'Delete'
  cancelLabel?: string; // Default: 'Cancel'
  className?: string;
}
```

### DropdownMenu

Context menu with items, groups, separators, and submenus (1 level).

**Accessibility:** Radix supplies keyboard navigation and menu semantics; keep item labels action-oriented and avoid hiding critical confirmations exclusively inside a menu.

```typescript
interface DropdownMenuItem {
  label: string;
  onSelect?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  submenu?: Array<DropdownMenuItem | DropdownMenuSeparator>;
}

interface DropdownMenuSeparator {
  type: "separator";
}

interface DropdownMenuGroup {
  label?: string;
  items: Array<DropdownMenuItem | DropdownMenuSeparator>;
}

interface DropdownMenuProps {
  trigger: React.ReactElement;
  items: Array<DropdownMenuItem | DropdownMenuSeparator | DropdownMenuGroup>;
  align?: "start" | "center" | "end"; // Default: 'start'
  side?: "top" | "right" | "bottom" | "left"; // Default: 'bottom'
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sideOffset?: number; // Default: 4
  className?: string;
}
```

### Popover

Floating content panel anchored to a trigger.

**Accessibility:** Use popovers for supplementary interactive content, not essential navigation; the trigger should explain what opens and what the user can do there.

```typescript
interface PopoverProps {
  trigger: React.ReactElement;
  children: React.ReactNode;
  align?: "start" | "center" | "end"; // Default: 'center'
  side?: "top" | "right" | "bottom" | "left"; // Default: 'bottom'
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  sideOffset?: number; // Default: 4
  className?: string;
}
```

---

## Data Display

### Table

Full-featured data table with sorting, pagination, filtering, search, and CSV export. Uses `@tanstack/react-table`.

**Accessibility:** Uses semantic table markup with caption support; sortable headers should remain understandable as interactive controls and row-click behavior should not be the only path to record details.

```typescript
interface TableColumn<TData> {
  id: string;
  header: string;
  accessorFn?: (row: TData) => unknown;
  accessorKey?: keyof TData & string;
  cell?: (props: { value: unknown; row: TData }) => React.ReactNode;
  isSortable?: boolean; // Default: true
  filterType?: "text" | "select" | "date-range"; // Default: 'text'
  filterOptions?: { label: string; value: string }[];
  isFilterable?: boolean;
}

interface TableFilterState {
  columnFilters: { id: string; value: unknown }[];
  globalFilter: string;
}

interface TableProps<TData> {
  data: TData[];
  columns: TableColumn<TData>[];
  sorting?: boolean; // Default: true
  pagination?:
    | boolean
    | { pageSize?: number; pageSizes?: number[]; totalRows?: number };
  // Default: true (pageSize: 10, pageSizes: [10, 25, 50, 100])
  onRowClick?: (row: TData) => void;
  density?: "compact" | "comfortable"; // Default: 'compact'
  stickyHeader?: boolean; // Default: false
  scrollable?: boolean; // Default: false
  emptyState?: React.ReactNode;
  loadingState?: React.ReactNode;
  loading?: boolean; // Default: false
  caption?: string;
  "aria-label"?: string;
  className?: string;
  serverSide?: boolean; // Default: false
  onSort?: (sorting: { id: string; desc: boolean }[]) => void;
  onPageChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  onFilter?: (filters: TableFilterState) => void;
  globalSearch?: boolean; // Default: false
  columnFilters?: boolean; // Default: false
  csvExport?: boolean; // Default: false
  rowClassName?: (
    row: TData,
  ) => "row-urgent" | "row-warning" | "row-success" | undefined;
}
```

```tsx
const columns: TableColumn<Order>[] = [
  { id: "id", header: "ID", accessorKey: "id" },
  { id: "status", header: "Status", accessorKey: "status" },
  { id: "total", header: "Total", accessorFn: (row) => `$${row.total}` },
];

<Table data={orders} columns={columns} onRowClick={navigateToDetail} />;
```

### DetailView

Sectioned key-value display for detail pages.

**Accessibility:** Keep labels concise and values readable in source order so screen readers announce each label-value pair predictably; pair actions with descriptive button text.

```typescript
interface DetailField {
  label: string;
  value: React.ReactNode;
  span?: 1 | 2; // Default: 1. Use 2 for full-width fields.
}

interface DetailSection {
  title: string;
  fields: DetailField[];
}

interface DetailViewProps {
  sections: DetailSection[];
  actions?: React.ReactNode;
  loading?: boolean; // Default: false. Shows Skeleton when true.
  density?: "comfortable" | "compact"; // Default: 'comfortable'
  className?: string;
}
```

```tsx
<DetailView
  sections={[
    {
      title: "Order Info",
      fields: [
        { label: "ID", value: order.id },
        { label: "Status", value: <Badge>{order.status}</Badge> },
        { label: "Notes", value: order.notes, span: 2 },
      ],
    },
  ]}
  actions={<Button onClick={handleEdit}>Edit</Button>}
/>
```

---

## Form + Zod Integration Pattern

```tsx
import { z } from "zod";
import {
  Form,
  FormField,
  Button,
  Input,
  Select,
  useFormStatus,
} from "@hexalith/ui";

const CreateOrderSchema = z.object({
  name: z.string().min(1, "Name is required"),
  priority: z.enum(["low", "medium", "high"]),
});

function SubmitButton() {
  const { isSubmitting, isValid } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={isSubmitting || !isValid}>
      {isSubmitting ? "Creating..." : "Create"}
    </Button>
  );
}

function CreateOrderForm() {
  return (
    <Form schema={CreateOrderSchema} onSubmit={handleSubmit}>
      <FormField name="name">
        <Input label="Order Name" />
      </FormField>
      <FormField name="priority">
        <Select
          label="Priority"
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      </FormField>
      <SubmitButton />
    </Form>
  );
}
```

**Anti-patterns:**

- Don't duplicate Zod validation in component code — `<Form>` handles it.
- Don't use `useState` for form state — use `useFormStatus` and `<FormField>`.
- Don't import from `@radix-ui/*` — import from `@hexalith/ui`.
