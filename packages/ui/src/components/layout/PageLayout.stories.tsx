import { Inline } from './Inline';
import { PageLayout } from './PageLayout';
import { Button } from '../forms/Button';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Layout/PageLayout',
  component: PageLayout,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof PageLayout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Tenant Management',
    subtitle: 'View and manage all tenant environments across your organization',
    actions: (
      <Inline gap="sm">
        <Button variant="ghost">Export</Button>
        <Button variant="primary">Create Tenant</Button>
      </Inline>
    ),
    children: (
      <div style={{ padding: 'var(--spacing-lg)' }}>
        <p>Main content area — tables, forms, and detail views render here.</p>
      </div>
    ),
  },
};
