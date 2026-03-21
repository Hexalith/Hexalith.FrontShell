import { test, expect } from '@playwright/experimental-ct-react';

import { CreateTenantPage } from './CreateTenantPage.stories';
import { expectNoCompositionA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('CreateTenantPage accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<CreateTenantPage />);
    const violations = await expectNoCompositionA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<CreateTenantPage />);
    await setDarkTheme(page);
    const violations = await expectNoCompositionA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
