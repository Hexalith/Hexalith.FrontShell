import { Button } from './Button';
import { Inline } from '../layout/Inline';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Forms/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: 'Create Tenant',
  },
};

export const Variants: Story = {
  render: () => (
    <Inline gap="2">
      <Button variant="primary">Create</Button>
      <Button variant="secondary">Edit</Button>
      <Button variant="ghost">Cancel</Button>
    </Inline>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Inline gap="2" align="end">
      <Button variant="primary" size="sm">Small</Button>
      <Button variant="primary" size="md">Medium</Button>
      <Button variant="primary" size="lg">Large</Button>
    </Inline>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Inline gap="2">
      <Button variant="primary" disabled>Primary</Button>
      <Button variant="secondary" disabled>Secondary</Button>
      <Button variant="ghost" disabled>Ghost</Button>
    </Inline>
  ),
};

export const FormActions: Story = {
  name: 'Form Actions Pattern',
  render: () => (
    <Inline gap="2">
      <Button variant="ghost" type="reset">Cancel</Button>
      <Button variant="primary" type="submit">Create Order</Button>
    </Inline>
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
    <Inline gap="2">
      <Button variant="primary">Create</Button>
      <Button variant="secondary">Edit</Button>
      <Button variant="ghost">Cancel</Button>
    </Inline>
  ),
};
