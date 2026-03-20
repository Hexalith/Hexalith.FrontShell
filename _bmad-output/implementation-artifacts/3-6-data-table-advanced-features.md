# Story 3.6: Data Table — Advanced Features

Status: ready-for-dev

## Story

As a module developer,
I want server-side mode, search, filtering, CSV export, and row-level formatting in the table,
So that end users can process large server-paginated data sets, export reports, and see visual indicators for domain conditions.

## Acceptance Criteria

1. **Server-side mode via `serverSide` prop:** When `serverSide` is true, sorting, filtering, and pagination invoke `onSort`, `onFilter`, and `onPageChange` callbacks instead of client-side processing. `useProjection` can accept pagination/filter params for server-delegated queries.

2. **Global search via `globalSearch` prop:** When enabled, a search input bar appears above the table. In client-side mode, text search filters across all visible columns using TanStack Table's `getFilteredRowModel()` with `globalFilterFn`. In server-side mode, the search value is passed to `onFilter` callback.

3. **Per-column filtering via `columnFilters` prop:** When enabled, column filter controls appear in the header row. Filter types match column data type: text input, select dropdown, or date range. In server-side mode, filter values are passed to `onFilter` callback.

4. **CSV export via `csvExport` prop:** When enabled, a "Download CSV" button appears in a table toolbar above the table. Clicking it exports the current filtered/sorted view (not all data) as a CSV file download.

5. **Row-level conditional formatting via `rowClassName` prop:** The `rowClassName` function `(row) => 'row-urgent' | 'row-warning' | 'row-success' | undefined` returns a bounded semantic class name. The visual expression uses `--color-status-*` tokens as subtle row background tints. Only bounded semantic status classes are permitted — no arbitrary row styling.

6. **Prop budget compliance:** The combined Table component (core + advanced) remains within the ≤ 20 prop budget. Total props: ~19 (`data`, `columns`, `sorting`, `pagination`, `onRowClick`, `globalSearch`, `columnFilters`, `density`, `stickyHeader`, `scrollable`, `emptyState`, `loadingState`, `loading`, `onSort`, `onPageChange`, `onFilter`, `serverSide`, `csvExport`, `rowClassName`). `caption` and `className` are standard utility props not counted against the budget.

## Tasks / Subtasks

- [ ] Task 0: Pre-implementation verification (AC: all)
  - [ ] **GATE CHECK:** Run `pnpm build && pnpm test && pnpm lint` in `packages/ui/`. **If any command fails, STOP and report.**
  - [ ] **PREREQUISITE:** Verify Story 3-5 is COMPLETE — `packages/ui/src/components/data-display/Table/` exists with `Table.tsx`, `Table.module.css`, `Table.test.tsx`, `index.ts`. The `Table` component must render with sorting, pagination, row click, density, sticky header, scrollable, empty/loading states.
  - [ ] **PREREQUISITE:** Verify `@tanstack/react-table` (^8.21.3) is installed as a dependency in `packages/ui/package.json`.
  - [ ] **PREREQUISITE:** Verify the existing Table component exports: `Table`, `TableProps`, `TableColumn` from `packages/ui/src/index.ts` under the `// --- Data Display ---` section.
  - [ ] **NOTE:** This story EXTENDS the existing Table component from Story 3-5. Do NOT create a new component. All changes are additions to the existing `Table.tsx`, `Table.module.css`, and `Table.test.tsx` files.

- [ ] Task 1: Extend `TableProps` and `TableColumn` interfaces (AC: all)
  - [ ] Add new props to `TableProps<TData>`:
    - `serverSide?: boolean` — enables server-side mode
    - `onSort?: (sorting: { id: string; desc: boolean }[]) => void` — server-side sort callback
    - `onPageChange?: (pagination: { pageIndex: number; pageSize: number }) => void` — server-side pagination callback
    - `onFilter?: (filters: { columnFilters: { id: string; value: unknown }[]; globalFilter: string }) => void` — server-side filter callback
    - `globalSearch?: boolean` — enables global search bar
    - `columnFilters?: boolean` — enables per-column filters
    - `csvExport?: boolean` — enables CSV export button
    - `rowClassName?: (row: TData) => 'row-urgent' | 'row-warning' | 'row-success' | undefined` — row conditional formatting (bounded semantic classes only)
  - [ ] Add filter-related fields to `TableColumn<TData>`:
    - `filterType?: 'text' | 'select' | 'date-range'` — column filter type (defaults to `'text'`)
    - `filterOptions?: { label: string; value: string }[]` — options for `'select'` filter type
    - `isFilterable?: boolean` — enable filtering for this column (defaults to `true` when `columnFilters` is enabled)
  - [ ] Verify total prop count on `TableProps` is ~19 (excluding `caption` and `className`)
  - [ ] Export new types from `packages/ui/src/index.ts`: `TableFilterState` (the filter state shape passed to `onFilter`)

- [ ] Task 2: Implement server-side mode (AC: #1)
  - [ ] When `serverSide` is true, emit `console.warn` in development if `onSort`, `onFilter`, or `onPageChange` callbacks are not provided — the table will render but interactions will silently do nothing without callbacks
  - [ ] When `serverSide` is true, configure TanStack Table with `manualSorting: true`, `manualPagination: true`, `manualFiltering: true`
  - [ ] Do NOT pass `getSortedRowModel()`, `getPaginationRowModel()`, or `getFilteredRowModel()` when in server-side mode — TanStack Table skips client-side processing when manual modes are enabled
  - [ ] Wire `onSortingChange` to call `onSort` callback with normalized sort state: `{ id: string; desc: boolean }[]`
  - [ ] Wire `onPaginationChange` to call `onPageChange` callback with `{ pageIndex: number; pageSize: number }`
  - [ ] Wire filter state changes to call `onFilter` callback with `{ columnFilters: { id: string; value: unknown }[]; globalFilter: string }`
  - [ ] **CRITICAL: Pagination reset on filter change.** Both `onColumnFiltersChange` and `onGlobalFilterChange` handlers MUST reset pagination to `pageIndex: 0` via `setPagination(prev => ({ ...prev, pageIndex: 0 }))`. Changing filters while on page 3 = wrong results if page doesn't reset.
  - [ ] Add `totalRows?: number` prop support (needed for server-side pagination to know total page count — add to `pagination` object: `pagination: boolean | { pageSize?: number; pageSizes?: number[]; totalRows?: number }`)
  - [ ] When `serverSide` is true and `totalRows` is provided, pass `rowCount: totalRows` to TanStack Table (v8.13.0+ feature — the table calculates `pageCount` internally from `rowCount`)
  - [ ] When `serverSide` is true and `totalRows` is NOT provided: TanStack Table sets `pageCount = -1` (unknown total). Handle this gracefully: page info displays "Page X" without total (no "of Y"), Next button remains enabled, disable Next only when the current page returns fewer rows than `pageSize` (indicating the last page was reached).

- [ ] Task 3: Implement global search (AC: #2)
  - [ ] When `globalSearch` is true, render a search input above the table in a toolbar container
  - [ ] Search input uses the existing `Input` component from `'../../forms/Input'` with a search icon and `type="search"` for native clear button
  - [ ] In client-side mode: use TanStack Table's `getFilteredRowModel()` (same function for both column and global filtering) with `globalFilterFn: 'includesString'` (built-in) that searches across all column values
  - [ ] Maintain `globalFilter` state via `useState<string>('')`
  - [ ] Wire to `table.setGlobalFilter(value)` on input change
  - [ ] Add debounce (300ms) on the search input to prevent excessive re-filtering
  - [ ] **CRITICAL: Stale closure prevention.** The debounce captures `globalFilter` in a closure. When constructing the `onFilter` payload after debounce fires, read column filter state from a ref (`columnFiltersRef.current`) — NOT from the closure — to avoid sending stale column filter state if both changed within the debounce window.
  - [ ] In server-side mode: debounced value is passed to `onFilter` callback — no client-side filtering occurs
  - [ ] Search input uses `--font-size-sm`, placeholder text "Filter all columns..." in `--color-text-tertiary`
  - [ ] Search input shows clear button when value is non-empty

- [ ] Task 4: Implement per-column filters (AC: #3)
  - [ ] When `columnFilters` is true, render filter controls below each column header (inside `<thead>`, in a second `<tr>` row)
  - [ ] **Sticky header + filter row:** When `stickyHeader` is true AND `columnFilters` is true, make `<thead>` the sticky container (`position: sticky; top: 0`) — NOT individual `<tr>` rows. This ensures both header and filter rows stick together without fragile `top` offset calculations.
  - [ ] Filter type determined by `column.filterType` (defaults to `'text'`):
    - `'text'`: Render a compact `<input>` element (NOT the Input component — filter inputs are compact utility UI, similar to pagination's `<select>`)
    - `'select'`: Render a native `<select>` element with options from `column.filterOptions`
    - `'date-range'`: Render two compact date `<input type="date">` elements (from/to)
  - [ ] In client-side mode: use TanStack Table's `getFilteredRowModel()` with per-column filter functions
  - [ ] Maintain `columnFilters` state via `useState<ColumnFiltersState>([])`
  - [ ] Wire individual column filter changes to `table.getColumn(id)?.setFilterValue(value)`
  - [ ] In server-side mode: filter values are passed to `onFilter` callback
  - [ ] Filter inputs use `--font-size-sm`, `--spacing-1` padding, `--color-border-subtle` border
  - [ ] Non-filterable columns (`isFilterable: false`) show no filter control
  - [ ] **Focus preservation (critical):** Filter inputs MUST maintain focus during table re-renders caused by filter value changes. Use stable `key={column.id}` on each filter input element. Consider uncontrolled inputs with `defaultValue` + `onChange` to avoid losing cursor position during re-render. Test by typing multiple characters rapidly — focus must never jump away.
  - [ ] If a column has `filterType: 'select'` but `filterOptions` is empty or undefined, fall back to `'text'` filter type with a `console.warn` in development.

- [ ] Task 5: Implement CSV export (AC: #4)
  - [ ] When `csvExport` is true, render a toolbar above the table (shared with global search if both enabled)
  - [ ] Toolbar layout: global search on the left, CSV export button on the right — `display: flex; justify-content: space-between;`
  - [ ] Export button uses the `Button` component from `'../../forms/Button'` with `emphasis="low"` and `size="sm"`
  - [ ] Button label: "Export CSV" (no icon — keep it simple). Optional enhancement: dynamic label `Export {n} rows` where n = `table.getRowModel().rows.length` — only if trivial to implement, not required.
  - [ ] On click: generate CSV from current `table.getRowModel().rows` (this respects active filters and sort)
  - [ ] CSV generation: headers from column `header` strings, values from `accessorFn` or `accessorKey` on each row. **Known limitation:** columns with only a `cell` renderer and no `accessorFn`/`accessorKey` export empty values for that column — document in JSDoc.
  - [ ] Handle cell values: convert to string, escape commas and quotes per RFC 4180
  - [ ] Trigger download via `Blob` + `URL.createObjectURL` + temporary `<a>` element with `download` attribute
  - [ ] File name: `table-export-{YYYY-MM-DD}.csv` (use current date)
  - [ ] Do NOT add a third-party CSV library — this is a simple utility function (~20 lines)

- [ ] Task 6: Implement row-level conditional formatting (AC: #5)
  - [ ] When `rowClassName` is provided, call it with `row.original` for each data row
  - [ ] The return type is a union: `'row-urgent' | 'row-warning' | 'row-success' | undefined` — TypeScript enforces that consumers cannot invent arbitrary class names
  - [ ] Wrap `rowClassName` call in try/catch — if the consumer's function throws, log `console.error` and treat as `undefined` (no status class applied). Do not let a formatting function crash the entire table render.
  - [ ] Apply returned class name to the `<tr>` element via `clsx(styles.row, onRowClick && styles.clickableRow, safeRowClassName)` where `safeRowClassName` is the try/catch-wrapped result
  - [ ] Define semantic status classes in `Table.module.css`:
    ```css
    .row-urgent {
      background-color: color-mix(in srgb, var(--color-status-danger) 8%, transparent);
    }
    .row-warning {
      background-color: color-mix(in srgb, var(--color-status-warning) 8%, transparent);
    }
    .row-success {
      background-color: color-mix(in srgb, var(--color-status-success) 8%, transparent);
    }
    ```
  - [ ] **IMPORTANT:** These are NOT CSS Module classes — they are global semantic classes that the `rowClassName` function returns as strings. Define them outside the CSS Module scope OR use `:global()` wrapper in the CSS Module file
  - [ ] Row status tints must be visible in both light and dark themes
  - [ ] Row hover state should overlay on top of status tint (hover bg takes precedence)
  - [ ] `prefers-reduced-motion` does not affect static background colors (no transition needed for status tints)

- [ ] Task 7: Update CSS Module styles (AC: all)
  - [ ] Add `.toolbar` class for the toolbar container above the table:
    - `display: flex; justify-content: space-between; align-items: center;`
    - Padding: `--spacing-3` horizontal, `--spacing-2` vertical
    - Gap: `--spacing-3`
    - Border-bottom: `1px solid var(--color-border-subtle)`
  - [ ] Add `.searchInput` class for global search styling
  - [ ] Add `.filterRow` class for the column filter header row
  - [ ] Add `.filterCell` class for individual filter cells
  - [ ] Add `.filterInput` class for compact filter inputs:
    - `font-size: var(--font-size-sm)`
    - `padding: var(--spacing-1)`
    - `border: 1px solid var(--color-border-subtle)`
    - `border-radius: var(--radius-sm)`
    - `background: var(--color-surface-primary)`
    - `color: var(--color-text-primary)`
    - `width: 100%`
  - [ ] Add `:global(.row-urgent)`, `:global(.row-warning)`, `:global(.row-success)` for row status tints
  - [ ] All new styles wrapped in `@layer components { }` consistent with existing styles
  - [ ] Zero hardcoded values — all from design tokens

- [ ] Task 8: Write tests (AC: all)
  - [ ] **Server-side mode tests:**
    - When `serverSide` is true, clicking sort header calls `onSort` with correct sort state
    - When `serverSide` is true, changing page calls `onPageChange` with correct pagination state
    - When `serverSide` is true, typing in global search calls `onFilter` with global filter value (after debounce)
    - When `serverSide` is true, data is rendered as-is (no client-side sorting/filtering/pagination)
    - Server-side pagination displays correct page count when `totalRows` is provided
  - [ ] **Global search tests:**
    - When `globalSearch` is true, search input renders above the table
    - Typing in search input filters visible rows (client-side)
    - Search is case-insensitive
    - Clearing search shows all rows
    - When `globalSearch` is false (default), no search input renders
  - [ ] **Column filter tests:**
    - When `columnFilters` is true, filter inputs render in header
    - Text filter filters rows by column value
    - Select filter filters rows by selected option
    - Non-filterable columns (`isFilterable: false`) show no filter control
    - Clearing filter shows all rows
    - When `columnFilters` is false (default), no filter controls render
  - [ ] **CSV export tests:**
    - When `csvExport` is true, export button renders in toolbar
    - Clicking export button triggers download (mock URL.createObjectURL)
    - Exported CSV contains headers and filtered/sorted data rows
    - CSV properly escapes commas and quotes
    - When `csvExport` is false (default), no export button renders
    - **Server-side CSV scope:** When `serverSide` is true, CSV export only contains current page rows (pageSize count), not all data — verify row count in exported content matches visible rows
  - [ ] **Row className tests:**
    - When `rowClassName` returns `"row-urgent"`, the class is applied to the `<tr>`
    - When `rowClassName` returns `undefined`, no extra class is added
    - `rowClassName` receives correct row data
  - [ ] **Combined feature tests:**
    - Server-side mode with global search and column filters work together
    - Global search + pagination resets to page 1 when search changes
    - CSV export respects active filters (exports filtered view only)
    - **Three-way server-side interaction:** typing global search + selecting column filter + changing page simultaneously — `onFilter` aggregates ALL filter state (both column filters and global filter), and `onPageChange` resets `pageIndex` to 0 when filters change
    - Server-side `onFilter` payload shape matches `TableFilterState` exactly (verify `{ columnFilters: [...], globalFilter: '...' }` — not partial payloads)
  - [ ] **Existing tests remain green:** All Story 3-5 tests must continue to pass unchanged

- [ ] Task 9: Final verification — Definition of Done (AC: all)
  - [ ] Update `packages/ui/src/index.ts`: add `TableFilterState` to the Data Display type exports
  - [ ] Run `pnpm build` — confirm tsup produces ESM + .d.ts
  - [ ] Run `pnpm test` — confirm ALL Vitest tests pass (all components including new Table advanced features)
  - [ ] Run `pnpm lint` — confirm ESLint + token compliance passes
  - [ ] Run token compliance scanner against updated CSS Module — must report 100%
  - [ ] Verify server-side mode: sorting, pagination, and filtering invoke callbacks instead of client-side processing
  - [ ] Verify global search: typing filters visible rows (client-side) or invokes callback (server-side)
  - [ ] Verify column filters: text, select, and date-range filter types work
  - [ ] Verify CSV export: downloads filtered/sorted data as CSV file
  - [ ] Verify row formatting: semantic classes apply correct background tints in both themes
  - [ ] Verify combined: global search + column filters + pagination + sorting work together
  - [ ] Verify prop budget: total prop count ≤ 20 (excluding `caption`, `className`)
  - [ ] **Story is DONE when all of the above pass.** Do not mark complete with any failure.

## Dev Notes

### Prerequisites — Story 3-5 Must Be Complete

Story 3-6 extends the Table component created in Story 3-5. All core features (sorting, pagination, row click, density, sticky header, scrollable, empty/loading states) MUST be working before starting this story.

**From Story 3-5 (required):**
- `packages/ui/src/components/data-display/Table/` directory with `Table.tsx`, `Table.module.css`, `Table.test.tsx`, `index.ts`
- `@tanstack/react-table` (^8.21.3) installed as dependency
- `Table`, `TableProps`, `TableColumn` exported from `packages/ui/src/index.ts`
- TanStack Table integration: `useReactTable`, `getCoreRowModel`, `getSortedRowModel`, `getPaginationRowModel`, `flexRender`
- Generic forwardRef pattern for type-safe Table component
- CSS Module with `@layer components { }`, design token compliance at 100%
- Client-side sorting (tri-state), client-side pagination, row click with keyboard accessibility
- Button component available for reuse: `import { Button } from '../../forms/Button'`
- Input component available for reuse: `import { Input } from '../../forms/Input'` (for global search)

**If Story 3-5 is NOT complete, STOP and report.**

### Architecture Constraints — MUST Follow

1. **Extend, don't replace:** All changes are additions to the existing `Table.tsx`, `Table.module.css`, and `Table.test.tsx` files. Do NOT create separate files for advanced features (no `TableFilters.tsx`, `TableToolbar.tsx`, etc.) unless the file exceeds ~400 lines and genuine complexity warrants extraction.

2. **CSS Modules + @layer:** All new styles MUST be in CSS Modules (`.module.css`) wrapped in `@layer components { }`. Use design token CSS custom properties exclusively — zero hardcoded values. [Source: architecture.md#Styling Solution]

3. **Zero external margin:** All new UI elements (toolbar, filters) have zero external margin. Spacing controlled by parent containers via `gap`. [Source: UX spec#Margin-Free Components]

4. **CSS class names:** camelCase for CSS Module class names (`.toolbar`, `.searchInput`, `.filterRow`, `.filterCell`). [Source: architecture.md#CSS class names]

5. **Prop naming:** Domain terms, not primitives. Event handlers: `on` + PascalCase verb (`onSort`, `onFilter`, `onPageChange`). Boolean props: avoid `is`/`has` prefix for feature flags (`serverSide`, `globalSearch`, `csvExport`). [Source: architecture.md#Code Naming]

6. **No Radix dependency:** Table uses semantic HTML + TanStack Table. No Radix primitives. [Source: architecture.md#Components without Radix dependency]

7. **Third-party type re-export policy:** Do NOT re-export TanStack Table types (`ColumnFiltersState`, `FilterFn`, etc.). Define own types (`TableFilterState`). [Source: architecture.md#Third-Party Type Re-Export Policy]

8. **API stability:** The core Table API from Story 3-5 is additive-only. New props can be added; existing props MUST NOT change behavior. [Source: UX spec#Content Component Stability]

9. **Phase 2 boundary:** Do NOT implement row selection, bulk actions, inline expansion, column resize, virtual scrolling, inline cell editing, saved filter presets, frozen columns, or column groups. These are Phase 2 compound component features. [Source: UX spec#Phase 2 Compound Component Strategy]

10. **Package dependency rules:** `@hexalith/ui` may import from React and `@tanstack/react-table`. MUST NOT import from `@hexalith/cqrs-client`. Table is data-agnostic. [Source: architecture.md#Package Dependency Rules]

11. **No additional dependencies:** CSV export is a simple utility function (~20 lines). Global search uses TanStack Table's built-in `getFilteredRowModel`. No new npm packages needed.

### Component API Specifications — New Props

```tsx
// --- Added to existing TableColumn<TData> interface ---
interface TableColumn<TData> {
  // ... existing props from Story 3-5 ...

  /** Filter type for per-column filtering — defaults to 'text' */
  filterType?: 'text' | 'select' | 'date-range';
  /** Options for 'select' filter type */
  filterOptions?: { label: string; value: string }[];
  /** Enable filtering for this column — defaults to true when columnFilters is enabled */
  isFilterable?: boolean;
}

// --- Added to existing TableProps<TData> interface ---
interface TableProps<TData> {
  // ... existing props from Story 3-5 (~13 props) ...

  /** Enable server-side mode — delegates sorting/filtering/pagination to callbacks */
  serverSide?: boolean;
  /** Server-side sort callback — fires with normalized sort state */
  onSort?: (sorting: { id: string; desc: boolean }[]) => void;
  /** Server-side pagination callback — fires with page state */
  onPageChange?: (pagination: { pageIndex: number; pageSize: number }) => void;
  /** Server-side filter callback — fires with all active filters */
  onFilter?: (filters: TableFilterState) => void;
  /** Enable global search bar above the table */
  globalSearch?: boolean;
  /** Enable per-column filter controls in header */
  columnFilters?: boolean;
  /** Enable CSV export button in toolbar */
  csvExport?: boolean;
  /** Row conditional formatting — returns bounded semantic class name */
  rowClassName?: (row: TData) => 'row-urgent' | 'row-warning' | 'row-success' | undefined;
}

// --- New exported type ---
interface TableFilterState {
  /** Active column-level filters */
  columnFilters: { id: string; value: unknown }[];
  /** Active global search value */
  globalFilter: string;
}

// --- Extended pagination type (add totalRows for server-side) ---
// The existing pagination prop type from Story 3-5:
// pagination?: boolean | { pageSize?: number; pageSizes?: number[] }
// Extended to:
// pagination?: boolean | { pageSize?: number; pageSizes?: number[]; totalRows?: number }
```

### TanStack Table v8 — Advanced APIs

**New APIs used in this story:**

- `getFilteredRowModel()` — enables BOTH client-side column filtering AND global text search. There is NO separate `getGlobalFilteredRowModel` import — pass `getFilteredRowModel()` once and it handles both. Set `globalFilterFn` on the table options for global search behavior.
- `ColumnFiltersState` — state type for per-column filters (internal, not exposed)
- `manualSorting: true` — disables client-side sorting (server-side mode)
- `manualPagination: true` — disables client-side pagination (server-side mode)
- `manualFiltering: true` — disables client-side filtering (server-side mode)
- `rowCount` — set when server-side pagination provides total row count (v8.13.0+; table calculates pageCount internally)
- `column.setFilterValue(value)` — sets individual column filter
- `table.setGlobalFilter(value)` — sets global search filter

**Server-side mode pattern:**

```tsx
const table = useReactTable({
  data,
  columns: tanstackColumns,
  state: {
    sorting: sortingEnabled ? sorting : undefined,
    pagination: paginationEnabled ? pagination : undefined,
    columnFilters: columnFiltersEnabled ? columnFiltersState : undefined,
    globalFilter: globalSearchEnabled ? globalFilter : undefined,
  },
  // Server-side: manual modes + no row models
  manualSorting: serverSide,
  manualPagination: serverSide,
  manualFiltering: serverSide,
  rowCount: serverSide ? paginationConfig?.totalRows : undefined, // v8.13.0+ — table calculates pageCount internally
  // Client-side: row models
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: !serverSide && sortingEnabled ? getSortedRowModel() : undefined,
  getPaginationRowModel: !serverSide && paginationEnabled ? getPaginationRowModel() : undefined,
  getFilteredRowModel: !serverSide && (columnFiltersEnabled || globalSearchEnabled)
    ? getFilteredRowModel() : undefined,
  // Callbacks
  onSortingChange: ...,
  onPaginationChange: ...,
  onColumnFiltersChange: ...,
  onGlobalFilterChange: ...,
  // Global filter function for client-side
  globalFilterFn: 'includesString',
});
```

**Column filter mapping:**

```tsx
// Map TableColumn filterType to TanStack column filter function
const tanstackColumns: ColumnDef<TData>[] = columns.map(col => ({
  // ... existing mapping from Story 3-5 ...
  enableColumnFilter: col.isFilterable !== false && columnFiltersEnabled,
  filterFn: col.filterType === 'select' ? 'equals' :
            col.filterType === 'date-range' ? dateRangeFilter :
            'includesString',
}));

// Custom date range filter (implement as a simple comparison function)
const dateRangeFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const cellValue = row.getValue<string>(columnId);
  const { from, to } = filterValue as { from?: string; to?: string };
  if (from && cellValue < from) return false;
  if (to && cellValue > to) return false;
  return true;
};
```

**CSV export utility:**

```tsx
function exportTableToCsv<TData>(
  rows: Row<TData>[],
  columns: TableColumn<TData>[],
  filename: string
): void {
  const escapeCell = (value: unknown): string => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = columns.map(col => escapeCell(col.header));
  const dataRows = rows.map(row =>
    columns.map(col => {
      const value = col.accessorFn
        ? col.accessorFn(row.original)
        : col.accessorKey
          ? (row.original as Record<string, unknown>)[col.accessorKey]
          : '';
      return escapeCell(value);
    })
  );

  const csv = [headers.join(','), ...dataRows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

**Debounce pattern for search input:**

```tsx
// Use a simple useDebounce hook inline — no library needed
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

// In component:
const [searchInput, setSearchInput] = useState('');
const debouncedSearch = useDebounce(searchInput, 300);

useEffect(() => {
  if (serverSide && onFilter) {
    onFilter({ columnFilters: columnFiltersState, globalFilter: debouncedSearch });
  } else {
    table.setGlobalFilter(debouncedSearch);
  }
}, [debouncedSearch]);
```

### Design Token References

**New tokens used (beyond Story 3-5 tokens):**

- `--color-status-danger` — Row urgent tint base color
- `--color-status-warning` — Row warning tint base color
- `--color-status-success` — Row success tint base color
- `--radius-sm` — Filter input border radius
- `--spacing-1` (4px) — Filter input padding
- `--spacing-2` (8px) — Toolbar vertical padding
- `--spacing-3` (12px) — Toolbar horizontal padding, toolbar gap
- `--color-surface-primary` — Filter input background
- `--color-text-tertiary` — Search placeholder text
- `--color-border-subtle` — Filter input borders, toolbar bottom border

**All Story 3-5 tokens still apply.** Do not duplicate their documentation here — refer to the 3-5 story file for the complete token reference.

### Visual Design Specifications

**Toolbar (above table, below any parent chrome):**
- Container: `display: flex; justify-content: space-between; align-items: center;`
- Padding: `--spacing-2` vertical, `--spacing-3` horizontal
- Gap: `--spacing-3` between elements
- Bottom border: `1px solid var(--color-border-subtle)`
- Toolbar only renders when `globalSearch` or `csvExport` is true
- If only one feature enabled, it still uses flex layout (single element, appropriate alignment)

**Global search input:**
- Positioned on the left side of the toolbar
- Uses `Input` component from forms with `type="search"`
- Width: `min(300px, 100%)` — bounded width, not full toolbar width
- Placeholder: "Filter all columns..."
- Font: `--font-size-sm`

**Column filter controls (in header):**
- Rendered in a second `<tr>` inside `<thead>`, below the sort header row
- Each `<th>` contains a compact filter input matching the column's `filterType`
- Filter inputs are compact utility UI — use native HTML elements, not the full Input/Select components
- Text filter: `<input type="text" placeholder="Filter...">`
- Select filter: `<select>` with options from `column.filterOptions` + an empty "All" option
- Date range: two `<input type="date">` with "From" and "To" labels (compact, side by side)
- Filter row shares the same `position: sticky` behavior as the main header when `stickyHeader` is true

**CSV export button:**
- Positioned on the right side of the toolbar
- Uses `Button` component: `<Button emphasis="low" size="sm">Export CSV</Button>`
- No icon — text label only

**Row status tints:**
- Subtle background colors using `color-mix()` with 8% opacity for status colors
- Must be visible in both light and dark themes (test both)
- Row hover state overlays on top of status tint
- Three semantic classes: `row-urgent` (danger), `row-warning` (warning), `row-success` (success)
- These are the ONLY permitted row formatting classes — no custom classes

### Testing Approach

Co-located Vitest tests in `Table.test.tsx` using `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`. All existing Story 3-5 tests must continue to pass.

**Test data extension:**

```tsx
// Extend existing testOrders with enough data for filtering demos
const testOrders: TestOrder[] = [
  { id: '1', customer: 'Acme Corp', total: 1500, status: 'completed', date: '2026-03-01' },
  { id: '2', customer: 'Globex Inc', total: 2300, status: 'pending', date: '2026-03-15' },
  { id: '3', customer: 'Initech', total: 800, status: 'completed', date: '2026-02-28' },
  { id: '4', customer: 'Umbrella Corp', total: 3100, status: 'overdue', date: '2026-01-15' },
  { id: '5', customer: 'Stark Industries', total: 5600, status: 'pending', date: '2026-03-10' },
  { id: '6', customer: 'Wayne Enterprises', total: 4200, status: 'completed', date: '2026-03-05' },
  { id: '7', customer: 'Oscorp', total: 1900, status: 'overdue', date: '2026-02-01' },
  { id: '8', customer: 'LexCorp', total: 2700, status: 'pending', date: '2026-03-12' },
  { id: '9', customer: 'Cyberdyne', total: 950, status: 'completed', date: '2026-02-20' },
  { id: '10', customer: 'Weyland-Yutani', total: 6800, status: 'pending', date: '2026-03-18' },
  { id: '11', customer: 'Tyrell Corp', total: 3400, status: 'completed', date: '2026-02-15' },
  { id: '12', customer: 'Soylent Corp', total: 1100, status: 'overdue', date: '2026-01-20' },
  // 12+ rows ensures pagination + filtering can be meaningfully tested
];

// Extended columns with filter types
const testColumnsWithFilters: TableColumn<TestOrder>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer', filterType: 'text' },
  { id: 'total', header: 'Total', accessorKey: 'total', cell: ({ value }) => `$${value}`, isFilterable: false },
  { id: 'status', header: 'Status', accessorKey: 'status', filterType: 'select',
    filterOptions: [
      { label: 'Completed', value: 'completed' },
      { label: 'Pending', value: 'pending' },
      { label: 'Overdue', value: 'overdue' },
    ]
  },
  { id: 'date', header: 'Date', accessorKey: 'date', filterType: 'date-range' },
];
```

**Mock for CSV download testing:**

```tsx
// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
beforeEach(() => {
  global.URL.createObjectURL = mockCreateObjectURL;
  global.URL.revokeObjectURL = mockRevokeObjectURL;
});
```

**Do NOT test:**
- Actual file download (jsdom doesn't support it — verify the Blob creation and link click)
- Debounce timing exactly (test that search eventually filters, not the exact 300ms delay)
- Visual appearance of row status tints (Storybook visual tests in Story 3.9)
- Server-side API integration (that's the consuming module's responsibility)
- Date picker UI (date-range filter uses native `<input type="date">`)

### Project Structure Notes

```
packages/ui/src/
├── index.ts                          # Update: add TableFilterState type export
├── components/
│   ├── data-display/                 # FROM Story 3-5
│   │   └── Table/
│   │       ├── index.ts              # No changes
│   │       ├── Table.tsx             # MODIFY — add advanced features
│   │       ├── Table.module.css      # MODIFY — add toolbar, filter, row status styles
│   │       └── Table.test.tsx        # MODIFY — add advanced feature tests
│   └── ... (other directories — DO NOT modify)
└── ... (other directories — DO NOT modify)
```

**No new files created in this story.** All changes are modifications to existing Story 3-5 files. If the `Table.tsx` file grows beyond ~400 lines and readability suffers, extract a `csvExport.ts` utility function into the `Table/` directory (internal, not exported from package).

### Precedent Patterns from Stories 3-1 through 3-5 — MUST Follow

All patterns from Story 3-5 apply here. Key additions:

1. **Compact utility UI pattern (from Story 3-5 pagination):** Pagination uses native `<select>`, not the Select component. Similarly, column filters use native `<input>` and `<select>` elements — compact utility UI, not full form components.
2. **Import order (from Story 3-4):** CSS module imports before sibling component imports per ESLint `import-x/order`.
3. **Button reuse (from Story 3-5):** Pagination uses `Button` from `'../../forms/Button'`. CSV export button follows the same pattern.
4. **Input reuse (new in Story 3-6):** Global search uses `Input` from `'../../forms/Input'`. This is the first usage of `Input` inside a `data-display` component — import path is `'../../forms/Input'`.

### Anti-Patterns to Avoid

- **DO NOT add new npm packages.** CSV export is ~20 lines. Debounce is ~10 lines. Global filtering is built into TanStack Table.
- **DO NOT create separate component files** for toolbar, filters, or CSV export unless `Table.tsx` genuinely exceeds ~400 lines.
- **DO NOT break existing Story 3-5 behavior.** All core features (sorting, pagination, row click, density, sticky header) must work identically.
- **DO NOT implement Phase 2 features:** No row selection, bulk actions, inline expansion, column resize, virtual scrolling, inline cell editing, saved filter presets, frozen columns, or column groups.
- **DO NOT use `any` type.** All new props and state must be properly typed.
- **DO NOT use inline styles** except the CSS custom property pattern.
- **DO NOT add hardcoded colors/sizes.** All values from design tokens.
- **DO NOT make row status classes CSS Module classes.** They must be global class names that `rowClassName` returns as strings. Use `:global()` in the CSS Module.
- **DO NOT add a date picker component** for the date-range filter. Use native `<input type="date">` — a proper DatePicker component is for Story 3-7.
- **DO NOT expose TanStack types** (ColumnFiltersState, FilterFn, etc.) in the public API. Define own types.
- **DO NOT modify existing components** from Stories 3-1 through 3-4.

### Previous Story Intelligence (Story 3-5)

**Key learnings from Story 3-5 blueprint:**
- Generic forwardRef pattern: `React.forwardRef(TableInner) as <TData>(...) => React.ReactElement` — maintain this pattern when extending props.
- TanStack Table is headless — it manages state, we render HTML. The same applies for filtering: TanStack provides `getFilteredRowModel()`, we render filter inputs.
- Column definitions are mapped from `TableColumn<TData>` to TanStack `ColumnDef<TData>` internally. Extend this mapping to include filter configuration.
- Pagination controls use compact native `<select>` — filter controls should follow the same pattern.
- Button component imported for pagination — reuse for CSV export.
- Input component available for global search — use the existing `Input` component.
- `data-*` attributes for variant styling (e.g., `data-density`) — do NOT add new data attributes for filter state.
- CSS Module structure with `@layer components { }` — all new styles must follow this pattern.

**Key learnings from Story 3-4 (import order fix):**
- ESLint `import-x/order` requires value imports before type imports with blank line separators.
- CSS module import must come before sibling component imports.

**Token compliance: 100% has been achieved across all previous stories.** Maintain this standard.

### Git Intelligence from Recent Work

Recent commits confirm Epic 3 is actively being implemented:
- `0167813` — Story 3-4: Sidebar and Tabs components with styles and tests
- `8872465` — Story 3-3: ErrorBoundary, ErrorDisplay, Skeleton, Toast with tests
- `9112b0b` — Story 3-2: Button, Input, Select, Tooltip with tests and styles

Story 3-5 (core Table) is at `ready-for-dev` status — it must be implemented before this story begins.

### Downstream Dependencies

- **Story 3-7 (Form & Detail View):** No dependency on Table advanced features.
- **Story 3-9 (Storybook):** Will add stories for Table advanced features: server-side mode, global search, column filters, CSV export, row conditional formatting. The composition story (Table + useProjection mock) should demonstrate server-side mode with mock callbacks.
- **Epic 4 (Module Scaffold):** The scaffold will use Table with `useProjection` mock data. The scaffold may optionally demonstrate server-side pagination using the `serverSide` + `onPageChange` pattern.
- **Epic 6 (Tenants Reference Module):** The Tenants module will use Table with real projection data. Server-side mode will be used for large tenant lists. `rowClassName` will indicate tenant status (active/inactive/suspended).
- **Phase 2:** Compound components (SelectionProvider, BulkActions, VirtualScroll, ColumnResize, InlineExpansion) will be added as children of `<Table>`. The current advanced features (toolbar, filters) must not prevent compound component adoption.
- **Export expansion note:** If export functionality grows beyond CSV (PDF, print, custom formats), extract to a `<Table.Export>` compound component following the Phase 2 pattern. CSV export is the only Table feature that produces a side effect (file download) rather than modifying visual state — it's the natural candidate for compound extraction if scope grows.

### Discrepancies Between Source Documents

1. **`globalSearch` rendering location:** The epics file mentions "search filter bar" but doesn't specify exact placement. The UX spec mentions a toolbar. This story places the search input in a toolbar above the table (consistent with the CSV export button placement). If only `globalSearch` is enabled without `csvExport`, the toolbar still renders with just the search input.

2. **Column filter placement:** The epics file says "per-column filtering" but doesn't specify WHERE filter controls appear. This story places them in a second `<tr>` row inside `<thead>`, below the sort headers. This is the most common pattern in data table UIs and keeps filters visually associated with their columns.

3. **Date range filter complexity:** The epics mention "date range" as a filter type. This story implements it as two native `<input type="date">` elements (from/to). A proper DatePicker component (with calendar popover) is part of Story 3-7. Date range filtering works with native inputs — it just lacks the calendar UX.

4. **`useProjection` integration note:** The epics AC says "`useProjection` can accept pagination/filter params for server-delegated queries." This is the consuming module's responsibility, NOT the Table component's. The Table provides callbacks (`onSort`, `onFilter`, `onPageChange`) with the current state — the module developer wires those to their `useProjection` call. The Table is data-agnostic.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.6] — acceptance criteria and story definition
- [Source: _bmad-output/planning-artifacts/architecture.md#File Structure line 1359-1369] — data-display/Table/ directory structure
- [Source: _bmad-output/planning-artifacts/architecture.md#Third-Party Type Re-Export Policy] — define own types, don't re-export TanStack
- [Source: _bmad-output/planning-artifacts/architecture.md#Package Dependency Rules] — @hexalith/ui may import @tanstack/react-table
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#View-Type Density Profiles] — Table density: compact rows
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Complexity Classification] — Table is Complex (≤ 20 props)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Phase 2 Compound Component Strategy] — compound components for Phase 2
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Content Component Stability] — API additive only after MVP
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Margin-Free Components] — zero external margin rule
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#CSS Layer Cascade Order] — @layer enforcement
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Table/Form Accessibility Model] — semantic HTML, not Radix
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#MVP Table API scope line 974] — server-side, search, filters, CSV, rowClassName all in MVP
- [Source: _bmad-output/implementation-artifacts/3-5-data-table-core-features.md] — core Table story with TanStack integration details
- [Source: _bmad-output/implementation-artifacts/3-4-navigation-components.md] — import order fix, token compliance 100%

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### Change Log

### File List
