import { Sidebar } from './Sidebar';

import type { NavigationItem } from './Sidebar';
import type { Meta, StoryObj } from '@storybook/react';

const navigationItems: NavigationItem[] = [
  { id: 'tenants', label: 'Tenants', href: '/tenants', category: 'Management' },
  { id: 'orders', label: 'Orders', href: '/orders', category: 'Management' },
  { id: 'products', label: 'Products', href: '/products', category: 'Management' },
  { id: 'customers', label: 'Customers', href: '/customers', category: 'Management' },
  { id: 'analytics', label: 'Analytics', href: '/analytics', category: 'Insights' },
  { id: 'settings', label: 'Settings', href: '/settings', category: 'System' },
];

const meta = {
  title: '@hexalith/ui/Navigation/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    items: navigationItems,
    activeItemId: 'tenants',
    onItemClick: (item) => console.log('Navigate to:', item.href),
  },
};
