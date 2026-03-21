import { test, expect } from '@playwright/experimental-ct-react';

import { TenantListPage } from './TenantListPage.stories';
import { expectNoCompositionA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('TenantListPage accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<TenantListPage />);
    const violations = await expectNoCompositionA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<TenantListPage />);
    await setDarkTheme(page);
    const violations = await expectNoCompositionA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
