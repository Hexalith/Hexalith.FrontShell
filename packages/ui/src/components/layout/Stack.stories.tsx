import { Stack } from './Stack';
import { Input } from '../forms/Input';
import { Select } from '../forms/Select';
import { TextArea } from '../forms/TextArea';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Layout/Stack',
  component: Stack,
  tags: ['autodocs'],
} satisfies Meta<typeof Stack>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    gap: 'md',
    children: (
      <>
        <Input label="Tenant Name" placeholder="e.g. Contoso Electronics" required />
        <TextArea label="Description" placeholder="Brief description of this tenant" rows={3} />
        <Select
          label="Region"
          options={[
            { value: 'europe-west', label: 'Europe West' },
            { value: 'north-america-east', label: 'North America East' },
            { value: 'asia-pacific', label: 'Asia Pacific' },
          ]}
          placeholder="Select deployment region"
        />
      </>
    ),
  },
};
