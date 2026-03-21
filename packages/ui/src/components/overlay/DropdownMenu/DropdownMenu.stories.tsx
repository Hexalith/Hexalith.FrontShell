import { DropdownMenu } from './DropdownMenu';
import { Button } from '../../forms/Button';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Overlay/DropdownMenu',
  component: DropdownMenu,
  tags: ['autodocs'],
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    trigger: <Button variant="secondary">Actions</Button>,
    items: [
      { label: 'Edit Tenant', onSelect: () => console.log('Edit') },
      { label: 'Duplicate', onSelect: () => console.log('Duplicate') },
      { label: 'Export Configuration', onSelect: () => console.log('Export') },
      { type: 'separator' as const },
      { label: 'Delete Tenant', onSelect: () => console.log('Delete'), destructive: true },
    ],
  },
};
