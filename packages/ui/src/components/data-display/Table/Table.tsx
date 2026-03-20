import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
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
}

export interface TableProps<TData> {
  /** Array of data objects to display */
  data: TData[];
  /** Column definitions */
  columns: TableColumn<TData>[];
  /** Enable client-side sorting — defaults to true. Pass false to disable. */
  sorting?: boolean;
  /** Enable client-side pagination — defaults to true. Pass false to disable, or an object to configure page size. */
  pagination?: boolean | { pageSize?: number; pageSizes?: number[] };
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
  } = props;

  const sortingEnabled = sortingProp !== false;
  const paginationConfig = useMemo(() => {
    if (paginationProp === false) return null;
    const defaults = { pageSize: 10, pageSizes: [10, 25, 50, 100] };
    if (paginationProp === true || paginationProp === undefined)
      return defaults;
    return { ...defaults, ...paginationProp };
  }, [paginationProp]);
  const paginationEnabled = paginationConfig !== null;

  const [sortingState, setSortingState] = useState<SortingState>([]);
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: paginationConfig?.pageSize ?? 10,
  });

  const tanstackColumns: ColumnDef<TData>[] = useMemo(
    () =>
      columns.map((col) => ({
        id: col.id,
        accessorFn: col.accessorFn,
        accessorKey: col.accessorKey,
        header: () => col.header,
        cell: col.cell
          ? (info: { getValue: () => unknown; row: { original: TData } }) =>
              col.cell!({ value: info.getValue(), row: info.row.original })
          : (info: { getValue: () => unknown }) =>
              String(info.getValue() ?? ''),
        enableSorting: sortingEnabled && col.isSortable !== false,
      })),
    [columns, sortingEnabled],
  );

  const table = useReactTable({
    data,
    columns: tanstackColumns,
    state: {
      sorting: sortingEnabled ? sortingState : undefined,
      pagination: paginationEnabled ? paginationState : undefined,
    },
    onSortingChange: sortingEnabled ? setSortingState : undefined,
    onPaginationChange: paginationEnabled ? setPaginationState : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortingEnabled ? getSortedRowModel() : undefined,
    getPaginationRowModel: paginationEnabled
      ? getPaginationRowModel()
      : undefined,
  });

  const pageCount = paginationEnabled ? table.getPageCount() : 0;
  const currentPage = paginationState.pageIndex + 1;
  const accessibleCaption = caption ?? ariaLabel;

  return (
    <div
      ref={ref}
      className={clsx(styles.root, className)}
      data-density={density}
    >
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
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(
                    styles.row,
                    onRowClick && styles.clickableRow,
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
              ))
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
                  setPaginationState({
                    pageIndex: 0,
                    pageSize: Number(e.target.value),
                  });
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
              Page {currentPage} of {pageCount}
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
              disabled={!table.getCanNextPage()}
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
