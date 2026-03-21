import { DetailView } from './DetailView';
import { Button } from '../../forms/Button';
import { Inline } from '../../layout/Inline';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Data Display/DetailView',
  component: DetailView,
  tags: ['autodocs'],
} satisfies Meta<typeof DetailView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    sections: [
      {
        title: 'General Information',
        fields: [
          { label: 'Tenant Name', value: 'Contoso Electronics' },
          { label: 'Tenant ID', value: 't-001' },
          { label: 'Status', value: 'Active' },
          { label: 'Region', value: 'Europe West' },
          { label: 'Created', value: 'August 15, 2025' },
          { label: 'Last Modified', value: 'March 10, 2026' },
        ],
      },
      {
        title: 'Configuration',
        fields: [
          { label: 'Default Language', value: 'English (US)' },
          { label: 'Default Currency', value: 'EUR' },
          { label: 'Time Zone', value: 'Europe/Amsterdam' },
          { label: 'Data Retention', value: '90 days' },
        ],
      },
      {
        title: 'Members',
        fields: [
          { label: 'Total Members', value: '42' },
          { label: 'Admins', value: '3' },
          { label: 'Active Sessions', value: '12' },
        ],
      },
    ],
    actions: (
      <Inline gap="sm">
        <Button variant="secondary">Edit</Button>
        <Button variant="ghost">Suspend</Button>
      </Inline>
    ),
  },
};
