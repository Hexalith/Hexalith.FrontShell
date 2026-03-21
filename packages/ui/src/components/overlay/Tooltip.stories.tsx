import { Tooltip } from './Tooltip';
import { Button } from '../forms/Button';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Overlay/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: 'Copy tenant ID to clipboard',
    children: <Button variant="secondary">Copy ID</Button>,
  },
};
