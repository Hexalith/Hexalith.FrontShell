import { test, expect } from '@playwright/experimental-ct-react';

import { ToastProvider } from './Toast';
import { expectNoA11yViolations, setDarkTheme } from '../../test-utils/a11y-helpers';

test.describe('Toast accessibility', () => {
  test('has no a11y violations in light theme', async ({ mount, page }) => {
    await mount(<ToastProvider><p>Content</p></ToastProvider>);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });

  test('has no a11y violations in dark theme', async ({ mount, page }) => {
    await mount(<ToastProvider><p>Content</p></ToastProvider>);
    await setDarkTheme(page);
    const violations = await expectNoA11yViolations(page);
    expect(violations).toEqual([]);
  });
});
