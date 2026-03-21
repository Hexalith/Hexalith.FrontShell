import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table';
import clsx from 'clsx';

import styles from './Table.module.css';
import { Skeleton } from '../../feedback/Skeleton';
import { Button } from '../../forms/Button';

import type {
  ColumnDef,
  SortingState,
  PaginationState,
  ColumnFiltersState,
  FilterFn,
  Row,
} from '@tanstack/react-table';

const INTERACTIVE_ELEMENT_SELECTOR = [
  'a',
  'button',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[data-row-click-stop-propagation="true"]',
].join(', ');

function isInteractiveContentTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement
    ? Boolean(target.closest(INTERACTIVE_ELEMENT_SELECTOR))
    : false;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const dateRangeFilter: FilterFn<unknown> = (row, columnId, filterValue) => {
  const cellValue = row.getValue<string>(columnId);
  const { from, to } = filterValue as { from?: string; to?: string };
  if (from && cellValue < from) return false;
  if (to && cellValue > to) return false;
  return true;
};

/**
 * Export current table rows as a CSV file download.
 * Columns with only a `cell` renderer and no `accessorFn`/`accessorKey` export empty values.
 */
function exportTableToCsv<TData>(
  rows: Row<TData>[],
  columns: TableColumn<TData>[],
  filename: string,
): void {
  const escapeCell = (value: unknown): string => {
    const str = String(value ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
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
          : '';
      return escapeCell(value);
    }),
  );

  const csv = [headers.join(','), ...dataRows.map((r) => r.join(','))].join(
    '\n',
  );
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

/** Filter state shape passed to onFilter callback */
export interface TableFilterState {
  /** Active column-level filters */
  columnFilters: { id: string; value: unknown }[];
  /** Active global search value */
  globalFilter: string;
}

/**
 * Column definition for the Table component.
 * Wraps TanStack Table's ColumnDef internally but exposes a simplified interface.
 */
export interface TableColumn<TData> {
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
  /** Filter type for per-column filtering — defaults to 'text' */
  filterType?: 'text' | 'select' | 'date-range';
  /** Options for 'select' filter type */
  filterOptions?: { label: string; value: string }[];
  /** Enable filtering for this column — defaults to true when columnFilters is enabled */
  isFilterable?: boolean;
}

export interface TableProps<TData> {
  /** Array of data objects to display */
  data: TData[];
  /** Column definitions */
  columns: TableColumn<TData>[];
  /** Enable client-side sorting — defaults to true. Pass false to disable. */
  sorting?: boolean;
  /** Enable client-side pagination — defaults to true. Pass false to disable, or an object to configure page size. */
  pagination?:
    | boolean
    | { pageSize?: number; pageSizes?: number[]; totalRows?: number };
  /** Row click handler — fires with the original row data */
  onRowClick?: (row: TData) => void;
  /** Density mode — defaults to 'compact' (Linear-inspired) */
  density?: 'compact' | 'comfortable';
  /** Sticky table header — defaults to false */
  stickyHeader?: boolean;
  /** Enable vertical scrolling — defaults to false */
  scrollable?: boolean;
  /** Content to display when data array is empty */
  emptyState?: React.ReactNode;
  /** Content to display during loading state */
  loadingState?: React.ReactNode;
  /** Whether data is currently loading — defaults to false */
  loading?: boolean;
  /** Table caption for accessibility (renders as visually hidden caption) */
  caption?: string;
  /** Accessible label for the table; also used as fallback caption text when caption is not provided */
  'aria-label'?: string;
  /** Additional CSS class */
  className?: string;
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
  ) => 'row-urgent' | 'row-warning' | 'row-success' | undefined;
}

function SortIndicator({ direction }: { direction: false | 'asc' | 'desc' }) {
  return (
    <span
      className={styles.sortIndicator}
      data-direction={direction || 'none'}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 5L6 2L9 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.sortArrowUp}
        />
        <path
          d="M3 7L6 10L9 7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.sortArrowDown}
        />
      </svg>
    </span>
  );
}

function getFilterControlLabel(header: string, filterType: 'text' | 'select' | 'date-range'): string {
  switch (filterType) {
    case 'select':
      return `${header} filter`;
    case 'date-range':
      return `${header} date range filter`;
    default:
      return `${header} text filter`;
  }
}

function TableInner<TData>(
  props: TableProps<TData>,
  ref: React.Ref<HTMLDivElement>,
): React.ReactElement {
  const {
    data,
    columns,
    sorting: sortingProp = true,
    pagination: paginationProp = true,
    onRowClick,
    density = 'compact',
    stickyHeader = false,
    scrollable = false,
    emptyState,
    loadingState,
    loading = false,
    caption,
    'aria-label': ariaLabel,
    className,
    serverSide = false,
    onSort,
    onPageChange,
    onFilter,
    globalSearch: globalSearchProp = false,
    columnFilters: columnFiltersProp = false,
    csvExport: csvExportProp = false,
    rowClassName,
  } = props;

  const sortingEnabled = sortingProp !== false;
  const paginationConfig = useMemo<{
    pageSize: number;
    pageSizes: number[];
    totalRows?: number;
  } | null>(() => {
    if (paginationProp === false) return null;
    const defaults = { pageSize: 10, pageSizes: [10, 25, 50, 100] };
    if (paginationProp === true || paginationProp === undefined)
      return defaults;
    return { ...defaults, ...paginationProp };
  }, [paginationProp]);
  const paginationEnabled = paginationConfig !== null;
  const globalSearchEnabled = globalSearchProp === true;
  const columnFiltersEnabled = columnFiltersProp === true;
  const showToolbar = globalSearchEnabled || csvExportProp;

  // --- State ---
  const [sortingState, setSortingState] = useState<SortingState>([]);
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: paginationConfig?.pageSize ?? 10,
  });
  const [columnFiltersState, setColumnFiltersState] =
    useState<ColumnFiltersState>([]);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // --- Refs for stale closure prevention ---
  const sortingRef = useRef(sortingState);
  sortingRef.current = sortingState;
  const paginationRef = useRef(paginationState);
  paginationRef.current = paginationState;
  const columnFiltersRef = useRef(columnFiltersState);
  columnFiltersRef.current = columnFiltersState;
  const debouncedSearchRef = useRef(debouncedSearch);
  debouncedSearchRef.current = debouncedSearch;
  const isInitialMount = useRef(true);

  // --- Server-side development warnings ---
  useEffect(() => {
    if (serverSide && process.env.NODE_ENV !== 'production') {
      if (sortingEnabled && !onSort)
        console.warn(
          'Table: serverSide is enabled but onSort is not provided.',
        );
      if (!onFilter)
        console.warn(
          'Table: serverSide is enabled but onFilter is not provided.',
        );
      if (paginationEnabled && !onPageChange)
        console.warn(
          'Table: serverSide is enabled but onPageChange is not provided.',
        );
    }

  }, []);

  // --- Debounce effect for global search ---
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Reset pagination when search changes
    setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
    paginationRef.current = { ...paginationRef.current, pageIndex: 0 };

    if (serverSide) {
      if (onFilter) {
        onFilter({
          columnFilters: columnFiltersRef.current.map((f) => ({
            id: f.id,
            value: f.value,
          })),
          globalFilter: debouncedSearch,
        });
      }
      if (onPageChange) {
        onPageChange({
          pageIndex: 0,
          pageSize: paginationRef.current.pageSize,
        });
      }
    }

  }, [debouncedSearch]);

  // --- Column definitions ---
  const tanstackColumns: ColumnDef<TData>[] = useMemo(
    () =>
      columns.map((col) => {
        let resolvedFilterType = col.filterType ?? 'text';
        if (
          resolvedFilterType === 'select' &&
          (!col.filterOptions || col.filterOptions.length === 0)
        ) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `Table: Column "${col.id}" has filterType "select" but no filterOptions. Falling back to "text".`,
            );
          }
          resolvedFilterType = 'text';
        }

        return {
          id: col.id,
          accessorFn: col.accessorFn,
          accessorKey: col.accessorKey,
          header: () => col.header,
          cell: col.cell
            ? (info: {
                getValue: () => unknown;
                row: { original: TData };
              }) =>
                col.cell!({ value: info.getValue(), row: info.row.original })
            : (info: { getValue: () => unknown }) =>
                String(info.getValue() ?? ''),
          enableSorting: sortingEnabled && col.isSortable !== false,
          enableColumnFilter:
            col.isFilterable !== false && columnFiltersEnabled,
          filterFn:
            resolvedFilterType === 'select'
              ? 'equals'
              : resolvedFilterType === 'date-range'
                ? (dateRangeFilter as FilterFn<TData>)
                : 'includesString',
        };
      }),
    [columns, sortingEnabled, columnFiltersEnabled],
  );

  // --- Table instance ---
  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: {
      sorting: sortingEnabled ? sortingState : undefined,
      pagination: paginationEnabled ? paginationState : undefined,
      columnFilters: columnFiltersEnabled ? columnFiltersState : undefined,
      globalFilter: globalSearchEnabled ? debouncedSearch : undefined,
    },
    manualSorting: serverSide,
    manualPagination: serverSide,
    manualFiltering: serverSide,
    ...(serverSide && paginationConfig?.totalRows != null
      ? { rowCount: paginationConfig.totalRows }
      : serverSide
        ? { pageCount: -1 }
        : {}),
    globalFilterFn: 'includesString',
    onSortingChange: sortingEnabled
      ? (updater) => {
          const next =
            typeof updater === 'function'
              ? updater(sortingRef.current)
              : updater;
          setSortingState(next);
          sortingRef.current = next;
          if (serverSide && onSort) {
            onSort(next.map((s) => ({ id: s.id, desc: s.desc })));
          }
        }
      : undefined,
    onPaginationChange: paginationEnabled
      ? (updater) => {
          const next =
            typeof updater === 'function'
              ? updater(paginationRef.current)
              : updater;
          setPaginationState(next);
          paginationRef.current = next;
          if (serverSide && onPageChange) {
            onPageChange({
              pageIndex: next.pageIndex,
              pageSize: next.pageSize,
            });
          }
        }
      : undefined,
    onColumnFiltersChange: columnFiltersEnabled
      ? (updater) => {
          const next =
            typeof updater === 'function'
              ? updater(columnFiltersRef.current)
              : updater;
          setColumnFiltersState(next);
          columnFiltersRef.current = next;
          // Reset pagination on filter change
          const resetPagination = {
            ...paginationRef.current,
            pageIndex: 0,
          };
          setPaginationState(resetPagination);
          paginationRef.current = resetPagination;
          if (serverSide) {
            if (onFilter) {
              onFilter({
                columnFilters: next.map((f) => ({
                  id: f.id,
                  value: f.value,
                })),
                globalFilter: debouncedSearchRef.current,
              });
            }
            if (onPageChange) {
              onPageChange({
                pageIndex: 0,
                pageSize: resetPagination.pageSize,
              });
            }
          }
        }
      : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel:
      !serverSide && sortingEnabled ? getSortedRowModel() : undefined,
    getPaginationRowModel:
      !serverSide && paginationEnabled ? getPaginationRowModel() : undefined,
    getFilteredRowModel:
      !serverSide && (columnFiltersEnabled || globalSearchEnabled)
        ? getFilteredRowModel()
        : undefined,
  });

  // --- Derived values ---
  const pageCount = paginationEnabled ? table.getPageCount() : 0;
  const currentPage = paginationState.pageIndex + 1;
  const accessibleCaption = caption ?? ariaLabel;
  const unknownTotal = serverSide && paginationEnabled && pageCount === -1;

  const canNextPage = paginationEnabled
    ? unknownTotal
      ? table.getRowModel().rows.length >= paginationState.pageSize
      : table.getCanNextPage()
    : false;

  // --- CSV export handler ---
  const handleCsvExport = () => {
    const date = new Date().toISOString().slice(0, 10);
    exportTableToCsv(
      table.getRowModel().rows,
      columns,
      `table-export-${date}.csv`,
    );
  };

  // --- Row className helper ---
  const getRowClassName = (row: TData): string | undefined => {
    if (!rowClassName) return undefined;
    try {
      return rowClassName(row) ?? undefined;
    } catch (error) {
      console.error('Table: rowClassName function threw an error:', error);
      return undefined;
    }
  };

  // --- Render filter cell contents ---
  const renderFilterCell = (columnId: string) => {
    const col = columns.find((c) => c.id === columnId);
    if (!col || col.isFilterable === false) return null;

    let filterType = col.filterType ?? 'text';
    if (
      filterType === 'select' &&
      (!col.filterOptions || col.filterOptions.length === 0)
    ) {
      filterType = 'text';
    }

    const tableColumn = table.getColumn(columnId);
    if (!tableColumn) return null;

    const filterValue = tableColumn.getFilterValue();

    if (filterType === 'text') {
      return (
        <input
          key={columnId}
          type="text"
          className={styles.filterInput}
          aria-label={getFilterControlLabel(col.header, 'text')}
          placeholder="Filter..."
          value={String(filterValue ?? '')}
          onChange={(e) =>
            tableColumn.setFilterValue(e.target.value || undefined)
          }
        />
      );
    }

    if (filterType === 'select') {
      return (
        <select
          key={columnId}
          className={styles.filterInput}
          aria-label={getFilterControlLabel(col.header, 'select')}
          value={String(filterValue ?? '')}
          onChange={(e) =>
            tableColumn.setFilterValue(e.target.value || undefined)
          }
        >
          <option value="">All</option>
          {col.filterOptions!.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    if (filterType === 'date-range') {
      const dateValue = (filterValue ?? {}) as {
        from?: string;
        to?: string;
      };
      return (
        <div className={styles.dateRangeFilter} key={columnId}>
          <input
            type="date"
            className={styles.filterInput}
            aria-label={`${col.header} from date`}
            value={dateValue.from ?? ''}
            onChange={(e) => {
              const next = { ...dateValue, from: e.target.value || undefined };
              tableColumn.setFilterValue(
                next.from || next.to ? next : undefined,
              );
            }}
          />
          <input
            type="date"
            className={styles.filterInput}
            aria-label={`${col.header} to date`}
            value={dateValue.to ?? ''}
            onChange={(e) => {
              const next = { ...dateValue, to: e.target.value || undefined };
              tableColumn.setFilterValue(
                next.from || next.to ? next : undefined,
              );
            }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      ref={ref}
      className={clsx(styles.root, className)}
      data-density={density}
    >
      {showToolbar && (
        <div className={styles.toolbar}>
          {globalSearchEnabled ? (
            <input
              type="search"
              className={styles.searchInput}
              aria-label="Filter all columns"
              placeholder="Filter all columns..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          ) : (
            <div />
          )}
          {csvExportProp && (
            <Button variant="ghost" size="sm" onClick={handleCsvExport}>
              Export CSV
            </Button>
          )}
        </div>
      )}
      <div
        className={clsx(
          styles.tableContainer,
          scrollable && styles.scrollable,
        )}
      >
        <table className={styles.table} aria-label={ariaLabel}>
          {accessibleCaption && (
            <caption className={styles.caption}>{accessibleCaption}</caption>
          )}
          <thead
            className={clsx(
              styles.thead,
              stickyHeader && styles.stickyHeader,
            )}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const ariaSortProps =
                    sorted === 'asc'
                      ? ({ 'aria-sort': 'ascending' } as const)
                      : sorted === 'desc'
                        ? ({ 'aria-sort': 'descending' } as const)
                        : {};

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className={styles.headerCell}
                      {...ariaSortProps}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          className={styles.sortButton}
                          onClick={header.column.getToggleSortingHandler()}
                          type="button"
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          <SortIndicator direction={sorted} />
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
            {columnFiltersEnabled && (
              <tr className={styles.filterRow}>
                {table.getHeaderGroups()[0].headers.map((header) => (
                  <th key={header.id} className={styles.filterCell}>
                    {renderFilterCell(header.id)}
                  </th>
                ))}
              </tr>
            )}
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
                  {emptyState ?? 'No data'}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const rowClass = getRowClassName(row.original);
                return (
                  <tr
                    key={row.id}
                    className={clsx(
                      styles.row,
                      onRowClick && styles.clickableRow,
                      rowClass,
                    )}
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

                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row.original);
                            }
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className={styles.cell}>
                        <div className={styles.cellContent}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {paginationEnabled && !loading && table.getRowModel().rows.length > 0 && (
        <div className={styles.pagination}>
          <div className={styles.pageSizeSelector}>
            <label className={styles.pageSizeLabel}>
              Rows per page
              <select
                className={styles.pageSizeSelect}
                value={paginationState.pageSize}
                onChange={(e) => {
                  const newPageSize = Number(e.target.value);
                  const newState: PaginationState = {
                    pageIndex: 0,
                    pageSize: newPageSize,
                  };
                  setPaginationState(newState);
                  paginationRef.current = newState;
                  if (serverSide && onPageChange) {
                    onPageChange({
                      pageIndex: 0,
                      pageSize: newPageSize,
                    });
                  }
                }}
              >
                {paginationConfig.pageSizes.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className={styles.pageControls}>
            <span className={styles.pageInfo}>
              {unknownTotal
                ? `Page ${currentPage}`
                : `Page ${currentPage} of ${pageCount}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!canNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export const Table = React.forwardRef(TableInner) as <TData>(
  props: TableProps<TData> & { ref?: React.Ref<HTMLDivElement> },
) => React.ReactElement;

(Table as { displayName?: string }).displayName = 'Table';
