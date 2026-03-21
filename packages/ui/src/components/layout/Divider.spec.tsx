import { test, expect } from '@playwright/experimental-ct-react';

import { Divider } from './Divider';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Divider accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Divider />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Divider />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
