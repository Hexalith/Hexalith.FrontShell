import { ErrorDisplay } from './ErrorDisplay';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Feedback/ErrorDisplay',
  component: ErrorDisplay,
  tags: ['autodocs'],
} satisfies Meta<typeof ErrorDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    error: new Error('Unable to connect to the tenant service. The server returned a 503 status.'),
    title: 'Failed to load tenants',
    onRetry: () => console.log('Retrying...'),
  },
};
