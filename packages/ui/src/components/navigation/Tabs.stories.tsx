import React from 'react';

import { Tabs } from './Tabs';

import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: '@hexalith/ui/Navigation/Tabs',
  component: Tabs,
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: [
      { id: 'overview', label: 'Overview', content: <p>General information about Contoso Electronics — region, status, and configuration.</p> },
      { id: 'members', label: 'Members', content: <p>42 members across Admin, Member, and Viewer roles.</p> },
      { id: 'settings', label: 'Settings', content: <p>SSO, MFA, session timeout, and API key configuration.</p> },
    ],
    defaultValue: 'overview',
  },
};
