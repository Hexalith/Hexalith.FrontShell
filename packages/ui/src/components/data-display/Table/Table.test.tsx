import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Table } from './Table';

import type { TableColumn } from './Table';

interface TestOrder {
  id: string;
  customer: string;
  total: number;
  status: string;
  date: string;
}

const testOrders: TestOrder[] = [
  { id: '1', customer: 'Acme Corp', total: 1500, status: 'completed', date: '2026-03-01' },
  { id: '2', customer: 'Globex Inc', total: 2300, status: 'pending', date: '2026-03-15' },
  { id: '3', customer: 'Initech', total: 800, status: 'completed', date: '2026-02-28' },
  { id: '4', customer: 'Umbrella Corp', total: 3100, status: 'shipped', date: '2026-03-10' },
  { id: '5', customer: 'Wayne Enterprises', total: 5000, status: 'pending', date: '2026-03-20' },
  { id: '6', customer: 'Stark Industries', total: 4200, status: 'completed', date: '2026-02-15' },
  { id: '7', customer: 'Oscorp', total: 1100, status: 'pending', date: '2026-03-05' },
  { id: '8', customer: 'LexCorp', total: 6700, status: 'shipped', date: '2026-03-12' },
  { id: '9', customer: 'Cyberdyne', total: 900, status: 'completed', date: '2026-01-30' },
  { id: '10', customer: 'Aperture Science', total: 2000, status: 'pending', date: '2026-02-20' },
  { id: '11', customer: 'Weyland-Yutani', total: 3500, status: 'shipped', date: '2026-03-18' },
  { id: '12', customer: 'Soylent Corp', total: 750, status: 'completed', date: '2026-01-15' },
  { id: '13', customer: 'Tyrell Corp', total: 8000, status: 'pending', date: '2026-03-22' },
  { id: '14', customer: 'Massive Dynamic', total: 1900, status: 'shipped', date: '2026-02-10' },
  { id: '15', customer: 'Hooli', total: 2600, status: 'completed', date: '2026-03-08' },
];

const testColumns: TableColumn<TestOrder>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'total', header: 'Total', accessorKey: 'total', cell: ({ value }) => `$${value}` },
  { id: 'status', header: 'Status', accessorKey: 'status' },
  { id: 'date', header: 'Date', accessorKey: 'date' },
];

const testColumnsWithFilters: TableColumn<TestOrder>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer', filterType: 'text' },
  { id: 'total', header: 'Total', accessorKey: 'total', cell: ({ value }) => `$${value}`, isFilterable: false },
  {
    id: 'status',
    header: 'Status',
    accessorKey: 'status',
    filterType: 'select',
    filterOptions: [
      { label: 'Completed', value: 'completed' },
      { label: 'Pending', value: 'pending' },
      { label: 'Shipped', value: 'shipped' },
    ],
  },
  { id: 'date', header: 'Date', accessorKey: 'date', filterType: 'date-range' },
];

describe('Table', () => {
  describe('Core Rendering', () => {
    it('renders all rows from data array when pagination is disabled', () => {
      render(<Table data={testOrders} columns={testColumns} pagination={false} />);
      const rows = screen.getAllByRole('row');
      // 1 header row + 15 data rows
      expect(rows).toHaveLength(16);
    });

    it('renders column headers with correct labels', () => {
      render(<Table data={testOrders.slice(0, 3)} columns={testColumns} pagination={false} />);
      expect(screen.getByText('Customer')).toBeInTheDocument();
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('renders cell values using accessorKey', () => {
      render(<Table data={testOrders.slice(0, 1)} columns={testColumns} pagination={false} />);
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('2026-03-01')).toBeInTheDocument();
    });

    it('renders cell values using custom cell renderer', () => {
      render(<Table data={testOrders.slice(0, 1)} columns={testColumns} pagination={false} />);
      expect(screen.getByText('$1500')).toBeInTheDocument();
    });

    it('uses semantic HTML elements', () => {
      const { container } = render(
        <Table data={testOrders.slice(0, 2)} columns={testColumns} pagination={false} />,
      );
      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
      const thElements = container.querySelectorAll('th[scope="col"]');
      expect(thElements).toHaveLength(4);
    });

    it('renders caption as visually hidden element', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 2)}
          columns={testColumns}
          caption="Orders table"
          pagination={false}
        />,
      );
      const caption = container.querySelector('caption');
      expect(caption).toBeInTheDocument();
      expect(caption).toHaveTextContent('Orders table');
    });

    it('uses aria-label as fallback caption text when caption is not provided', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 2)}
          columns={testColumns}
          aria-label="Orders overview"
          pagination={false}
        />,
      );

      const table = screen.getByRole('table', { name: 'Orders overview' });
      const caption = container.querySelector('caption');

      expect(table).toHaveAttribute('aria-label', 'Orders overview');
      expect(caption).toBeInTheDocument();
      expect(caption).toHaveTextContent('Orders overview');
    });

    it('sets displayName', () => {
      expect(Table.displayName).toBe('Table');
    });
  });

  describe('Sorting', () => {
    it('sorts ascending on first click', async () => {
      const user = userEvent.setup();
      render(<Table data={testOrders.slice(0, 3)} columns={testColumns} pagination={false} />);

      const customerHeader = screen.getByRole('button', { name: /customer/i });
      await user.click(customerHeader);

      const rows = screen.getAllByRole('row');
      const cells = within(rows[1]).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('Acme Corp');
    });

    it('sorts descending on second click', async () => {
      const user = userEvent.setup();
      render(<Table data={testOrders.slice(0, 3)} columns={testColumns} pagination={false} />);

      const customerHeader = screen.getByRole('button', { name: /customer/i });
      await user.click(customerHeader);
      await user.click(customerHeader);

      const rows = screen.getAllByRole('row');
      const cells = within(rows[1]).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('Initech');
    });

    it('returns to unsorted on third click', async () => {
      const user = userEvent.setup();
      render(<Table data={testOrders.slice(0, 3)} columns={testColumns} pagination={false} />);

      const customerHeader = screen.getByRole('button', { name: /customer/i });
      await user.click(customerHeader);
      await user.click(customerHeader);
      await user.click(customerHeader);

      const rows = screen.getAllByRole('row');
      const cells = within(rows[1]).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('Acme Corp');
    });

    it('does not render sort button for non-sortable columns', () => {
      const columnsWithNonSortable: TableColumn<TestOrder>[] = [
        { id: 'customer', header: 'Customer', accessorKey: 'customer', isSortable: false },
        { id: 'total', header: 'Total', accessorKey: 'total' },
      ];

      render(
        <Table data={testOrders.slice(0, 2)} columns={columnsWithNonSortable} pagination={false} />,
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
      expect(buttons[0]).toHaveTextContent('Total');
    });

    it('updates aria-sort attribute correctly', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} pagination={false} />,
      );

      const thElements = container.querySelectorAll('th[scope="col"]');
      expect(thElements[0]).not.toHaveAttribute('aria-sort');

      const customerHeader = screen.getByRole('button', { name: /customer/i });
      await user.click(customerHeader);
      expect(thElements[0]).toHaveAttribute('aria-sort', 'ascending');

      await user.click(customerHeader);
      expect(thElements[0]).toHaveAttribute('aria-sort', 'descending');
    });

    it('does not render sort buttons when sorting is disabled', () => {
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} sorting={false} pagination={false} />,
      );

      const buttons = screen.queryAllByRole('button');
      expect(buttons).toHaveLength(0);
    });
  });

  describe('Pagination', () => {
    it('shows only pageSize rows by default', () => {
      render(<Table data={testOrders} columns={testColumns} />);
      const tbody = screen.getAllByRole('row').filter((row) => {
        return row.closest('tbody') !== null;
      });
      expect(tbody).toHaveLength(10);
    });

    it('shows next page when clicking Next', async () => {
      const user = userEvent.setup();
      render(<Table data={testOrders} columns={testColumns} />);

      const nextButton = screen.getByRole('button', { name: 'Next' });
      await user.click(nextButton);

      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    it('shows previous page when clicking Previous', async () => {
      const user = userEvent.setup();
      render(<Table data={testOrders} columns={testColumns} />);

      const nextButton = screen.getByRole('button', { name: 'Next' });
      await user.click(nextButton);

      const prevButton = screen.getByRole('button', { name: 'Previous' });
      await user.click(prevButton);

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    it('disables Previous on first page', () => {
      render(<Table data={testOrders} columns={testColumns} />);
      const prevButton = screen.getByRole('button', { name: 'Previous' });
      expect(prevButton).toBeDisabled();
    });

    it('disables Next on last page', async () => {
      const user = userEvent.setup();
      render(<Table data={testOrders} columns={testColumns} />);

      const nextButton = screen.getByRole('button', { name: 'Next' });
      await user.click(nextButton);

      expect(nextButton).toBeDisabled();
    });

    it('displays correct page info', () => {
      render(<Table data={testOrders} columns={testColumns} />);
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    it('changes page size when selecting a different value', async () => {
      const user = userEvent.setup();
      render(<Table data={testOrders} columns={testColumns} />);

      const select = screen.getByRole('combobox');
      await user.selectOptions(select, '25');

      const tbody = screen.getAllByRole('row').filter((row) => {
        return row.closest('tbody') !== null;
      });
      expect(tbody).toHaveLength(15);
    });

    it('shows all rows and no pagination controls when pagination is disabled', () => {
      render(<Table data={testOrders} columns={testColumns} pagination={false} />);

      const tbody = screen.getAllByRole('row').filter((row) => {
        return row.closest('tbody') !== null;
      });
      expect(tbody).toHaveLength(15);

      expect(screen.queryByText('Previous')).not.toBeInTheDocument();
      expect(screen.queryByText('Next')).not.toBeInTheDocument();
    });
  });

  describe('Row Click', () => {
    it('calls onRowClick with correct row data when row is clicked', async () => {
      const user = userEvent.setup();
      const handleRowClick = vi.fn();
      const { container } = render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          onRowClick={handleRowClick}
          pagination={false}
        />,
      );

      const rows = container.querySelectorAll('tbody tr');
      await user.click(rows[0] as HTMLElement);

      expect(handleRowClick).toHaveBeenCalledWith(testOrders[0]);
    });

    it('triggers onRowClick on Enter key', async () => {
      const user = userEvent.setup();
      const handleRowClick = vi.fn();
      const { container } = render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          onRowClick={handleRowClick}
          pagination={false}
        />,
      );

      const rows = container.querySelectorAll('tbody tr');
      (rows[0] as HTMLElement).focus();
      await user.keyboard('{Enter}');

      expect(handleRowClick).toHaveBeenCalledWith(testOrders[0]);
    });

    it('triggers onRowClick on Space key', async () => {
      const user = userEvent.setup();
      const handleRowClick = vi.fn();
      const { container } = render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          onRowClick={handleRowClick}
          pagination={false}
        />,
      );

      const rows = container.querySelectorAll('tbody tr');
      (rows[0] as HTMLElement).focus();
      await user.keyboard(' ');

      expect(handleRowClick).toHaveBeenCalledWith(testOrders[0]);
    });

    it('does not set interactive attributes when onRowClick is not provided', () => {
      const { container } = render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} pagination={false} />,
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows[0]).not.toHaveAttribute('tabindex');
      expect(rows[0]).not.toHaveAttribute('role');
    });

    it('does not trigger row click when interactive cell content is clicked', async () => {
      const user = userEvent.setup();
      const handleRowClick = vi.fn();
      const handleCellAction = vi.fn();
      const columnsWithAction: TableColumn<TestOrder>[] = [
        { id: 'customer', header: 'Customer', accessorKey: 'customer' },
        {
          id: 'action',
          header: 'Action',
          accessorFn: (row) => row.id,
          cell: ({ row }) => (
            <button onClick={() => handleCellAction(row.id)} type="button">
              Inspect
            </button>
          ),
        },
      ];

      render(
        <Table
          data={testOrders.slice(0, 1)}
          columns={columnsWithAction}
          onRowClick={handleRowClick}
          pagination={false}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Inspect' }));

      expect(handleCellAction).toHaveBeenCalledWith('1');
      expect(handleRowClick).not.toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('renders emptyState content when data is empty', () => {
      render(
        <Table
          data={[]}
          columns={testColumns}
          emptyState={<span>No orders found</span>}
          pagination={false}
        />,
      );
      expect(screen.getByText('No orders found')).toBeInTheDocument();
    });

    it('renders default empty message when no emptyState is provided', () => {
      render(<Table data={[]} columns={testColumns} pagination={false} />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('renders loadingState content when loading is true', () => {
      render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          loading={true}
          loadingState={<span>Loading orders...</span>}
          pagination={false}
        />,
      );
      expect(screen.getByText('Loading orders...')).toBeInTheDocument();
    });

    it('does not render data rows when loading is true', () => {
      render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          loading={true}
          pagination={false}
        />,
      );
      expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument();
    });

    it('renders default loading message when no loadingState is provided', () => {
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} loading={true} pagination={false} />,
      );
      expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  describe('Density', () => {
    it('renders with data-density="compact" by default', () => {
      const { container } = render(
        <Table data={testOrders.slice(0, 2)} columns={testColumns} pagination={false} />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveAttribute('data-density', 'compact');
    });

    it('renders with data-density="comfortable" when specified', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 2)}
          columns={testColumns}
          density="comfortable"
          pagination={false}
        />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveAttribute('data-density', 'comfortable');
    });
  });

  describe('className', () => {
    it('merges className via clsx', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 2)}
          columns={testColumns}
          className="custom-class"
          pagination={false}
        />,
      );
      const root = container.firstChild as HTMLElement;
      expect(root).toHaveClass('custom-class');
    });
  });

  // ============================================================
  // Story 3-6: Advanced Features
  // ============================================================

  describe('Server-Side Mode', () => {
    it('calls onSort when clicking sort header in server-side mode', async () => {
      const user = userEvent.setup();
      const handleSort = vi.fn();
      render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          serverSide
          onSort={handleSort}
          onFilter={vi.fn()}
          onPageChange={vi.fn()}
          pagination={false}
        />,
      );

      const customerHeader = screen.getByRole('button', { name: /customer/i });
      await user.click(customerHeader);

      expect(handleSort).toHaveBeenCalledWith([{ id: 'customer', desc: false }]);
    });

    it('calls onPageChange when changing page in server-side mode', async () => {
      const user = userEvent.setup();
      const handlePageChange = vi.fn();
      render(
        <Table
          data={testOrders.slice(0, 10)}
          columns={testColumns}
          serverSide
          onSort={vi.fn()}
          onFilter={vi.fn()}
          onPageChange={handlePageChange}
          pagination={{ totalRows: 30 }}
        />,
      );

      const nextButton = screen.getByRole('button', { name: 'Next' });
      await user.click(nextButton);

      expect(handlePageChange).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 10 });
    });

    it('calls onFilter when typing in global search in server-side mode', async () => {
      const user = userEvent.setup();
      const handleFilter = vi.fn();
      render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          serverSide
          globalSearch
          onSort={vi.fn()}
          onFilter={handleFilter}
          onPageChange={vi.fn()}
          pagination={false}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Filter all columns...');
      await user.type(searchInput, 'Acme');

      await waitFor(() => {
        expect(handleFilter).toHaveBeenCalledWith({
          columnFilters: [],
          globalFilter: 'Acme',
        });
      });
    });

    it('renders data as-is without client-side sorting in server-side mode', async () => {
      const user = userEvent.setup();
      render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          serverSide
          onSort={vi.fn()}
          onFilter={vi.fn()}
          onPageChange={vi.fn()}
          pagination={false}
        />,
      );

      const customerHeader = screen.getByRole('button', { name: /customer/i });
      await user.click(customerHeader);

      const rows = screen.getAllByRole('row');
      const cells = within(rows[1]).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('Acme Corp');
    });

    it('displays correct page count when totalRows is provided', () => {
      render(
        <Table
          data={testOrders.slice(0, 10)}
          columns={testColumns}
          serverSide
          onSort={vi.fn()}
          onFilter={vi.fn()}
          onPageChange={vi.fn()}
          pagination={{ totalRows: 50 }}
        />,
      );

      expect(screen.getByText('Page 1 of 5')).toBeInTheDocument();
    });

    it('displays page without total when totalRows is not provided', () => {
      render(
        <Table
          data={testOrders.slice(0, 10)}
          columns={testColumns}
          serverSide
          onSort={vi.fn()}
          onFilter={vi.fn()}
          onPageChange={vi.fn()}
          pagination
        />,
      );

      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.queryByText(/of/)).not.toBeInTheDocument();
    });
  });

  describe('Global Search', () => {
    it('renders search input when globalSearch is true', () => {
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} globalSearch pagination={false} />,
      );
      expect(screen.getByPlaceholderText('Filter all columns...')).toBeInTheDocument();
    });

    it('provides an accessible name for the global search input', () => {
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} globalSearch pagination={false} />,
      );

      expect(
        screen.getByRole('searchbox', { name: 'Filter all columns' }),
      ).toBeInTheDocument();
    });

    it('filters visible rows when typing in client-side mode', async () => {
      const user = userEvent.setup();
      render(
        <Table data={testOrders.slice(0, 5)} columns={testColumns} globalSearch pagination={false} />,
      );

      const searchInput = screen.getByPlaceholderText('Filter all columns...');
      await user.type(searchInput, 'Acme');

      await waitFor(() => {
        expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    });

    it('search is case-insensitive', async () => {
      const user = userEvent.setup();
      render(
        <Table data={testOrders.slice(0, 5)} columns={testColumns} globalSearch pagination={false} />,
      );

      const searchInput = screen.getByPlaceholderText('Filter all columns...');
      await user.type(searchInput, 'acme');

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument();
      });
    });

    it('shows all rows when search is cleared', async () => {
      const user = userEvent.setup();
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} globalSearch pagination={false} />,
      );

      const searchInput = screen.getByPlaceholderText('Filter all columns...');
      await user.type(searchInput, 'Acme');

      await waitFor(() => {
        expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Acme Corp')).toBeInTheDocument();
        expect(screen.getByText('Globex Inc')).toBeInTheDocument();
        expect(screen.getByText('Initech')).toBeInTheDocument();
      });
    });

    it('does not render search input when globalSearch is false', () => {
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} pagination={false} />,
      );
      expect(screen.queryByPlaceholderText('Filter all columns...')).not.toBeInTheDocument();
    });
  });

  describe('Column Filters', () => {
    it('renders filter inputs when columnFilters is true', () => {
      render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumnsWithFilters}
          columnFilters
          pagination={false}
        />,
      );

      const textFilter = screen.getByPlaceholderText('Filter...');
      expect(textFilter).toBeInTheDocument();

      // Select filter — use getAllByRole since pagination page size selector might also be a combobox
      const selects = screen.getAllByRole('combobox');
      // Should have at least the status filter select
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    it('provides accessible names for filter controls', () => {
      render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumnsWithFilters}
          columnFilters
          pagination={false}
        />,
      );

      expect(
        screen.getByRole('textbox', { name: 'Customer text filter' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('combobox', { name: 'Status filter' }),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Date from date'),
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText('Date to date'),
      ).toBeInTheDocument();
    });

    it('text filter filters rows by column value', async () => {
      const user = userEvent.setup();
      render(
        <Table
          data={testOrders.slice(0, 5)}
          columns={testColumnsWithFilters}
          columnFilters
          pagination={false}
        />,
      );

      const textFilter = screen.getByPlaceholderText('Filter...');
      await user.type(textFilter, 'Acme');

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument();
    });

    it('select filter filters rows by selected option', async () => {
      const user = userEvent.setup();
      render(
        <Table
          data={testOrders.slice(0, 5)}
          columns={testColumnsWithFilters}
          columnFilters
          pagination={false}
        />,
      );

      // Find the select filter — it has the "All" option
      const selects = screen.getAllByRole('combobox');
      const statusFilter = selects.find((s) =>
        Array.from(s.querySelectorAll('option')).some((o) => o.textContent === 'All'),
      )!;
      await user.selectOptions(statusFilter, 'completed');

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Initech')).toBeInTheDocument();
      expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument();
    });

    it('non-filterable columns show no filter control', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumnsWithFilters}
          columnFilters
          pagination={false}
        />,
      );

      const filterRow = container.querySelectorAll('thead tr')[1];
      const filterCells = filterRow.querySelectorAll('th');
      // Total is index 1 — should have no input/select
      expect(filterCells[1].querySelector('input')).toBeNull();
      expect(filterCells[1].querySelector('select')).toBeNull();
    });

    it('shows all rows when filter is cleared', async () => {
      const user = userEvent.setup();
      render(
        <Table
          data={testOrders.slice(0, 5)}
          columns={testColumnsWithFilters}
          columnFilters
          pagination={false}
        />,
      );

      const selects = screen.getAllByRole('combobox');
      const statusFilter = selects.find((s) =>
        Array.from(s.querySelectorAll('option')).some((o) => o.textContent === 'All'),
      )!;
      await user.selectOptions(statusFilter, 'completed');
      expect(screen.queryByText('Globex Inc')).not.toBeInTheDocument();

      await user.selectOptions(statusFilter, '');

      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      expect(screen.getByText('Globex Inc')).toBeInTheDocument();
    });

    it('does not render filter controls when columnFilters is false', () => {
      const { container } = render(
        <Table data={testOrders.slice(0, 3)} columns={testColumnsWithFilters} pagination={false} />,
      );

      const theadRows = container.querySelectorAll('thead tr');
      expect(theadRows).toHaveLength(1);
    });
  });

  describe('CSV Export', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let originalCreateObjectURL: typeof URL.createObjectURL;
    let originalRevokeObjectURL: typeof URL.revokeObjectURL;

    beforeEach(() => {
      originalCreateObjectURL = URL.createObjectURL;
      originalRevokeObjectURL = URL.revokeObjectURL;
      mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
    });

    afterEach(() => {
      global.URL.createObjectURL = originalCreateObjectURL;
      global.URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it('renders export button when csvExport is true', () => {
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} csvExport pagination={false} />,
      );
      expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    });

    it('triggers download on click', async () => {
      const user = userEvent.setup();
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} csvExport pagination={false} />,
      );

      const exportButton = screen.getByRole('button', { name: 'Export CSV' });
      await user.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('exports CSV with headers and data rows', async () => {
      const user = userEvent.setup();
      render(
        <Table data={testOrders.slice(0, 2)} columns={testColumns} csvExport pagination={false} />,
      );

      const exportButton = screen.getByRole('button', { name: 'Export CSV' });
      await user.click(exportButton);

      const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      const text = await blob.text();
      expect(text).toContain('Customer,Total,Status,Date');
      expect(text).toContain('Acme Corp,1500,completed,2026-03-01');
      expect(text).toContain('Globex Inc,2300,pending,2026-03-15');
    });

    it('escapes commas and quotes in CSV', async () => {
      const user = userEvent.setup();
      const dataWithSpecialChars = [
        { id: '1', customer: 'Acme, Inc.', total: 1500, status: 'completed', date: '2026-03-01' },
        { id: '2', customer: 'O"Brien Corp', total: 2300, status: 'pending', date: '2026-03-15' },
      ];
      render(
        <Table data={dataWithSpecialChars} columns={testColumns} csvExport pagination={false} />,
      );

      const exportButton = screen.getByRole('button', { name: 'Export CSV' });
      await user.click(exportButton);

      const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      const text = await blob.text();
      expect(text).toContain('"Acme, Inc."');
      expect(text).toContain('"O""Brien Corp"');
    });

    it('does not render export button when csvExport is false', () => {
      render(
        <Table data={testOrders.slice(0, 3)} columns={testColumns} pagination={false} />,
      );
      expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
    });

    it('server-side CSV exports only current page rows', async () => {
      const user = userEvent.setup();
      render(
        <Table
          data={testOrders.slice(0, 5)}
          columns={testColumns}
          serverSide
          csvExport
          onSort={vi.fn()}
          onFilter={vi.fn()}
          onPageChange={vi.fn()}
          pagination={{ totalRows: 50, pageSize: 5 }}
        />,
      );

      const exportButton = screen.getByRole('button', { name: 'Export CSV' });
      await user.click(exportButton);

      const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      const text = await blob.text();
      const lines = text.trim().split('\n');
      // 1 header + 5 data rows
      expect(lines).toHaveLength(6);
    });
  });

  describe('Row ClassName', () => {
    it('applies row-urgent class when rowClassName returns "row-urgent"', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          rowClassName={() => 'row-urgent'}
          pagination={false}
        />,
      );

      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows[0]).toHaveClass('row-urgent');
    });

    it('applies row-warning class correctly', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          rowClassName={() => 'row-warning'}
          pagination={false}
        />,
      );

      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows[0]).toHaveClass('row-warning');
    });

    it('applies row-success class correctly', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          rowClassName={() => 'row-success'}
          pagination={false}
        />,
      );

      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows[0]).toHaveClass('row-success');
    });

    it('no extra class when rowClassName returns undefined', () => {
      const { container } = render(
        <Table
          data={testOrders.slice(0, 3)}
          columns={testColumns}
          rowClassName={() => undefined}
          pagination={false}
        />,
      );

      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows[0]).not.toHaveClass('row-urgent');
      expect(dataRows[0]).not.toHaveClass('row-warning');
      expect(dataRows[0]).not.toHaveClass('row-success');
    });

    it('receives correct row data', () => {
      const rowClassNameFn = vi.fn(() => undefined as 'row-urgent' | undefined);
      render(
        <Table
          data={testOrders.slice(0, 2)}
          columns={testColumns}
          rowClassName={rowClassNameFn}
          pagination={false}
        />,
      );

      expect(rowClassNameFn).toHaveBeenCalledWith(testOrders[0]);
      expect(rowClassNameFn).toHaveBeenCalledWith(testOrders[1]);
    });

    it('handles rowClassName throwing an error gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { container } = render(
        <Table
          data={testOrders.slice(0, 1)}
          columns={testColumns}
          rowClassName={() => {
            throw new Error('Test error');
          }}
          pagination={false}
        />,
      );

      const dataRows = container.querySelectorAll('tbody tr');
      expect(dataRows[0]).not.toHaveClass('row-urgent');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Combined Features', () => {
    it('server-side mode with global search and column filters work together', async () => {
      const user = userEvent.setup();
      const handleFilter = vi.fn();
      render(
        <Table
          data={testOrders.slice(0, 5)}
          columns={testColumnsWithFilters}
          serverSide
          globalSearch
          columnFilters
          onSort={vi.fn()}
          onFilter={handleFilter}
          onPageChange={vi.fn()}
          pagination={false}
        />,
      );

      const searchInput = screen.getByPlaceholderText('Filter all columns...');
      await user.type(searchInput, 'Corp');

      await waitFor(() => {
        expect(handleFilter).toHaveBeenCalledWith({
          columnFilters: [],
          globalFilter: 'Corp',
        });
      });
    });

    it('pagination resets to page 1 when global search changes', async () => {
      const user = userEvent.setup();
      render(
        <Table data={testOrders} columns={testColumns} globalSearch />,
      );

      // Go to page 2
      const nextButton = screen.getByRole('button', { name: 'Next' });
      await user.click(nextButton);
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

      // Type search — should reset to page 1
      const searchInput = screen.getByPlaceholderText('Filter all columns...');
      await user.type(searchInput, 'a');

      await waitFor(() => {
        expect(screen.queryByText('Page 2 of 2')).not.toBeInTheDocument();
      });
    });

    it('CSV export respects active filters', async () => {
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      const origCreate = URL.createObjectURL;
      const origRevoke = URL.revokeObjectURL;
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      const user = userEvent.setup();
      render(
        <Table
          data={testOrders.slice(0, 5)}
          columns={testColumnsWithFilters}
          columnFilters
          csvExport
          pagination={false}
        />,
      );

      // Apply select filter for completed
      const selects = screen.getAllByRole('combobox');
      const statusFilter = selects.find((s) =>
        Array.from(s.querySelectorAll('option')).some((o) => o.textContent === 'All'),
      )!;
      await user.selectOptions(statusFilter, 'completed');

      // Export
      const exportButton = screen.getByRole('button', { name: 'Export CSV' });
      await user.click(exportButton);

      const blob = mockCreateObjectURL.mock.calls[0][0] as Blob;
      const text = await blob.text();
      expect(text).toContain('Acme Corp');
      expect(text).toContain('Initech');
      expect(text).not.toContain('Globex Inc');

      global.URL.createObjectURL = origCreate;
      global.URL.revokeObjectURL = origRevoke;
    });

    it('three-way server-side interaction: global search + column filter + pagination', async () => {
      const user = userEvent.setup();
      const handleFilter = vi.fn();
      const handlePageChange = vi.fn();
      render(
        <Table
          data={testOrders.slice(0, 5)}
          columns={testColumnsWithFilters}
          serverSide
          globalSearch
          columnFilters
          onSort={vi.fn()}
          onFilter={handleFilter}
          onPageChange={handlePageChange}
          pagination={{ totalRows: 50 }}
        />,
      );

      // Type global search
      const searchInput = screen.getByPlaceholderText('Filter all columns...');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(handleFilter).toHaveBeenCalled();
      });

      // Change column filter
      const selects = screen.getAllByRole('combobox');
      const statusFilter = selects.find((s) =>
        Array.from(s.querySelectorAll('option')).some((o) => o.textContent === 'All'),
      )!;
      await user.selectOptions(statusFilter, 'completed');

      // onFilter should aggregate all filter state
      const lastFilterCall = handleFilter.mock.calls[handleFilter.mock.calls.length - 1][0];
      expect(lastFilterCall).toHaveProperty('columnFilters');
      expect(lastFilterCall).toHaveProperty('globalFilter');
      expect(lastFilterCall.columnFilters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'status', value: 'completed' }),
        ]),
      );

      // Pagination should have been reset
      const lastPageCall = handlePageChange.mock.calls[handlePageChange.mock.calls.length - 1][0];
      expect(lastPageCall.pageIndex).toBe(0);
    });

    it('server-side onFilter payload matches TableFilterState shape', async () => {
      const user = userEvent.setup();
      const handleFilter = vi.fn();
      render(
        <Table
          data={testOrders.slice(0, 5)}
          columns={testColumnsWithFilters}
          serverSide
          globalSearch
          columnFilters
          onSort={vi.fn()}
          onFilter={handleFilter}
          onPageChange={vi.fn()}
          pagination={false}
        />,
      );

      // Apply both global search and column filter
      const searchInput = screen.getByPlaceholderText('Filter all columns...');
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(handleFilter).toHaveBeenCalled();
      });

      const selects = screen.getAllByRole('combobox');
      const statusFilter = selects.find((s) =>
        Array.from(s.querySelectorAll('option')).some((o) => o.textContent === 'All'),
      )!;
      await user.selectOptions(statusFilter, 'pending');

      // Verify payload shape
      const lastCall = handleFilter.mock.calls[handleFilter.mock.calls.length - 1][0];
      expect(lastCall).toEqual({
        columnFilters: expect.arrayContaining([
          { id: 'status', value: 'pending' },
        ]),
        globalFilter: expect.any(String),
      });
    });
  });
});
