import { Checkbox } from './Checkbox';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Forms/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'I agree to the terms of service and data processing agreement',
    checked: false,
  },
};
