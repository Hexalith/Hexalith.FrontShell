import { Divider } from './Divider';
import { Stack } from './Stack';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Layout/Divider',
  component: Divider,
  tags: ['autodocs'],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Stack gap="md">
      <p>General Information — Tenant name, region, and status.</p>
      <Divider />
      <p>Configuration — Language, currency, and timezone settings.</p>
      <Divider />
      <p>Security — SSO, MFA, and session management.</p>
    </Stack>
  ),
};
