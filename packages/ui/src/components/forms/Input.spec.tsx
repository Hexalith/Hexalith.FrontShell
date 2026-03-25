import { test, expect } from '@playwright/experimental-ct-react';

import { Input } from './Input';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Input accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Input label="Tenant Name" />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Input label="Tenant Name" />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Input visual regression', () => {
  test('default state - light', async ({ mount, page }) => {
    await mount(<Input label="Tenant Name" placeholder="Enter name" />);
    await expect(page).toHaveScreenshot('input-default-light.png');
  });

  test('default state - dark', async ({ mount, page }) => {
    await mount(<Input label="Tenant Name" placeholder="Enter name" />);
    await setDarkTheme(page);
    await expect(page).toHaveScreenshot('input-default-dark.png');
  });
});
