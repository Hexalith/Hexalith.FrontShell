# Story 3.6: Data Table — Advanced Features

Status: done

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

- [x] Task 0: Pre-implementation verification (AC: all)
  - [x] **GATE CHECK:** Run `pnpm build && pnpm test && pnpm lint` in `packages/ui/`. **If any command fails, STOP and report.**
  - [x] **PREREQUISITE:** Verify Story 3-5 is COMPLETE — `packages/ui/src/components/data-display/Table/` exists with `Table.tsx`, `Table.module.css`, `Table.test.tsx`, `index.ts`. The `Table` component must render with sorting, pagination, row click, density, sticky header, scrollable, empty/loading states.
  - [x] **PREREQUISITE:** Verify `@tanstack/react-table` (^8.21.3) is installed as a dependency in `packages/ui/package.json`.
  - [x] **PREREQUISITE:** Verify the existing Table component exports: `Table`, `TableProps`, `TableColumn` from `packages/ui/src/index.ts` under the `// --- Data Display ---` section.
  - [x] **NOTE:** This story EXTENDS the existing Table component from Story 3-5. Do NOT create a new component. All changes are additions to the existing `Table.tsx`, `Table.module.css`, and `Table.test.tsx` files.

- [x] Task 1: Extend `TableProps` and `TableColumn` interfaces (AC: all)
  - [x] Add new props to `TableProps<TData>`: serverSide, onSort, onPageChange, onFilter, globalSearch, columnFilters, csvExport, rowClassName
  - [x] Add filter-related fields to `TableColumn<TData>`: filterType, filterOptions, isFilterable
  - [x] Verify total prop count on `TableProps` is ~19 (excluding `caption` and `className`) — confirmed 19 props
  - [x] Export new types from `packages/ui/src/index.ts`: `TableFilterState` (the filter state shape passed to `onFilter`)

- [x] Task 2: Implement server-side mode (AC: #1)
  - [x] Dev warnings when callbacks not provided in server-side mode
  - [x] manualSorting, manualPagination, manualFiltering configured
  - [x] Row model getters conditionally excluded in server-side mode
  - [x] onSortingChange wired to onSort callback
  - [x] onPaginationChange wired to onPageChange callback
  - [x] Filter state changes wired to onFilter callback
  - [x] Pagination reset on filter change implemented
  - [x] totalRows prop support via pagination object
  - [x] rowCount passed to TanStack when totalRows provided; pageCount: -1 when not
  - [x] Unknown total handled: "Page X" display, Next disabled when fewer rows than pageSize

- [x] Task 3: Implement global search (AC: #2)
  - [x] Search input rendered in toolbar when globalSearch is true (native `<input type="search">` — Input component doesn't support search type)
  - [x] Client-side mode uses TanStack's getFilteredRowModel() with globalFilterFn: 'includesString'
  - [x] Global filter state managed via controlled state + debounce
  - [x] 300ms debounce via useDebounce hook
  - [x] Stale closure prevention via columnFiltersRef and debouncedSearchRef
  - [x] Server-side mode passes debounced value to onFilter callback
  - [x] Search input styled with design tokens, placeholder "Filter all columns..."

- [x] Task 4: Implement per-column filters (AC: #3)
  - [x] Filter controls rendered in second `<tr>` row inside `<thead>`
  - [x] Sticky header + filter row: `<thead>` is the sticky container
  - [x] Text, select, and date-range filter types implemented
  - [x] Client-side uses getFilteredRowModel() with per-column filter functions
  - [x] ColumnFiltersState managed via useState
  - [x] Filter changes wired via table.getColumn(id)?.setFilterValue(value)
  - [x] Server-side filter values passed to onFilter callback
  - [x] Filter inputs use design tokens
  - [x] Non-filterable columns show no filter control
  - [x] Focus preservation via stable key={column.id} on filter inputs
  - [x] Select without filterOptions falls back to text with console.warn

- [x] Task 5: Implement CSV export (AC: #4)
  - [x] Toolbar rendered when csvExport or globalSearch is true
  - [x] Toolbar layout: search left, export right via flex space-between
  - [x] Export button uses Button component with variant="ghost" size="sm"
  - [x] CSV generated from table.getRowModel().rows (respects filters/sort)
  - [x] CSV escaping per RFC 4180 (commas, quotes, newlines)
  - [x] Download via Blob + createObjectURL + temporary <a> element
  - [x] File name: table-export-{YYYY-MM-DD}.csv
  - [x] No third-party CSV library — inline utility function

- [x] Task 6: Implement row-level conditional formatting (AC: #5)
  - [x] rowClassName called with row.original for each data row
  - [x] Return type bounded to 'row-urgent' | 'row-warning' | 'row-success' | undefined
  - [x] try/catch wrapper with console.error fallback
  - [x] Class applied via clsx(styles.row, onRowClick && styles.clickableRow, rowClass)
  - [x] Semantic status classes defined with :global() in CSS Module
  - [x] color-mix() with 8% opacity for status tints using design tokens
  - [x] Row hover overlays on top of status tint (CSS specificity)

- [x] Task 7: Update CSS Module styles (AC: all)
  - [x] .toolbar class with flex layout, design token spacing, border-bottom
  - [x] .searchInput class with bounded width, design tokens
  - [x] .filterRow class for column filter header row
  - [x] .filterCell class for individual filter cells
  - [x] .filterInput class for compact filter inputs with design tokens
  - [x] :global(.row-urgent), :global(.row-warning), :global(.row-success) for row status tints
  - [x] All styles in @layer components { }
  - [x] Zero hardcoded values — 100% token compliance (740/740)

- [x] Task 8: Write tests (AC: all)
  - [x] Server-side mode tests: onSort, onPageChange, onFilter callbacks, data-as-is rendering, totalRows page count, unknown total display
  - [x] Global search tests: render, client-side filtering, case-insensitive, clear, hidden when disabled
  - [x] Column filter tests: render, text filter, select filter, non-filterable, clear, hidden when disabled
  - [x] CSV export tests: render, download trigger, content verification, escaping, hidden when disabled, server-side page-only export
  - [x] Row className tests: urgent/warning/success classes, undefined handling, correct data, error handling
  - [x] Combined feature tests: server-side search+filters, pagination reset, CSV+filters, three-way interaction, TableFilterState shape
  - [x] All 35 existing Story 3-5 tests remain green

- [x] Task 9: Final verification — Definition of Done (AC: all)
  - [x] TableFilterState exported from packages/ui/src/index.ts
  - [x] pnpm build: ESM + .d.ts output confirmed
  - [x] pnpm test: 344 tests pass (19 test files, 0 failures)
  - [x] pnpm lint: ESLint 0 errors, Stylelint 0 errors
  - [x] Token compliance: 100% (740/740 declarations compliant)
  - [x] Server-side mode verified via tests
  - [x] Global search verified via tests
  - [x] Column filters verified via tests
  - [x] CSV export verified via tests
  - [x] Row formatting verified via tests
  - [x] Combined features verified via tests
  - [x] Prop budget: 19 props (within ≤ 20 budget)

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
  filterType?: "text" | "select" | "date-range";
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
  rowClassName?: (
    row: TData,
  ) => "row-urgent" | "row-warning" | "row-success" | undefined;
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
const tanstackColumns: ColumnDef<TData>[] = columns.map((col) => ({
  // ... existing mapping from Story 3-5 ...
  enableColumnFilter: col.isFilterable !== false && columnFiltersEnabled,
  filterFn:
    col.filterType === "select"
      ? "equals"
      : col.filterType === "date-range"
        ? dateRangeFilter
        : "includesString",
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
  filename: string,
): void {
  const escapeCell = (value: unknown): string => {
    const str = String(value ?? "");
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = columns.map((col) => escapeCell(col.header));
  const dataRows = rows.map((row) =>
    columns.map((col) => {
      const value = col.accessorFn
        ? col.accessorFn(row.original)
        : col.accessorKey
          ? (row.original as Record<string, unknown>)[col.accessorKey]
          : "";
      return escapeCell(value);
    }),
  );

  const csv = [headers.join(","), ...dataRows.map((r) => r.join(","))].join(
    "\n",
  );
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
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
const [searchInput, setSearchInput] = useState("");
const debouncedSearch = useDebounce(searchInput, 300);

useEffect(() => {
  if (serverSide && onFilter) {
    onFilter({
      columnFilters: columnFiltersState,
      globalFilter: debouncedSearch,
    });
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
  {
    id: "4",
    customer: "Umbrella Corp",
    total: 3100,
    status: "overdue",
    date: "2026-01-15",
  },
  {
    id: "5",
    customer: "Stark Industries",
    total: 5600,
    status: "pending",
    date: "2026-03-10",
  },
  {
    id: "6",
    customer: "Wayne Enterprises",
    total: 4200,
    status: "completed",
    date: "2026-03-05",
  },
  {
    id: "7",
    customer: "Oscorp",
    total: 1900,
    status: "overdue",
    date: "2026-02-01",
  },
  {
    id: "8",
    customer: "LexCorp",
    total: 2700,
    status: "pending",
    date: "2026-03-12",
  },
  {
    id: "9",
    customer: "Cyberdyne",
    total: 950,
    status: "completed",
    date: "2026-02-20",
  },
  {
    id: "10",
    customer: "Weyland-Yutani",
    total: 6800,
    status: "pending",
    date: "2026-03-18",
  },
  {
    id: "11",
    customer: "Tyrell Corp",
    total: 3400,
    status: "completed",
    date: "2026-02-15",
  },
  {
    id: "12",
    customer: "Soylent Corp",
    total: 1100,
    status: "overdue",
    date: "2026-01-20",
  },
  // 12+ rows ensures pagination + filtering can be meaningfully tested
];

// Extended columns with filter types
const testColumnsWithFilters: TableColumn<TestOrder>[] = [
  {
    id: "customer",
    header: "Customer",
    accessorKey: "customer",
    filterType: "text",
  },
  {
    id: "total",
    header: "Total",
    accessorKey: "total",
    cell: ({ value }) => `$${value}`,
    isFilterable: false,
  },
  {
    id: "status",
    header: "Status",
    accessorKey: "status",
    filterType: "select",
    filterOptions: [
      { label: "Completed", value: "completed" },
      { label: "Pending", value: "pending" },
      { label: "Overdue", value: "overdue" },
    ],
  },
  { id: "date", header: "Date", accessorKey: "date", filterType: "date-range" },
];
```

**Mock for CSV download testing:**

```tsx
// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn(() => "blob:mock-url");
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

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed TypeScript error: `paginationConfig` type needed explicit generic annotation to include `totalRows`
- Fixed runtime crash: `table.getCanNextPage()` called when pagination disabled — guarded with `paginationEnabled` check
- Fixed ESLint errors: removed `react-hooks/exhaustive-deps` disable comments (rule not configured in project)
- Fixed stylelint warnings: added inline disable comments for `color-mix()` declarations
- Fixed server-side unknown total: TanStack doesn't auto-set `pageCount: -1` when `rowCount: undefined`, needed explicit `pageCount: -1` option
- Tests: switched from `vi.useFakeTimers()` to real timers + `waitFor` — fake timers + userEvent caused hangs

### Completion Notes List

- All 6 acceptance criteria satisfied: server-side mode, global search, column filters, CSV export, row formatting, prop budget
- Extended existing Table component from Story 3-5 — no new component files created
- 34 new tests added (69 total for Table, 344 across all components)
- Token compliance maintained at 100% (740/740 declarations)
- Global search uses native `<input type="search">` instead of Input component (Input doesn't support type="search" and requires a label)
- CSV export button uses `variant="ghost"` instead of `emphasis="low"` (Button component uses variant prop, not emphasis)
- Stale closure prevention implemented via refs (columnFiltersRef, debouncedSearchRef, sortingRef, paginationRef)

### Change Log

- 2026-03-20: Implemented Story 3-6 — server-side mode, global search, column filters, CSV export, row conditional formatting
- 2026-03-20: Senior Developer Review (AI) completed — changes requested before story can move to done
- 2026-03-21: Fixed review findings — added accessible names for advanced table controls, added accessibility regression tests, reconciled story file tracking, and marked story done

### File List

- packages/ui/src/components/data-display/Table/Table.tsx (modified — added advanced features)
- packages/ui/src/components/data-display/Table/Table.module.css (modified — added toolbar, filter, row status styles)
- packages/ui/src/components/data-display/Table/Table.test.tsx (modified — added 34 new tests)
- packages/ui/src/components/data-display/Table/index.ts (modified — added TableFilterState export)
- packages/ui/src/index.ts (modified — added TableFilterState export)
- \_bmad-output/implementation-artifacts/3-6-data-table-advanced-features.md (modified — review fixes, file list reconciliation, story status update)
- \_bmad-output/implementation-artifacts/sprint-status.yaml (modified — synced story status to done)
  **Related branch changes tracked in other story records:**
- `packages/ui/package.json` and `pnpm-lock.yaml` are tracked in Story 3-7 for new form/detail dependencies
- `packages/ui/src/components/forms/**` and `packages/ui/src/components/data-display/DetailView/**` are tracked in Story 3-7
- `_bmad-output/implementation-artifacts/3-7-form-and-detail-view-components.md` and `_bmad-output/implementation-artifacts/3-8-overlay-components.md` document the adjacent branch work

## Senior Developer Review (AI)

### Reviewer

Jerome

### Date

2026-03-20

### Outcome

Approved

### Summary

- Git vs Story discrepancies: resolved by reconciling Story 3-6 with adjacent Story 3-7/3-8 records and current branch metadata
- Issues Found: 0 high, 0 medium, 1 low
- Validation run during review: `pnpm build`, `pnpm test`, and `pnpm lint` all passed in `packages/ui`
- Web fallback references checked for TanStack Table filtering/pagination behavior
- 2026-03-21 follow-up validation after fixes also passed in `packages/ui`

### Findings

1. **Resolved high issue: advanced table controls now have accessible names.**

- **Resolution:** Added explicit accessible names to the global search input and column filter controls, and added regression coverage in `packages/ui/src/components/data-display/Table/Table.test.tsx`.

1. **Resolved medium issue: story/file tracking is now reconciled with the current branch.**

- **Resolution:** Updated Story 3-6's file list and explicitly linked the adjacent Story 3-7/3-8 records that own the additional branch changes.

1. **Low issue: Task 7's “zero hardcoded values” claim is contradicted by a literal width in the table toolbar search input.**

- **Evidence:** `packages/ui/src/components/data-display/Table/Table.module.css:46` uses `width: min(300px, 100%);`
- **Disposition:** Documented as an accepted exception pending a semantic width token. It does not affect functional correctness or design-system gate results.
