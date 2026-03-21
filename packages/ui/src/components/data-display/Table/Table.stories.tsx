import { Table } from './Table';

import type { TableColumn } from './Table';
import type { Meta, StoryObj } from '@storybook/react';

interface Tenant {
  id: string;
  name: string;
  region: string;
  status: 'Active' | 'Suspended' | 'Provisioning';
  createdAt: string;
  memberCount: number;
}

const tenants: Tenant[] = [
  { id: 't-001', name: 'Contoso Electronics', region: 'Europe West', status: 'Active', createdAt: '2025-08-15', memberCount: 42 },
  { id: 't-002', name: 'Northwind Traders', region: 'North America East', status: 'Active', createdAt: '2025-06-22', memberCount: 18 },
  { id: 't-003', name: 'Adventure Works', region: 'Asia Pacific', status: 'Suspended', createdAt: '2025-11-03', memberCount: 7 },
  { id: 't-004', name: 'Fabrikam Inc.', region: 'Europe West', status: 'Active', createdAt: '2025-09-10', memberCount: 31 },
  { id: 't-005', name: 'Tailspin Toys', region: 'North America East', status: 'Provisioning', createdAt: '2026-01-18', memberCount: 0 },
  { id: 't-006', name: 'Woodgrove Bank', region: 'Europe West', status: 'Active', createdAt: '2025-07-04', memberCount: 56 },
  { id: 't-007', name: 'Litware Inc.', region: 'Asia Pacific', status: 'Active', createdAt: '2025-10-20', memberCount: 12 },
  { id: 't-008', name: 'Proseware Ltd.', region: 'North America East', status: 'Active', createdAt: '2025-12-01', memberCount: 24 },
  { id: 't-009', name: 'VanArsdel Ltd.', region: 'Europe West', status: 'Active', createdAt: '2026-02-05', memberCount: 9 },
  { id: 't-010', name: 'Trey Research', region: 'Asia Pacific', status: 'Active', createdAt: '2025-09-28', memberCount: 15 },
];

const columns: TableColumn<Tenant>[] = [
  { id: 'name', header: 'Tenant Name', accessorKey: 'name' },
  { id: 'region', header: 'Region', accessorKey: 'region' },
  { id: 'status', header: 'Status', accessorKey: 'status' },
  { id: 'memberCount', header: 'Members', accessorKey: 'memberCount' },
  { id: 'createdAt', header: 'Created', accessorKey: 'createdAt', cell: ({ value }) =>
    new Date(value as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  },
];

const meta = {
  title: '@hexalith/ui/Data Display/Table',
  component: Table,
  tags: ['autodocs'],
} satisfies Meta<typeof Table<Tenant>>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: tenants,
    columns: columns as TableColumn<unknown>[],
    sorting: true,
    pagination: { pageSize: 5 },
    globalSearch: true,
    caption: 'List of all tenants in the organization',
    onRowClick: () => {},
  },
};
