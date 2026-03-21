import { test, expect } from '@playwright/experimental-ct-react';

import { Stack } from './Stack';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Stack accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Stack><p>Item one</p><p>Item two</p></Stack>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Stack><p>Item one</p><p>Item two</p></Stack>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
