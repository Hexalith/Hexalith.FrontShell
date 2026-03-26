import { EmptyState } from './EmptyState';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Feedback/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No tenants found',
    description: 'Get started by creating your first tenant environment. Tenants isolate data, users, and configuration for each of your customers.',
    action: {
      label: 'Create Tenant',
      onClick: () => console.log('Create tenant clicked'),
    },
  },
};

export const TitleOnly: Story = {
  args: {
    title: 'No results match your search',
  },
};

export const WithDescription: Story = {
  args: {
    title: 'No orders yet',
    description: 'Create your first order to get started tracking deliveries.',
  },
};
