import { test, expect } from '@playwright/experimental-ct-react';

import { EmptyState } from './EmptyState';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('EmptyState accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<EmptyState title="No tenants found" />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<EmptyState title="No tenants found" />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
