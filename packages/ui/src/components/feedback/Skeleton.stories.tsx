import { Skeleton } from './Skeleton';
import { Stack } from '../layout/Stack';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'table',
    rows: 8,
  },
};

export const TableVariant: Story = {
  args: { variant: 'table', rows: 5 },
};

export const DetailVariant: Story = {
  args: { variant: 'detail', fields: 6 },
};

export const FormVariant: Story = {
  args: { variant: 'form', fields: 4 },
};

export const CardVariant: Story = {
  args: { variant: 'card' },
};

export const AllVariants: Story = {
  name: 'All Variants',
  render: () => (
    <Stack gap="6">
      <div>
        <h3>Table (List Pages)</h3>
        <Skeleton variant="table" rows={3} />
      </div>
      <div>
        <h3>Detail (Detail Pages)</h3>
        <Skeleton variant="detail" fields={4} />
      </div>
      <div>
        <h3>Form (Create/Edit Pages)</h3>
        <Skeleton variant="form" fields={3} />
      </div>
      <div>
        <h3>Card (Generic)</h3>
        <Skeleton variant="card" />
      </div>
    </Stack>
  ),
};
