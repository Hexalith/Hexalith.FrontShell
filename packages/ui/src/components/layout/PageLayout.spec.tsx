import { test, expect } from '@playwright/experimental-ct-react';

import { PageLayout } from './PageLayout';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('PageLayout accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<PageLayout title="Tenants"><p>Content</p></PageLayout>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<PageLayout title="Tenants"><p>Content</p></PageLayout>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
