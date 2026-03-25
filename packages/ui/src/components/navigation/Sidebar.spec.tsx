import { test, expect } from '@playwright/experimental-ct-react';

import { Sidebar } from './Sidebar';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

const sidebarItems = [
  { id: 'orders', label: 'Orders', href: '/orders', category: 'Modules' },
  { id: 'tenants', label: 'Tenants', href: '/tenants', category: 'Modules' },
  { id: 'settings', label: 'Settings', href: '/settings', category: 'System' },
];

test.describe('Sidebar accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Sidebar items={[{ id: 'home', label: 'Home', href: '/' }]} />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Sidebar items={[{ id: 'home', label: 'Home', href: '/' }]} />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Sidebar visual regression', () => {
  test('with categories - light', async ({ mount, page }) => {
    await mount(<Sidebar items={sidebarItems} activeItemId="orders" />);
    await expect(page).toHaveScreenshot('sidebar-categories-light.png');
  });

  test('with categories - dark', async ({ mount, page }) => {
    await mount(<Sidebar items={sidebarItems} activeItemId="orders" />);
    await setDarkTheme(page);
    await expect(page).toHaveScreenshot('sidebar-categories-dark.png');
  });
});
