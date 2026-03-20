# Story 3.5: Data Table — Core Features

Status: done

## Story

As a module developer,
I want a data table with sorting, pagination, row click, and density support,
So that end users can browse and navigate data sets with a consistent, accessible table component.

## Acceptance Criteria

1. **Table component built with TanStack Table + design tokens (no Radix dependency):** `<Table data={orders} columns={columns} />` renders with design token styling, semantic HTML (`<table>`, `<th scope>`, `<caption>`). The component is classified as complex with ≤ 20 props total (core + advanced combined budget).

2. **Client-side sorting:** When a user clicks a column header, the column sorts ascending, then descending on second click, then unsorted on third click. Sort direction is indicated with a visual arrow using `--transition-duration-default` (200ms) motion token.

3. **Client-side pagination:** When data exceeds the page size, pagination controls appear below the table. The current page, total pages, and page size selector are displayed.

4. **Row click navigation:** When `onRowClick` is provided, clicking a table row fires the callback with the row data. Interactive components inside cells call `event.stopPropagation()` (built into cell renderer).

5. **Linear-inspired density:** When rendered with default density, rows are compact with muted secondary info (`--color-text-secondary`) and bold primary info (`--font-weight-semibold`) for maximum visible rows. `stickyHeader` and `scrollable` props are supported.

6. **Theme and accessibility compliance:** The table passes axe-core validation with zero violations in both light and dark themes. Token compliance scan reports 100% for all table CSS.

## Tasks / Subtasks

- [x] Task 0: Pre-implementation verification (AC: all)
  - [x] **GATE CHECK:** Run `pnpm build && pnpm test && pnpm lint` in `packages/ui/`. **If any command fails, STOP and report.**
  - [x] **PREREQUISITE:** Verify Story 3-1 is complete — `packages/ui/src/components/layout/` exists with PageLayout, Stack, Inline, Divider; `clsx` is a dependency; test libraries in devDependencies; `vitest.config.ts` has CSS Module support; ESLint `no-restricted-imports` blocks `@radix-ui/*` from outside `packages/ui/`.
  - [x] **PREREQUISITE:** Verify Story 3-2 is complete — `packages/ui/src/components/forms/` exists with Button, Input, Select; `@testing-library/user-event` is a devDependency; `data-*` attribute pattern validated; jsdom polyfills in test-setup.ts.
  - [x] **NOTE:** Stories 3-3 (Feedback) and 3-4 (Navigation) are independent from this story. Proceed regardless of their status.
  - [x] Verify existing token references needed by table components: `--color-surface-primary`, `--color-surface-secondary`, `--color-surface-elevated`, `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-disabled`, `--color-border-default`, `--color-border-subtle`, `--color-accent`, `--color-accent-subtle`, `--color-status-success`, `--color-status-warning`, `--color-status-danger`, `--font-size-sm`, `--font-size-body`, `--font-weight-medium`, `--font-weight-semibold`, `--line-height-table`, `--transition-duration-fast`, `--transition-duration-default`, `--transition-easing-default`, `--spacing-1` through `--spacing-6`, `--spacing-cell`

- [x] Task 1: Add TanStack Table dependency (AC: #1)
  - [x] Add `@tanstack/react-table` (^8.21.3) as a direct dependency in `packages/ui/package.json`
  - [x] Run `pnpm install` to verify dependency resolution
  - [x] Verify ESLint `no-restricted-imports` blocks `@tanstack/react-table` from outside `packages/ui/` (module developers use `<Table>`, never TanStack directly)

- [x] Task 2: Implement `<Table>` component — core rendering (AC: #1, #5, #6)
  - [x] Create `packages/ui/src/components/data-display/Table/` directory structure:
    - `index.ts` — re-export: `export { Table } from './Table'`
    - `Table.tsx` — main component
    - `Table.module.css` — styles in `@layer components { }`
    - `Table.test.tsx` — Vitest tests
  - [x] Implement `TableProps` interface (see Component API Specifications below)
  - [x] Implement using `@tanstack/react-table` with `useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `getPaginationRowModel`
  - [x] Render semantic HTML: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th scope="col">`, `<td>`, `<caption>` (caption from `aria-label` or `caption` prop)
  - [x] Implement `React.forwardRef` on the root wrapper `<div>` (not on `<table>` — the wrapper handles scrollable container)
  - [x] Implement `data-density` attribute on root for density styling
  - [x] Implement `stickyHeader` prop: sticky `<thead>` using `position: sticky; top: 0; z-index: 1;`
  - [x] Implement `scrollable` prop: wrapper `<div>` with `overflow-y: auto; max-height` controlled by consumer via CSS
  - [x] Implement empty state: when `data` is empty and `emptyState` prop is provided, render it in place of `<tbody>` rows
  - [x] Implement loading state: when `loading` is true, render `loadingState` prop content or a default skeleton
  - [x] Set `Table.displayName = 'Table'`

- [x] Task 3: Implement sorting (AC: #2)
  - [x] Enable sorting via TanStack's `getSortedRowModel()` when `sorting` prop is not `false`
  - [x] Implement column header click handler: ascending → descending → unsorted (tri-state)
  - [x] Render sort direction indicator (inline SVG arrow — up/down/neutral) with `--transition-duration-default` transition on rotation
  - [x] Add `aria-sort` state on sortable `<th>` elements when the column is sorted
  - [x] Make column headers `<button>` elements inside `<th>` for keyboard accessibility (clickable, focusable)
  - [x] Implement `prefers-reduced-motion`: instant sort indicator change (0ms transition)

- [x] Task 4: Implement pagination (AC: #3)
  - [x] Enable pagination via TanStack's `getPaginationRowModel()` when `pagination` prop is not `false`
  - [x] Render pagination controls below table: Previous/Next buttons, current page indicator, total pages
  - [x] Implement page size selector using a native `<select>` element (NOT the Select component — pagination controls are compact utility UI)
  - [x] Default page sizes: `[10, 25, 50, 100]`; default page size: `10`
  - [x] Implement `pagination` prop accepting `{ pageSize?: number; pageSizes?: number[] }` for customization
  - [x] Pagination controls use `--font-size-sm`, `--color-text-secondary`
  - [x] Previous/Next buttons use the Button component from `'../../forms/Button'`
  - [x] Disable Previous on first page, Next on last page

- [x] Task 5: Implement row click (AC: #4)
  - [x] When `onRowClick` is provided, add `onClick` handler to each `<tr>` in `<tbody>`
  - [x] Set `cursor: pointer` and hover background on clickable rows
  - [x] Fire callback with the row's original data object: `onRowClick(row.original)`
  - [x] Guard interactive cell descendants: if a cell contains buttons, links, or other interactive elements, activating them does NOT trigger `onRowClick` because the row handler ignores interactive event targets built into the rendered cell content
  - [x] Implement keyboard accessibility: rows with `onRowClick` get `tabIndex={0}` and an `onKeyDown` handler for Enter/Space

- [x] Task 6: Final verification — Definition of Done (AC: all)
  - [x] Update `packages/ui/src/index.ts` with Data Display section exports. Insert after Overlay section, before Utilities section. Category comment: `// --- Data Display ---`
  - [x] Export: `Table`, `TableProps`, `TableColumn` (the column definition type)
  - [x] Run `pnpm build` — confirm tsup produces ESM + .d.ts
  - [x] Run `pnpm test` — confirm ALL Vitest tests pass (layout + forms + feedback + navigation + overlay + data-display)
  - [x] Run `pnpm lint` — confirm ESLint + token compliance passes
  - [x] Run token compliance scanner against all new CSS Modules — must report 100%
  - [x] Verify table renders correctly with `[data-theme="dark"]` on root
  - [x] Verify sorting: click header → ascending → descending → unsorted
  - [x] Verify pagination: navigate pages, change page size
  - [x] Verify row click fires callback with correct row data
  - [x] Verify `stickyHeader` keeps header visible during scroll
  - [x] Verify empty state renders when data is empty
  - [x] Verify loading state renders when `loading` is true
  - [x] **Story is DONE when all of the above pass.** Do not mark complete with any failure.

## Dev Notes

### Prerequisites — Stories 3-1 AND 3-2 Must Be Complete

Story 3-5 depends on Story 3-1 (layout components, test infrastructure, CSS layer setup) and Story 3-2 (forms components, `data-*` attribute pattern, jsdom polyfills). Stories 3-3 (Feedback) and 3-4 (Navigation) are NOT dependencies.

**From Story 3-1:**

- `packages/ui/src/components/layout/` with PageLayout, Stack, Inline, Divider
- `clsx` as a direct dependency in package.json
- `@testing-library/react` and `@testing-library/jest-dom` as devDependencies
- `vitest.config.ts` with `css: { modules: true }` (projects config with jsdom)
- ESLint `no-restricted-imports` blocking `@radix-ui/*` from outside `packages/ui/`
- Test setup: `afterEach(cleanup)` in test-setup.ts

**From Story 3-2:**

- `@testing-library/user-event` as a devDependency
- `data-*` attribute pattern validated for CSS Module attribute selectors
- jsdom polyfills in test-setup.ts: `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView`, `ResizeObserver`
- Button component available for pagination Previous/Next buttons: `import { Button } from '../../forms/Button'`

**If any prerequisite is missing, STOP and report.**

### Architecture Constraints — MUST Follow

1. **File naming:** PascalCase.tsx, PascalCase.module.css, PascalCase.test.tsx. [Source: architecture.md#Naming Patterns]

2. **Component location:** Table is a complex component — use folder structure: `src/components/data-display/Table/`. The architecture file explicitly shows `data-display/Table/` with an `index.ts` re-export. [Source: architecture.md#File Structure line 1359-1369]

3. **CSS Modules + @layer:** All styles MUST use CSS Modules (`.module.css`) wrapped in `@layer components { }`. Use design token CSS custom properties exclusively — zero hardcoded values. [Source: architecture.md#Styling Solution]

4. **Zero external margin:** ALL components have zero external margin. Parent layout containers control spacing via `gap`. [Source: UX spec#Margin-Free Components]

5. **CSS class names:** camelCase for CSS Module class names (`.tableRoot`, `.headerCell`, `.sortIndicator`). [Source: architecture.md#CSS class names]

6. **Barrel export:** Root `src/index.ts` is the ONLY barrel file. Complex component folders get `index.ts` for re-export ONLY. Category order: **Layout → Forms → Feedback → Navigation → Overlay → Data Display → Utilities**. [Source: architecture.md#Barrel Export Clarification]

7. **Prop naming:** Domain terms, not primitives. Event handlers: `on` + PascalCase verb. Boolean props: `is`/`has`/`should` prefix. [Source: architecture.md#Code Naming]

8. **No Radix dependency:** Table uses semantic HTML + TanStack Table for data management. No Radix primitives needed. [Source: architecture.md#Components without Radix dependency, UX spec#Table/Form Accessibility Model]

9. **Package dependency rules:** `@hexalith/ui` may import from React and `@tanstack/react-table`. MUST NOT import from `@hexalith/cqrs-client`. Table is data-agnostic — data comes via props. [Source: architecture.md#Package Dependency Rules]

10. **Component complexity:** Table is Complex (≤ 20 props). Current core story budget: ~13 props (`data`, `columns`, `sorting`, `pagination`, `onRowClick`, `density`, `stickyHeader`, `scrollable`, `emptyState`, `loadingState`, `loading`, `caption`, `className`). Story 3-6 adds ~6 more. Phase 2 uses compound components. [Source: UX spec#Component Complexity Classification]

11. **API stability:** Table's API is additive-only after MVP. New props can be added; existing props cannot change behavior. [Source: UX spec#Content Component Stability]

12. **Third-party type re-export policy:** Define own types (`TableColumn`, `TableProps`). Do NOT re-export TanStack types. If TanStack Table is ever replaced, module code must not break. [Source: architecture.md#Third-Party Type Re-Export Policy]

13. **Storybook title:** `@hexalith/ui/Data Display/Table` (for Story 3-9). [Source: architecture.md#Storybook Sidebar Convention]

### Component API Specifications

#### `<Table>` (Complex — ≤ 20 props, Story 3-5 uses ~13)

```tsx
/**
 * Column definition for the Table component.
 * Wraps TanStack Table's ColumnDef internally but exposes a simplified interface.
 */
interface TableColumn<TData> {
  /** Unique column identifier — must match a key in TData or be a custom ID */
  id: string;
  /** Column header label */
  header: string;
  /** Accessor function to extract cell value from row data */
  accessorFn?: (row: TData) => unknown;
  /** Accessor key matching a property of TData (alternative to accessorFn) */
  accessorKey?: keyof TData & string;
  /** Custom cell renderer — receives cell value and row data */
  cell?: (props: { value: unknown; row: TData }) => React.ReactNode;
  /** Enable sorting for this column — defaults to true */
  isSortable?: boolean;
}

interface TableProps<TData> {
  /** Array of data objects to display */
  data: TData[];
  /** Column definitions */
  columns: TableColumn<TData>[];
  /** Enable client-side sorting — defaults to true. Pass false to disable, or an object to configure. */
  sorting?: boolean;
  /** Enable client-side pagination — defaults to true. Pass false to disable, or an object to configure page size. */
  pagination?: boolean | { pageSize?: number; pageSizes?: number[] };
  /** Row click handler — fires with the original row data */
  onRowClick?: (row: TData) => void;
  /** Density mode — defaults to 'compact' (Linear-inspired) */
  density?: "compact" | "comfortable";
  /** Sticky table header — defaults to false */
  stickyHeader?: boolean;
  /** Enable vertical scrolling — defaults to false. Consumer controls max-height via CSS on parent. */
  scrollable?: boolean;
  /** Content to display when data array is empty */
  emptyState?: React.ReactNode;
  /** Content to display during loading state */
  loadingState?: React.ReactNode;
  /** Whether data is currently loading — defaults to false */
  loading?: boolean;
  /** Table caption for accessibility (renders as `<caption>` with `sr-only` class) */
  caption?: string;
  /** Accessible label for the table; also used as fallback caption text when `caption` is not provided */
  "aria-label"?: string;
  /** Additional CSS class */
  className?: string;
}
```

**Generic component pattern:**

```tsx
// Table must be a generic component to preserve type safety on columns and row data
function TableInner<TData>(
  props: TableProps<TData> & { ref?: React.Ref<HTMLDivElement> }
): React.ReactElement { ... }

// forwardRef with generic requires this pattern:
export const Table = React.forwardRef(TableInner) as <TData>(
  props: TableProps<TData> & { ref?: React.Ref<HTMLDivElement> }
) => React.ReactElement;

(Table as { displayName?: string }).displayName = 'Table';
```

**IMPORTANT: Generic forwardRef pattern.** React's `forwardRef` erases generics. Use the inner function + type assertion pattern above. This is a known React limitation — do NOT use `React.forwardRef<HTMLDivElement, TableProps<unknown>>` as it loses the generic. Research TanStack Table's documentation for their recommended React integration pattern if unsure.

**TanStack Table integration:**

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type PaginationState,
} from "@tanstack/react-table";

// Inside component:

// Normalize the overloaded `pagination` prop into a clean config
const paginationConfig = useMemo(() => {
  if (paginationProp === false) return null;
  const defaults = { pageSize: 10, pageSizes: [10, 25, 50, 100] };
  if (paginationProp === true || paginationProp === undefined) return defaults;
  return { ...defaults, ...paginationProp };
}, [paginationProp]);

const [sorting, setSorting] = useState<SortingState>([]);
const [pagination, setPagination] = useState<PaginationState>({
  pageIndex: 0,
  pageSize: paginationConfig?.pageSize ?? 10,
});

// Map TableColumn<TData> to TanStack ColumnDef<TData>
const tanstackColumns: ColumnDef<TData>[] = useMemo(
  () =>
    columns.map((col) => ({
      id: col.id,
      accessorFn: col.accessorFn,
      accessorKey: col.accessorKey,
      header: () => col.header,
      cell: col.cell
        ? (info) =>
            col.cell!({ value: info.getValue(), row: info.row.original })
        : (info) => String(info.getValue() ?? ""),
      enableSorting: col.isSortable !== false,
    })),
  [columns],
);

const table = useReactTable({
  data,
  columns: tanstackColumns,
  state: {
    sorting: sortingEnabled ? sorting : undefined,
    pagination: paginationEnabled ? pagination : undefined,
  },
  onSortingChange: sortingEnabled ? setSorting : undefined,
  onPaginationChange: paginationEnabled ? setPagination : undefined,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: sortingEnabled ? getSortedRowModel() : undefined,
  getPaginationRowModel: paginationEnabled
    ? getPaginationRowModel()
    : undefined,
});
```

**Rendering structure:**

```tsx
<div ref={ref} className={clsx(styles.root, className)} data-density={density}>
  <div className={clsx(styles.tableContainer, scrollable && styles.scrollable)}>
    <table className={styles.table} aria-label={ariaLabel}>
      {(caption ?? ariaLabel) && (
        <caption className={styles.caption}>{caption ?? ariaLabel}</caption>
      )}
      <thead
        className={clsx(styles.thead, stickyHeader && styles.stickyHeader)}
      >
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id} scope="col" className={styles.headerCell}>
                {header.column.getCanSort() ? (
                  <button
                    className={styles.sortButton}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    <span
                      className={styles.sortIndicator}
                      data-direction={header.column.getIsSorted() || "none"}
                    >
                      {/* Inline SVG sort arrow */}
                    </span>
                  </button>
                ) : (
                  flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody className={styles.tbody}>
        {loading ? (
          <tr>
            <td colSpan={columns.length} className={styles.stateCell}>
              {loadingState ?? <Skeleton variant="table" rows={5} />}
            </td>
          </tr>
        ) : table.getRowModel().rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className={styles.stateCell}>
              {emptyState ?? "No data"}
            </td>
          </tr>
        ) : (
          table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={clsx(styles.row, onRowClick && styles.clickableRow)}
              onClick={
                onRowClick
                  ? (event) => {
                      if (isInteractiveContentTarget(event.target)) {
                        return;
                      }

                      onRowClick(row.original);
                    }
                  : undefined
              }
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (
                        e.target !== e.currentTarget &&
                        isInteractiveContentTarget(e.target)
                      ) {
                        return;
                      }

                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onRowClick(row.original);
                      }
                    }
                  : undefined
              }
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={styles.cell}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>
  {/* Pagination controls rendered here when enabled */}
</div>
```

### Design Token References

**Color tokens (from `src/tokens/colors.css`):**

- `--color-surface-primary` — Table background
- `--color-surface-secondary` — Row hover, striped rows (if used), pagination background
- `--color-surface-elevated` — Sticky header background (needs to be opaque for sticky)
- `--color-text-primary` — Primary cell text, sort arrow active
- `--color-text-secondary` — Secondary cell text (muted columns), pagination text
- `--color-text-tertiary` — Column header text
- `--color-text-disabled` — Disabled pagination buttons
- `--color-border-default` — Table cell borders, pagination borders
- `--color-border-subtle` — Horizontal row dividers (lighter alternative)
- `--color-accent` — Active sort indicator
- `--color-accent-subtle` — Active sort column header background tint

**Spacing tokens (from `src/tokens/spacing.css`):**

- `--spacing-1` (4px) — Sort indicator gap from header text
- `--spacing-2` (8px) — Cell vertical padding (compact density)
- `--spacing-3` (12px) — Cell horizontal padding, pagination button padding
- `--spacing-4` (16px) — Pagination container padding
- `--spacing-cell` (density-aware: 12px comfortable / 8px compact) — Alternative cell padding token

**Typography tokens (from `src/tokens/typography.css`):**

- `--font-size-sm` — Pagination controls text, column header text
- `--font-size-body` — Cell text
- `--font-weight-medium` (500) — Column header text
- `--font-weight-semibold` (600) — Primary cell text (bold primary info per density profile)
- `--line-height-table` (1.3) — Table-specific line height for compact rows

**Motion tokens (from `src/tokens/motion.css`):**

- `--transition-duration-fast` (100ms) — Row hover transition
- `--transition-duration-default` (200ms) — Sort indicator rotation
- `--transition-easing-default` — Standard easing for all transitions
- `@media (prefers-reduced-motion: reduce)` — Collapse all transitions to 0ms

### Visual Design Specifications

**Table density profile (Linear-inspired):**

| Element                 | Value                                 | Token                                     |
| ----------------------- | ------------------------------------- | ----------------------------------------- |
| Row height              | ~36px (compact) / ~44px (comfortable) | Achieved via cell padding + line height   |
| Cell vertical padding   | 6px (compact) / 10px (comfortable)    | `--spacing-cell` or manual                |
| Cell horizontal padding | 12px                                  | `--spacing-3`                             |
| Header font size        | `--font-size-sm`                      | Slightly smaller than body                |
| Header font weight      | `--font-weight-medium`                | Medium weight, not bold                   |
| Header text color       | `--color-text-tertiary`               | Muted — headers recede, data stands out   |
| Header text transform   | `uppercase`                           | Tiny muted all-caps (Linear pattern)      |
| Header letter spacing   | `0.05em`                              | Slight tracking for uppercase readability |
| Body font size          | `--font-size-body`                    | Standard body text                        |
| Body line height        | `--line-height-table` (1.3)           | Compact table-specific line height        |
| Primary cell weight     | `--font-weight-semibold`              | Bold primary column                       |
| Secondary cell color    | `--color-text-secondary`              | Muted secondary data                      |

**Borders and dividers:**

- Row dividers: `1px solid var(--color-border-subtle)` — subtle horizontal lines
- Table outer border: none (contained by parent layout)
- Header bottom border: `2px solid var(--color-border-default)` — visual separation

**Hover state:**

- Row hover: `--color-surface-secondary` background
- Transition: `background var(--transition-duration-fast) var(--transition-easing-default)`
- Clickable rows: `cursor: pointer` when `onRowClick` is provided

**Sticky header:**

- `position: sticky; top: 0; z-index: 1;`
- Background: `--color-surface-elevated` (must be opaque to cover scrolled rows)
- Bottom shadow on scroll: `box-shadow: 0 1px 0 0 var(--color-border-default)`

**Sort indicator:**

- Inline SVG arrow (up/down chevron, ~6-8 lines)
- Neutral state: `--color-text-disabled` (barely visible)
- Active ascending: rotated 0deg, `--color-accent`
- Active descending: rotated 180deg, `--color-accent`
- Transition: `transform var(--transition-duration-default) var(--transition-easing-default)`

```tsx
// Sort indicator SVG
<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
  <path
    d="M3 5L6 2L9 5"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
  <path
    d="M3 7L6 10L9 7"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  />
</svg>
// Show only up arrow for ascending, only down for descending, both (dimmed) for neutral
```

**Pagination controls:**

- Container: `display: flex; justify-content: space-between; align-items: center;`
- Left side: page size selector (`<select>`)
- Center/right: page info ("Page 1 of 10") + Previous/Next buttons
- Button styling: use the `Button` component with `variant="ghost"` and `size="sm"`
- Font: `--font-size-sm`, `--color-text-secondary`
- Spacing: `--spacing-3` gap between elements, `--spacing-4` vertical padding above controls

**Caption (accessibility — `.caption` sr-only class):**

- Visually hidden — MUST include in CSS Module:

```css
.caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

- Screen readers announce the table purpose via the `<caption>` element
- This is the standard sr-only pattern — do NOT use `display: none` or `visibility: hidden` (those hide from screen readers too)

### Testing Approach

Co-located Vitest tests (`.test.tsx`) using `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`.

**`userEvent` setup pattern (established in Story 3-2):**

```tsx
import userEvent from "@testing-library/user-event";

const user = userEvent.setup();
// Then in tests:
await user.click(element);
await user.keyboard("{ArrowDown}");
```

**Test data helper:**

```tsx
interface TestOrder {
  id: string;
  customer: string;
  total: number;
  status: string;
  date: string;
}

const testOrders: TestOrder[] = [
  {
    id: "1",
    customer: "Acme Corp",
    total: 1500,
    status: "completed",
    date: "2026-03-01",
  },
  {
    id: "2",
    customer: "Globex Inc",
    total: 2300,
    status: "pending",
    date: "2026-03-15",
  },
  {
    id: "3",
    customer: "Initech",
    total: 800,
    status: "completed",
    date: "2026-02-28",
  },
  // ... enough rows to test pagination (at least 15+)
];

const testColumns: TableColumn<TestOrder>[] = [
  { id: "customer", header: "Customer", accessorKey: "customer" },
  {
    id: "total",
    header: "Total",
    accessorKey: "total",
    cell: ({ value }) => `$${value}`,
  },
  { id: "status", header: "Status", accessorKey: "status" },
  { id: "date", header: "Date", accessorKey: "date" },
];
```

**Table tests:**

- Renders all rows from data array
- Renders column headers with correct labels
- Renders cell values using accessorKey
- Renders cell values using custom cell renderer
- Semantic HTML: `<table>`, `<thead>`, `<tbody>`, `<th scope="col">` present
- Caption renders as visually hidden `<caption>` element
- **Sorting:** Clicking a sortable column header sorts ascending
- **Sorting:** Clicking again sorts descending
- **Sorting:** Clicking a third time returns to unsorted
- **Sorting:** Non-sortable columns (isSortable: false) do not respond to clicks
- **Sorting:** `aria-sort` attribute updates correctly on sorted column
- **Pagination:** Only `pageSize` rows are shown (default 10)
- **Pagination:** Clicking Next shows the next page
- **Pagination:** Clicking Previous shows the previous page
- **Pagination:** Previous is disabled on first page
- **Pagination:** Next is disabled on last page
- **Pagination:** Page info displays correct "Page X of Y"
- **Pagination:** Changing page size updates visible row count
- **Pagination disabled:** When `pagination={false}`, all rows are shown and no pagination controls render
- **Sorting disabled:** When `sorting={false}`, no sort buttons render
- **Row click:** Calls `onRowClick` with correct row data when row is clicked
- **Row click keyboard:** Enter/Space on focused row triggers `onRowClick`
- **Row click not provided:** When `onRowClick` is undefined, rows are not interactive (no tabIndex, no role)
- **Empty state:** When data is empty, renders emptyState content
- **Loading state:** When loading is true, renders loadingState content
- **Loading hides data:** When loading is true, data rows are not rendered
- **Density:** Renders with `data-density="compact"` by default
- **Density comfortable:** When `density="comfortable"`, renders with `data-density="comfortable"`
- Merges className via clsx (consumer class appended)

**Do NOT test:**

- Resolved pixel values (jsdom doesn't process CSS cascade)
- Sticky header visual behavior (requires real viewport)
- Scroll behavior (requires real viewport)
- Visual appearance (Storybook visual tests in Story 3.9)
- Sort animation smoothness
- Responsive breakpoint behavior

### Project Structure Notes

```
packages/ui/src/
├── index.ts                          # Update with Data Display section
├── tokens/
│   └── ... (existing — DO NOT modify)
├── components/
│   ├── layout/                       # FROM Story 3-1 — DO NOT modify
│   ├── forms/                        # FROM Story 3-2 — DO NOT modify
│   ├── overlay/                      # FROM Story 3-2 — DO NOT modify
│   ├── feedback/                     # FROM Story 3-3 — DO NOT modify
│   ├── navigation/                   # FROM Story 3-4 — DO NOT modify
│   └── data-display/                 # NEW — this story creates this directory
│       └── Table/                    # Complex component — folder structure
│           ├── index.ts              # Re-export: export { Table } from './Table'
│           ├── Table.tsx
│           ├── Table.module.css
│           └── Table.test.tsx
└── utils/                            # Existing — DO NOT modify
```

**Note on directory naming:** The architecture file explicitly shows `data-display/Table/` as the location (line 1359). This follows the Storybook category convention where Table is under "Data Display". The category directory name uses kebab-case (`data-display/`) matching the architecture spec.

### Precedent Patterns from Stories 3-1 through 3-4 — MUST Follow

1. **Prop-to-CSS mapping:** Categorical variants use `data-*` attributes with CSS attribute selectors (e.g., `data-density="compact"`). CSS Modules remain static — one `.root` class per component.
2. **CSS custom property cast:** `as React.CSSProperties` for style objects with CSS custom properties.
3. **className merging:** `clsx(styles.root, className)` — consumer class appended, never replaces.
4. **CSS Module structure:** One `.module.css` per component, all rules in `@layer components { }`, all values from design tokens.
5. **Test structure:** Co-located `.test.tsx` using `@testing-library/react`.
6. **Export pattern:** Direct export from `src/index.ts` with category comments.
7. **Type exports:** Props interfaces and shared types exported alongside components.
8. **Default props:** Documented in interface comments, enforced via destructuring defaults.
9. **displayName:** All components set `displayName` (required for React DevTools and ESLint `react/display-name`).
10. **forwardRef:** Table MUST use `React.forwardRef` (wrapper div). Note the generic forwardRef pattern described above.
11. **Import order:** CSS module imports before sibling component imports per ESLint `import-x/order` (learned from Story 3-4).

### TanStack Table v8 Integration Notes

**Version:** `@tanstack/react-table` ^8.21.3 (latest stable as of March 2026).

**Key APIs used in this story:**

- `useReactTable` — main hook creating the table instance
- `getCoreRowModel()` — required for basic row rendering
- `getSortedRowModel()` — enables client-side sorting
- `getPaginationRowModel()` — enables client-side pagination
- `flexRender()` — renders header/cell content from column definitions
- `SortingState`, `PaginationState` — state types for controlled state
- `ColumnDef<TData>` — column definition type (internal, not exposed)

**Key patterns:**

- TanStack Table is headless — it manages state, we render HTML
- Column definitions are mapped from our `TableColumn<TData>` to TanStack's `ColumnDef<TData>` internally
- Sort state is controlled via `useState<SortingState>` — TanStack tri-state sorting is built-in
- Pagination state is controlled via `useState<PaginationState>`
- `table.getHeaderGroups()`, `table.getRowModel().rows`, `row.getVisibleCells()` for rendering
- `header.column.getToggleSortingHandler()` for sort click handlers
- `table.previousPage()`, `table.nextPage()`, `table.getCanPreviousPage()`, `table.getCanNextPage()` for pagination

**DO NOT:**

- Expose TanStack types in the public API
- Allow consumers to pass raw TanStack `ColumnDef` — always map through `TableColumn`
- Import TanStack outside of `packages/ui/` — enforce via ESLint

### Discrepancies Between Source Documents

1. **Architecture file tree vs actual project structure:** The architecture file shows Table in `components/data-display/Table/`. The project currently has directories named after categories: `layout/`, `forms/`, `feedback/`, `navigation/`, `overlay/`. Creating `data-display/` follows the architecture spec. This is the first "Data Display" component, so this story creates the category directory.

2. **Architecture shows sub-components (TableHeader.tsx, TableRow.tsx, useTableState.ts):** The architecture file tree (line 1360-1369) shows Table with sub-components like `TableHeader.tsx`, `TableRow.tsx`, and `useTableState.ts`. For Story 3-5 (core features), a single `Table.tsx` file is sufficient — TanStack Table handles state management internally. Sub-components may be extracted in Story 3-6 (advanced features) if complexity warrants it. Do NOT create empty placeholder sub-component files.

3. **Pagination as separate component?** The architecture's `navigation/` directory shows `Pagination.tsx`. However, for Story 3-5, pagination is integrated directly within the Table component as part of TanStack Table's `getPaginationRowModel()`. A standalone `Pagination` component is NOT in scope. If Story 3-6 or later stories need standalone pagination, it can be extracted then.

4. **`useInteractionState` hook:** The UX spec (line 779-791) describes a shared `useInteractionState` hook for consistent interaction states. This hook is a design-time concept — it is NOT implemented yet, and this story does NOT implement it. Use CSS pseudo-classes (`:hover`, `:focus-visible`, `:active`) with token-driven custom properties. This covers the AC as written.

5. **Table Storybook category:** Architecture shows Table under "Data Display" category. File location uses `data-display/` directory. Storybook title would be `@hexalith/ui/Data Display/Table`. File organization matches Storybook category.

### Anti-Patterns to Avoid

- **NO hardcoded values.** Every color, spacing, font-size, border, transition MUST reference a design token.
- **NO external margins.** Components use `gap` on parents, not `margin` on children.
- **NO inline styles** except the CSS custom property pattern for prop-to-CSS mapping.
- **NO `!important`.** CSS layers handle precedence.
- **NO barrel files** in subdirectories except the Table folder's `index.ts` (re-export only).
- **NO importing from `@hexalith/cqrs-client`.** Table is data-agnostic.
- **NO `any` type.** TypeScript strict mode enforced. The Table component must be properly generic.
- **NO div-based table layouts.** Use semantic `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, `<td>`, `<caption>`.
- **NO `__tests__/` directories.** Tests are co-located.
- **NO direct `@tanstack/react-table` imports** from outside `packages/ui/`. Add ESLint `no-restricted-imports` rule.
- **DO NOT modify existing components** from Stories 3-1, 3-2, 3-3, 3-4.
- **DO NOT modify existing token files.**
- **DO NOT add `tabindex` hacks.** Focus order follows visual layout. Row keyboard access via `tabIndex={0}` on clickable rows only.
- **DO NOT add an icon library.** Sort indicators are inline SVGs.
- **DO NOT implement server-side mode, global search, column filters, CSV export, or row-level formatting** — those are Story 3-6.
- **DO NOT implement row selection, bulk actions, inline expansion, column resize, virtual scrolling** — those are Phase 2.
- **DO NOT create TableHeader.tsx, TableRow.tsx sub-components** unless complexity genuinely requires it. Keep it simple — one file if possible.

### Previous Story Intelligence (Story 3-4)

**Key learnings from Story 3-4 implementation:**

- ESLint `import-x/order` requires value imports before type imports with blank line separators between groups. Fixed by following the pattern established in Select.test.tsx.
- CSS module import must come before sibling component imports per `import-x/order` rule.
- Architecture decision: Semantic HTML was chosen over Radix NavigationMenu for Sidebar. This validates the approach for Table — semantic HTML is the right choice for data tables (no Radix table primitive exists).
- Token compliance: 100% (605/605 declarations) achieved across all component CSS — the scanner is working and enforcement is real.
- Tests: 272 total tests passing across all stories — the test infrastructure is solid.

**Patterns to reuse:**

- `React.forwardRef` with proper `displayName` setting
- `clsx(styles.root, className)` for class merging
- `data-*` attributes for variant/state styling (e.g., `data-density`)
- Inline SVG icons (6-8 lines, `currentColor` for theming)
- `@layer components { }` wrapping all CSS
- `@media (prefers-reduced-motion: reduce)` for motion accessibility

### Git Intelligence from Recent Work

Recent commits show the project is actively implementing Epic 3 components:

- `8872465` — Story 3-3: ErrorBoundary, ErrorDisplay, Skeleton, Toast with tests
- `9112b0b` — Story 3-2: Button, Input, Select, Tooltip with tests and styles
- Established patterns: CSS Modules with `@layer components`, data-\* attributes, forwardRef, displayName, clsx, inline SVG icons
- Test setup includes jsdom polyfills for Radix (still needed for any Radix components used within Table cells by consumers, but Table itself doesn't use Radix)

### Downstream Dependencies

- **Story 3-6 (Data Table — Advanced Features):** Adds server-side mode (`serverSide`, `onSort`, `onPageChange`, `onFilter` callbacks), global search, per-column filtering, CSV export, row-level conditional formatting (`rowClassName`). Story 3-6 extends this story's Table component — do NOT design the API in a way that prevents these additions.
- **Story 3-7 (Form & Detail View):** Form + Table composition will be tested in Story 3-9's Storybook composition stories.
- **Story 3-9 (Storybook):** Will add Storybook stories for Table showing: default state, sorted, paginated, empty, loading, clickable rows, different densities.
- **Epic 4 (Module Scaffold):** The scaffold will use Table with `useProjection` mock data. Table must work standalone without any CQRS dependencies.
- **Phase 2:** Compound components (SelectionProvider, BulkActions, VirtualScroll, ColumnResize, InlineExpansion) will be added as children of `<Table>`. The current implementation should not prevent this pattern.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5] — acceptance criteria and story definition
- [Source: _bmad-output/planning-artifacts/architecture.md#File Structure line 1359-1369] — data-display/Table/ directory structure
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — file and code naming conventions
- [Source: _bmad-output/planning-artifacts/architecture.md#Barrel Export Clarification] — index.ts organization
- [Source: _bmad-output/planning-artifacts/architecture.md#Package Dependency Rules] — @hexalith/ui may import @tanstack/react-table
- [Source: _bmad-output/planning-artifacts/architecture.md#Components without Radix dependency] — Table uses TanStack Table, not Radix
- [Source: _bmad-output/planning-artifacts/architecture.md#Third-Party Type Re-Export Policy] — define own types, don't re-export TanStack
- [Source: _bmad-output/planning-artifacts/architecture.md#Storybook Sidebar Convention] — @hexalith/ui/Data Display/Table
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#View-Type Density Profiles] — Table density: compact rows, Linear-inspired
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Complexity Classification] — Table is Complex (≤ 20 props)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Margin-Free Components] — zero external margin rule
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CSS Layer Cascade Order] — @layer enforcement
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Table/Form Accessibility Model] — semantic HTML, not Radix
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Screen Reader Strategy] — `<table>` with `<caption>`, `<th scope>`
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Focus Management] — focus-visible, focus order
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Motion Accessibility] — prefers-reduced-motion
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Phase 2 Compound Component Strategy] — compound components for future features
- [Source: _bmad-output/implementation-artifacts/3-4-navigation-components.md] — previous story learnings, import order fix, token compliance 100%

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed `getPageCount()` crash when pagination disabled — guarded with conditional check
- Fixed `enableSorting` on columns — must be false when global sorting prop is false
- Fixed forwardRef pattern to use two-parameter form `(props, ref)` to avoid React 19 warning
- Added stylelint disable comment for sr-only `margin: -1px` (standard a11y pattern, not spacing)

### Completion Notes List

- Implemented `<Table>` component with TanStack Table v8 integration
- Full client-side sorting with tri-state cycle (asc → desc → unsorted) and sortable header accessibility state
- Pagination with configurable page sizes, Previous/Next using Button component, page info display
- Row click with keyboard accessibility (Enter/Space), `tabIndex={0}`, and built-in interactive descendant shielding
- Linear-inspired density system (compact/comfortable) via `data-density` attribute
- Sticky header, scrollable container, empty state, and default skeleton loading support
- 35 comprehensive tests covering all acceptance criteria and regression fixes
- Token compliance: 100% (705/705 declarations)
- ESLint `no-restricted-imports` added for `@tanstack/react-table` in the shared module boundary config and package-level configs

## Senior Developer Review (AI)

### Review Date

2026-03-20

### Outcome

Approved

### Summary

- All 6 acceptance criteria pass. All tasks verified as genuinely complete.
- 310/310 tests pass, build succeeds, lint clean, 100% token compliance (705/705).
- Prior review findings (6 items) all resolved and verified.
- One LOW code quality fix applied during this review: removed redundant `table.setPageSize()` call in the page size change handler.

### Findings

- [x] [RESOLVED] Default loading now renders the shared `Skeleton` table variant when `loadingState` is not provided, and regression coverage locks that behavior in.
- [x] [RESOLVED] Interactive descendants inside cells no longer trigger `onRowClick`; the row handler ignores events coming from buttons, links, inputs, selects, textareas, and explicit opt-out elements.
- [x] [RESOLVED] `@tanstack/react-table` is now restricted in the shared `packages/eslint-config/module-boundaries.js` preset, so apps and packages inheriting that preset are covered.
- [x] [RESOLVED] The public API now accepts `aria-label` and uses it as a fallback caption source when `caption` is absent.
- [x] [RESOLVED] The unused `minWidth` / `maxWidth` API surface was removed to keep the public contract aligned with the shipped implementation.
- [x] [RESOLVED] Dev Agent Record → File List has been updated to reflect the current working tree, including lockfile, shared ESLint config, story tracking files, and the unrelated `Hexalith.Tenants` submodule pointer change.
- [x] [FIXED] Redundant `table.setPageSize()` removed from page size change handler — direct `setPaginationState` is sufficient for controlled state (Table.tsx:337).

### Acceptance Criteria Audit

- AC #1: Pass — semantic table rendering with TanStack Table, design tokens, no Radix dependency, 14 props (under 20 budget).
- AC #2: Pass — tri-state client-side sorting with SVG indicator, `aria-sort`, keyboard-accessible `<button>` headers, `prefers-reduced-motion`.
- AC #3: Pass — client-side pagination with configurable page sizes, Button Previous/Next, page info, native `<select>` page size selector.
- AC #4: Pass — row click with `onRowClick(row.original)`, interactive descendant shielding, keyboard Enter/Space, `tabIndex={0}`.
- AC #5: Pass — density compact/comfortable via `data-density`, `stickyHeader`, `scrollable` props.
- AC #6: Pass — 100% token compliance, sr-only `<caption>`, `aria-label` fallback, `focus-visible`, `prefers-reduced-motion`.

### Final Decision

- Story approved and marked done.
- All ACs implemented, all tasks complete, all prior findings resolved, 1 LOW fix applied.

### Verification

- `pnpm test` ✅ (310/310 passing)
- `pnpm build` ✅
- `pnpm lint` ✅ (100% token compliance — 705/705)

### Change Log

- 2026-03-20 — Code review approved: removed redundant `table.setPageSize()` in page size handler; story marked done; sprint status synced.
- 2026-03-20 — Follow-up fix pass completed: restored default skeleton loading, added interactive-cell row-click shielding, added `aria-label` caption fallback, promoted TanStack restriction to the shared boundary config, removed unused width props, and returned story to `review`.
- 2026-03-20 — Senior Developer Review (AI): changes requested; story moved from `review` back to `in-progress`; sprint status requires sync.
- 2026-03-20: Implemented Story 3-5 Data Table Core Features — all 6 tasks complete, 33 tests added, 308 total tests passing

### File List

- packages/ui/src/components/data-display/Table/index.ts (NEW)
- packages/ui/src/components/data-display/Table/Table.tsx (NEW)
- packages/ui/src/components/data-display/Table/Table.module.css (NEW)
- packages/ui/src/components/data-display/Table/Table.test.tsx (NEW)
- packages/ui/src/index.ts (MODIFIED — added Data Display exports)
- packages/ui/package.json (MODIFIED — added @tanstack/react-table dependency)
- packages/eslint-config/module-boundaries.js (MODIFIED — shared `@tanstack/react-table` restriction)
- packages/shell-api/eslint.config.js (MODIFIED — added @tanstack/react-table restriction)
- packages/cqrs-client/eslint.config.js (MODIFIED — added @tanstack/react-table restriction)
- pnpm-lock.yaml (MODIFIED — lockfile entries for TanStack Table)
- \_bmad-output/implementation-artifacts/3-5-data-table-core-features.md (MODIFIED — review follow-up and verification)
- \_bmad-output/implementation-artifacts/sprint-status.yaml (MODIFIED — story returned to `review`)
- \_bmad-output/implementation-artifacts/3-6-data-table-advanced-features.md (NEW — downstream story present in working tree)
- Hexalith.Tenants (MODIFIED — submodule pointer changed in working tree; unrelated to Table implementation)
