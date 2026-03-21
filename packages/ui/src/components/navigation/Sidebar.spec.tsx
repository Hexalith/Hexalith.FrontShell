import { test, expect } from '@playwright/experimental-ct-react';

import { Sidebar } from './Sidebar';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

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
