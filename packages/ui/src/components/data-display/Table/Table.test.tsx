import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

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
      // After sorting ascending by customer: Acme Corp, Globex Inc, Initech
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
      // Original order: Acme Corp first
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
      // Only Total should have a sort button
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

      // With sorting disabled, headers should not be buttons
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

      // All 15 rows should be visible now
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
});
