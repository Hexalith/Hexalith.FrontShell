import { test, expect } from '@playwright/experimental-ct-react';

import { Skeleton } from './Skeleton';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Skeleton accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<Skeleton variant="table" />);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<Skeleton variant="table" />);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Skeleton visual regression', () => {
  test('table variant - light', async ({ mount, page }) => {
    await mount(<Skeleton variant="table" />);
    await expect(page).toHaveScreenshot('skeleton-table-light.png');
  });

  test('detail variant - light', async ({ mount, page }) => {
    await mount(<Skeleton variant="detail" />);
    await expect(page).toHaveScreenshot('skeleton-detail-light.png');
  });

  test('table variant - dark', async ({ mount, page }) => {
    await mount(<Skeleton variant="table" />);
    await setDarkTheme(page);
    await expect(page).toHaveScreenshot('skeleton-table-dark.png');
  });
});
