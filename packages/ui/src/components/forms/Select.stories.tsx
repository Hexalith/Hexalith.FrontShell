import { Select } from './Select';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Forms/Select',
  component: Select,
  tags: ['autodocs'],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Region',
    placeholder: 'Select deployment region',
    options: [
      {
        label: 'Americas',
        options: [
          { value: 'north-america-east', label: 'North America East' },
          { value: 'north-america-west', label: 'North America West' },
          { value: 'south-america', label: 'South America' },
        ],
      },
      {
        label: 'Europe',
        options: [
          { value: 'europe-west', label: 'Europe West' },
          { value: 'europe-north', label: 'Europe North' },
        ],
      },
      {
        label: 'Asia-Pacific',
        options: [
          { value: 'asia-pacific', label: 'Asia Pacific' },
          { value: 'australia-east', label: 'Australia East' },
        ],
      },
    ],
  },
};
