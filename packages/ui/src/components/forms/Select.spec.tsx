import { test, expect } from '@playwright/experimental-ct-react';

import { Select } from './Select';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Select accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Select label="Region" options={[{ value: 'eu', label: 'Europe' }]} />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Select label="Region" options={[{ value: 'eu', label: 'Europe' }]} />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
