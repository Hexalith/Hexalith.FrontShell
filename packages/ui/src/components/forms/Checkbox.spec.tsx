import { test, expect } from '@playwright/experimental-ct-react';

import { Checkbox } from './Checkbox';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Checkbox accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Checkbox label="I agree to the terms" />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Checkbox label="I agree to the terms" />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
