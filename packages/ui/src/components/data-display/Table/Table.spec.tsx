import { test, expect } from '@playwright/experimental-ct-react';

import { Table } from './Table';
import { expectNoA11yViolations, setDarkTheme } from '../../../test-utils/a11y-helpers';

import type { TableColumn } from './Table';

const data = [
  { name: 'Contoso', status: 'Active' },
  { name: 'Fabrikam', status: 'Inactive' },
  { name: 'Northwind', status: 'Active' },
];
const columns: TableColumn<{ name: string; status: string }>[] = [
  { id: 'name', header: 'Name', accessorKey: 'name' as const, isSortable: true },
  { id: 'status', header: 'Status', accessorKey: 'status' as const },
];

test.describe('Table accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Table data={data} columns={columns} caption="Tenants" />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Table data={data} columns={columns} caption="Tenants" />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Table visual regression', () => {
  test('with data - light', async ({ mount, page }) => {
    await mount(<Table data={data} columns={columns} caption="Tenants" sorting pagination />);
    await expect(page).toHaveScreenshot('table-data-light.png');
  });

  test('with data - dark', async ({ mount, page }) => {
    await mount(<Table data={data} columns={columns} caption="Tenants" sorting pagination />);
    await setDarkTheme(page);
    await expect(page).toHaveScreenshot('table-data-dark.png');
  });
});
