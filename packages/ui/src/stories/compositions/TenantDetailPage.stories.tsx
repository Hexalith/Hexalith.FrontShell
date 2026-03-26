
import { DetailView } from '../../components/data-display/DetailView';
import { Table } from '../../components/data-display/Table';
import { Button } from '../../components/forms/Button';
import { Inline } from '../../components/layout/Inline';
import { PageLayout } from '../../components/layout/PageLayout';
import { Stack } from '../../components/layout/Stack';
import { Tabs } from '../../components/navigation/Tabs';

import type { DetailSection } from '../../components/data-display/DetailView';
import type { TableColumn } from '../../components/data-display/Table';
import type { TabItem } from '../../components/navigation/Tabs';
import type { Meta, StoryObj } from '@storybook/react';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Member' | 'Viewer';
  joinedAt: string;
}

const tenantSections: DetailSection[] = [
  {
    title: 'General Information',
    fields: [
      { label: 'Tenant Name', value: 'Contoso Electronics' },
      { label: 'Tenant ID', value: 't-001' },
      { label: 'Status', value: 'Active' },
      { label: 'Region', value: 'Europe West' },
      { label: 'Created', value: 'August 15, 2025' },
      { label: 'Last Modified', value: 'March 10, 2026' },
    ],
  },
  {
    title: 'Configuration',
    fields: [
      { label: 'Default Language', value: 'English (US)' },
      { label: 'Default Currency', value: 'EUR' },
      { label: 'Time Zone', value: 'Europe/Amsterdam' },
      { label: 'Data Retention', value: '90 days' },
    ],
  },
];

const members: Member[] = [
  { id: 'm-1', name: 'Elena Rodriguez', email: 'elena.rodriguez@contoso.com', role: 'Admin', joinedAt: '2025-08-15' },
  { id: 'm-2', name: 'Marcus Chen', email: 'marcus.chen@contoso.com', role: 'Admin', joinedAt: '2025-08-16' },
  { id: 'm-3', name: 'Sarah Thompson', email: 'sarah.t@contoso.com', role: 'Member', joinedAt: '2025-09-01' },
  { id: 'm-4', name: 'James O\'Brien', email: 'james.obrien@contoso.com', role: 'Member', joinedAt: '2025-10-12' },
  { id: 'm-5', name: 'Aisha Patel', email: 'aisha.patel@contoso.com', role: 'Viewer', joinedAt: '2025-11-05' },
];

const memberColumns: TableColumn<Member>[] = [
  { id: 'name', header: 'Name', accessorKey: 'name' },
  { id: 'email', header: 'Email', accessorKey: 'email' },
  { id: 'role', header: 'Role', accessorKey: 'role' },
  { id: 'joinedAt', header: 'Joined', accessorKey: 'joinedAt', cell: ({ value }) =>
    new Date(value as string).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
  },
];

const tabItems: TabItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    content: (
      <Stack gap="md">
        <h2>Tenant overview</h2>
        <DetailView
          sections={tenantSections}
          actions={
            <Inline gap="sm">
              <Button variant="secondary">Edit</Button>
              <Button variant="ghost">Suspend</Button>
            </Inline>
          }
        />
      </Stack>
    ),
  },
  {
    id: 'members',
    label: 'Members',
    content: (
      <Stack gap="md">
        <h2>Tenant members</h2>
        <Inline justify="end">
          <Button variant="primary">Invite Member</Button>
        </Inline>
        <Table
          data={members}
          columns={memberColumns}
          sorting
          pagination={false}
          caption="Tenant members"
        />
      </Stack>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    content: (
      <Stack gap="md">
        <h2>Tenant settings</h2>
        <DetailView
          sections={[
            {
              title: 'Security',
              fields: [
                { label: 'SSO Provider', value: 'Azure Active Directory' },
                { label: 'MFA Required', value: 'Yes' },
                { label: 'Session Timeout', value: '30 minutes' },
              ],
            },
            {
              title: 'Integrations',
              fields: [
                { label: 'Webhook URL', value: 'https://hooks.contoso.com/hexalith', span: 2 },
                { label: 'API Key', value: '••••••••••••k4x9' },
                { label: 'Rate Limit', value: '1000 req/min' },
              ],
            },
          ]}
        />
      </Stack>
    ),
  },
];

export function TenantDetailPage() {
  return (
    <PageLayout
      title="Contoso Electronics"
      subtitle="Tenant Details"
      actions={
        <Inline gap="sm">
          <Button variant="ghost">Delete</Button>
          <Button variant="primary">Save Changes</Button>
        </Inline>
      }
    >
      <Tabs items={tabItems} defaultValue="overview" />
    </PageLayout>
  );
}

const meta = {
  title: '@hexalith/ui/Compositions/Tenant Detail Page',
  component: TenantDetailPage,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof TenantDetailPage>;

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
