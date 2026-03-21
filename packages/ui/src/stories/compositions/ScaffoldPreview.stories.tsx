import { z } from 'zod';

import { DetailView } from '../../components/data-display/DetailView';
import { Table } from '../../components/data-display/Table';
import { Button } from '../../components/forms/Button';
import { Form, FormField } from '../../components/forms/Form';
import { Input } from '../../components/forms/Input';
import { Select } from '../../components/forms/Select';
import { Divider } from '../../components/layout/Divider';
import { Inline } from '../../components/layout/Inline';
import { PageLayout } from '../../components/layout/PageLayout';
import { Stack } from '../../components/layout/Stack';
import { Tabs } from '../../components/navigation/Tabs';

import type { DetailSection } from '../../components/data-display/DetailView';
import type { TableColumn } from '../../components/data-display/Table';
import type { TabItem } from '../../components/navigation/Tabs';
import type { Meta, StoryObj } from '@storybook/react';

interface OrderProjection {
  id: string;
  orderNumber: string;
  customer: string;
  product: string;
  amount: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered';
  createdAt: string;
}

const orders: OrderProjection[] = [
  { id: 'o-1', orderNumber: 'ORD-2024-001', customer: 'Contoso Electronics', product: 'Enterprise License', amount: 12500, status: 'Delivered', createdAt: '2025-11-15' },
  { id: 'o-2', orderNumber: 'ORD-2024-002', customer: 'Northwind Traders', product: 'Standard License', amount: 4200, status: 'Shipped', createdAt: '2025-12-03' },
  { id: 'o-3', orderNumber: 'ORD-2024-003', customer: 'Adventure Works', product: 'Developer Kit', amount: 890, status: 'Processing', createdAt: '2026-01-08' },
  { id: 'o-4', orderNumber: 'ORD-2024-004', customer: 'Fabrikam Inc.', product: 'Enterprise License', amount: 15800, status: 'Pending', createdAt: '2026-02-14' },
  { id: 'o-5', orderNumber: 'ORD-2024-005', customer: 'Tailspin Toys', product: 'Starter Pack', amount: 320, status: 'Delivered', createdAt: '2025-10-22' },
  { id: 'o-6', orderNumber: 'ORD-2024-006', customer: 'Woodgrove Bank', product: 'Enterprise License', amount: 22000, status: 'Shipped', createdAt: '2025-12-28' },
];

const orderColumns: TableColumn<OrderProjection>[] = [
  { id: 'orderNumber', header: 'Order #', accessorKey: 'orderNumber' },
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'product', header: 'Product', accessorKey: 'product' },
  { id: 'amount', header: 'Amount', accessorKey: 'amount', cell: ({ value }) =>
    `$${(value as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
  },
  { id: 'status', header: 'Status', accessorKey: 'status' },
  { id: 'createdAt', header: 'Date', accessorKey: 'createdAt', cell: ({ value }) =>
    new Date(value as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  },
];

const orderDetail: DetailSection[] = [
  {
    title: 'Order Information',
    fields: [
      { label: 'Order Number', value: 'ORD-2024-001' },
      { label: 'Status', value: 'Delivered' },
      { label: 'Created', value: 'November 15, 2025' },
      { label: 'Last Updated', value: 'December 1, 2025' },
    ],
  },
  {
    title: 'Customer',
    fields: [
      { label: 'Name', value: 'Contoso Electronics' },
      { label: 'Contact', value: 'Elena Rodriguez' },
      { label: 'Email', value: 'elena.rodriguez@contoso.com' },
      { label: 'Region', value: 'Europe West' },
    ],
  },
];

const commandSchema = z.object({
  status: z.string().min(1, 'Status is required'),
  note: z.string().optional(),
});

const scaffoldTabs: TabItem[] = [
  {
    id: 'list',
    label: 'Order List',
    content: (
      <Table
        data={orders}
        columns={orderColumns}
        sorting
        pagination={{ pageSize: 5 }}
        globalSearch
        caption="Orders projection list"
        onRowClick={() => {}}
      />
    ),
  },
  {
    id: 'detail',
    label: 'Order Detail',
    content: (
      <DetailView
        sections={orderDetail}
        actions={
          <Inline gap="sm">
            <Button variant="secondary">Edit</Button>
            <Button variant="ghost">Cancel Order</Button>
          </Inline>
        }
      />
    ),
  },
  {
    id: 'command',
    label: 'Update Status',
    content: (
      <Form
        schema={commandSchema}
        onSubmit={(data) => {
          console.log('Command submitted:', data);
        }}
        defaultValues={{ status: '', note: '' }}
      >
        <Stack gap="md">
          <FormField name="status">
            <Select
              label="New Status"
              required
              options={[
                { value: 'processing', label: 'Processing' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </FormField>
          <FormField name="note">
            <Input label="Note" placeholder="Optional note for this status change" />
          </FormField>
          <Inline gap="sm" justify="end">
            <Button variant="ghost" type="reset">Reset</Button>
            <Button variant="primary" type="submit">Submit Command</Button>
          </Inline>
        </Stack>
      </Form>
    ),
  },
];

export function ScaffoldPreview() {
  return (
    <PageLayout
      title="Orders"
      subtitle="CQRS Scaffold Preview — Table + DetailView + Form command"
      actions={
        <Inline gap="sm">
          <Button variant="primary">New Order</Button>
        </Inline>
      }
    >
      <Stack gap="lg">
        <Tabs items={scaffoldTabs} defaultValue="list" />
        <Divider />
        <Inline gap="sm" justify="end">
          <Button variant="ghost">Export</Button>
        </Inline>
      </Stack>
    </PageLayout>
  );
}

const meta = {
  title: '@hexalith/ui/Compositions/Scaffold Preview',
  component: ScaffoldPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ScaffoldPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
