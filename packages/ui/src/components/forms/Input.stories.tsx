import { Input } from './Input';
import { Stack } from '../layout/Stack';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Forms/Input',
  component: Input,
  tags: ['autodocs'],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Tenant Name',
    placeholder: 'Enter tenant name',
    required: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    type: 'email',
    value: 'invalid',
    error: 'Must be a valid email address',
    required: true,
  },
};

export const Disabled: Story = {
  args: {
    label: 'Tenant ID',
    value: 'c1d2e3f4-a5b6-7890',
    disabled: true,
  },
};

export const Types: Story = {
  name: 'Input Types',
  render: () => (
    <Stack gap="3">
      <Input label="Text" placeholder="Enter text" />
      <Input label="Email" type="email" placeholder="user@example.com" />
      <Input label="Password" type="password" placeholder="Enter password" />
      <Input label="Number" type="number" placeholder="0" />
    </Stack>
  ),
};

export const DarkTheme: Story = {
  decorators: [
    (Story) => (
      <div data-theme="dark" style={{ background: 'var(--color-surface-primary)', padding: 'var(--spacing-5)' }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Stack gap="3">
      <Input label="Tenant Name" placeholder="Enter name" required />
      <Input label="Email" type="email" value="invalid" error="Must be a valid email" />
      <Input label="Disabled" value="Read-only value" disabled />
    </Stack>
  ),
};
