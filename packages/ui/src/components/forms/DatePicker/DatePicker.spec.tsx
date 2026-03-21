import { test, expect } from '@playwright/experimental-ct-react';

import { DatePicker } from './DatePicker';
import { expectNoA11yViolations, setDarkTheme } from '../../../test-utils/a11y-helpers';

test.describe('DatePicker accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<DatePicker label="Start Date" />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<DatePicker label="Start Date" />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
