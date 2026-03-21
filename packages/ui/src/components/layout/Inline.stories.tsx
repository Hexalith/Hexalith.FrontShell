import { Inline } from './Inline';
import { Button } from '../forms/Button';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Layout/Inline',
  component: Inline,
  tags: ['autodocs'],
} satisfies Meta<typeof Inline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: 'sm',
    align: 'center',
    children: (
      <>
        <Button variant="ghost">Cancel</Button>
        <Button variant="secondary">Save Draft</Button>
        <Button variant="primary">Create Tenant</Button>
      </>
    ),
  },
};
