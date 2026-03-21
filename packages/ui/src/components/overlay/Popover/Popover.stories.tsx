import { Popover } from './Popover';
import { Button } from '../../forms/Button';
import { Stack } from '../../layout/Stack';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Overlay/Popover',
  component: Popover,
  tags: ['autodocs'],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">Tenant Info</Button>,
    children: (
      <Stack gap="sm">
        <strong>Contoso Electronics</strong>
        <p>Region: Europe West</p>
        <p>Status: Active</p>
        <p>Members: 42</p>
        <p>Created: August 15, 2025</p>
      </Stack>
    ),
  },
};
