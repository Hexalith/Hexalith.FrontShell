import { test, expect } from '@playwright/experimental-ct-react';

import { Inline } from './Inline';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Inline accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Inline><span>One</span><span>Two</span></Inline>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Inline><span>One</span><span>Two</span></Inline>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
