
import { Table } from '../../components/data-display/Table';
import { Button } from '../../components/forms/Button';
import { Input } from '../../components/forms/Input';
import { Inline } from '../../components/layout/Inline';
import { PageLayout } from '../../components/layout/PageLayout';
import { Stack } from '../../components/layout/Stack';

import type { TableColumn } from '../../components/data-display/Table';
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
];

const columns: TableColumn<Tenant>[] = [
  { id: 'name', header: 'Tenant Name', accessorKey: 'name' },
  { id: 'region', header: 'Region', accessorKey: 'region', filterType: 'select', filterOptions: [
    { label: 'Europe West', value: 'Europe West' },
    { label: 'North America East', value: 'North America East' },
    { label: 'Asia Pacific', value: 'Asia Pacific' },
  ] },
  { id: 'status', header: 'Status', accessorKey: 'status', cell: ({ value }) => {
    const status = value as string;
    return <span data-status={status.toLowerCase()}>{status}</span>;
  }, filterType: 'select', filterOptions: [
    { label: 'Active', value: 'Active' },
    { label: 'Suspended', value: 'Suspended' },
    { label: 'Provisioning', value: 'Provisioning' },
  ] },
  { id: 'memberCount', header: 'Members', accessorKey: 'memberCount' },
  { id: 'createdAt', header: 'Created', accessorKey: 'createdAt', cell: ({ value }) => {
    return new Date(value as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } },
];

export function TenantListPage() {
  return (
    <PageLayout
      title="Tenants"
      subtitle="Manage your organization's tenant environments"
      actions={
        <Inline gap="sm">
          <Button variant="primary">Create Tenant</Button>
        </Inline>
      }
    >
      <Stack gap="md">
        <Inline gap="sm" justify="between">
          <Input label="Search tenants" placeholder="Search by name or region..." />
        </Inline>
        <Table
          data={tenants}
          columns={columns}
          sorting
          pagination={{ pageSize: 5 }}
          globalSearch
          caption="List of all tenants in the organization"
          onRowClick={() => {}}
        />
      </Stack>
    </PageLayout>
  );
}

const meta = {
  title: '@hexalith/ui/Compositions/Tenant List Page',
  component: TenantListPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof TenantListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ background: 'var(--color-surface-primary)', minHeight: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};
