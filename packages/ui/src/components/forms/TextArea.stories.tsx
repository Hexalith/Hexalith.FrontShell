import { TextArea } from './TextArea';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Forms/TextArea',
  component: TextArea,
  tags: ['autodocs'],
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Description',
    placeholder: 'Describe the purpose and scope of this tenant environment',
    rows: 4,
    maxLength: 500,
  },
};
