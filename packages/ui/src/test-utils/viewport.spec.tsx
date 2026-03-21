import { test, expect } from '@playwright/experimental-ct-react';

import { CreateTenantPage } from '../stories/compositions/CreateTenantPage.stories';
import { TenantDetailPage } from '../stories/compositions/TenantDetailPage.stories';
import { TenantListPage } from '../stories/compositions/TenantListPage.stories';

const scenarios = [
  { name: 'Tenant list page', render: () => <TenantListPage /> },
  { name: 'Tenant detail page', render: () => <TenantDetailPage /> },
  { name: 'Create tenant page', render: () => <CreateTenantPage /> },
];

test.describe('Viewport responsive tests', () => {
  for (const width of [1024, 1280]) {
    for (const scenario of scenarios) {
      test(`${scenario.name} has no horizontal overflow at ${width}px`, async ({ mount, page }) => {
        await page.setViewportSize({ width, height: 900 });
        await mount(scenario.render());

        const hasOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasOverflow).toBe(false);
      });
    }
  }
});
