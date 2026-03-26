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

export const FlatOptions: Story = {
  name: 'Flat Options (Status Filter)',
  args: {
    label: 'Status',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'suspended', label: 'Suspended' },
      { value: 'provisioning', label: 'Provisioning' },
    ],
  },
};

export const WithError: Story = {
  args: {
    label: 'Priority',
    options: [
      { value: 'low', label: 'Low' },
      { value: 'high', label: 'High' },
    ],
    error: 'Priority is required',
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Region',
    value: 'europe-west',
    options: [{ value: 'europe-west', label: 'Europe West' }],
    disabled: true,
  },
};

export const InlineVariant: Story = {
  name: 'Inline Variant (Status Bar)',
  args: {
    label: 'Switch tenant',
    hideLabel: true,
    variant: 'inline',
    value: 'tenant-alpha',
    options: [
      { value: 'tenant-alpha', label: 'Acme Corporation' },
      { value: 'tenant-beta', label: 'TechVentures Inc.' },
      { value: 'tenant-gamma', label: 'Northern Logistics' },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{
        background: 'var(--color-surface-secondary)',
        padding: 'var(--spacing-2) var(--spacing-3)',
        borderRadius: 'var(--spacing-1)',
        display: 'inline-flex',
        alignItems: 'center',
      }}>
        <Story />
      </div>
    ),
  ],
};

export const HiddenLabel: Story = {
  name: 'Hidden Label',
  args: {
    label: 'Category',
    hideLabel: true,
    value: 'engineering',
    options: [
      { value: 'engineering', label: 'Engineering' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'finance', label: 'Finance' },
    ],
  },
};

export const DarkTheme: Story = {
  args: {
    ...Default.args,
    value: 'europe-west',
  },
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{
        background: 'var(--color-surface-primary)',
        padding: 'var(--spacing-4)',
        borderRadius: 'var(--spacing-2)',
      }}>
        <Story />
      </div>
    ),
  ],
};
